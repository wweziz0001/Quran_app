import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    // Get all table names
    const tablesResult = await db.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master 
      WHERE type = 'table' 
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '_prisma_migrations'
    `;

    let totalTables = tablesResult.length;
    let totalRows = 0;
    let totalSize = 0;

    // Count rows for each table
    for (const table of tablesResult) {
      try {
        const countResult = await db.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*) as count FROM ${Prisma.raw(table.name)}
        `;
        totalRows += countResult[0]?.count || 0;
      } catch {
        // Skip if table can't be counted
      }
    }

    // Get database file size from file system
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const dbPath = path.join(process.cwd(), 'db', 'custom.db');
      const stats = await fs.stat(dbPath);
      totalSize = stats.size;
    } catch {
      // Can't get file size
    }

    // Get query statistics from QueryHistory
    let queryCount = 0;
    let avgQueryTime = 0;
    try {
      const queryStats = await db.queryHistory.aggregate({
        _count: true,
        _avg: { executionTime: true },
      });
      queryCount = queryStats._count;
      avgQueryTime = queryStats._avg.executionTime || 0;
    } catch {
      // QueryHistory table might not exist yet
    }

    const metrics = {
      totalTables,
      totalRows,
      totalSize: Number(totalSize),
      queryCount,
      avgQueryTime,
    };

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
