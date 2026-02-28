import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const BACKUP_DIR = path.join(process.cwd(), 'backups');

// Ensure backup directory exists
async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch {
    // Directory exists
  }
}

// GET - List backups
export async function GET() {
  try {
    const backups = await db.backupRecord.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      backups,
    });
  } catch (error) {
    console.error('Error fetching backups:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch backups' },
      { status: 500 }
    );
  }
}

// POST - Create backup
export async function POST(request: NextRequest) {
  try {
    await ensureBackupDir();
    
    const body = await request.json();
    const { name, type = 'full' } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Backup name is required' },
        { status: 400 }
      );
    }

    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './db/custom.db';
    const backupFileName = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.db`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    // Create backup record
    const backupRecord = await db.backupRecord.create({
      data: {
        name,
        type,
        status: 'in-progress',
        location: backupPath,
        createdBy: 'admin',
      },
    });

    const startTime = Date.now();

    try {
      // Copy the database file
      await fs.copyFile(dbPath, backupPath);

      // Get file size
      const stats = await fs.stat(backupPath);
      const duration = Date.now() - startTime;

      // Calculate checksum
      const checksum = await calculateChecksum(backupPath);

      // Update backup record
      const updatedBackup = await db.backupRecord.update({
        where: { id: backupRecord.id },
        data: {
          status: 'completed',
          size: stats.size,
          duration,
          checksum,
          completedAt: new Date(),
        },
      });

      // Log to audit
      await db.auditLog.create({
        data: {
          action: 'BACKUP',
          resourceType: 'database',
          resourceName: name,
          details: JSON.stringify({ type, size: stats.size }),
          status: 'success',
        },
      });

      return NextResponse.json({
        success: true,
        backup: updatedBackup,
      });
    } catch (backupError) {
      // Update backup record as failed
      await db.backupRecord.update({
        where: { id: backupRecord.id },
        data: {
          status: 'failed',
          errorMessage: String(backupError),
        },
      });

      throw backupError;
    }
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json(
      { success: false, error: 'Backup failed: ' + String(error) },
      { status: 500 }
    );
  }
}

async function calculateChecksum(filePath: string): Promise<string> {
  const crypto = require('crypto');
  const content = await fs.readFile(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}
