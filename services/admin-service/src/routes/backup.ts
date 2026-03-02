import { Hono } from 'hono';
import { db } from '@quran/shared/db';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';

const app = new Hono();
const BACKUP_DIR = process.env.BACKUP_DIR || '/app/backups';

// Ensure backup directory exists
if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, { recursive: true });
}

// GET /backup - List all backups
app.get('/', (c) => {
  try {
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const filePath = join(BACKUP_DIR, f);
        const stats = statSync(filePath);
        return {
          name: f,
          size: stats.size,
          createdAt: stats.birthtime,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return c.json({ success: true, data: files });
  } catch (error) {
    console.error('List backups error:', error);
    return c.json({ success: false, error: 'Failed to list backups' }, 500);
  }
});

// POST /backup - Create backup
app.post('/', async (c) => {
  try {
    const timestamp = Date.now();
    const backupName = `quran-backup-${timestamp}.db`;
    const backupPath = join(BACKUP_DIR, backupName);

    // Get database path from Prisma
    const dbUrl = process.env.DATABASE_URL || 'file:./db/quran.db';
    const dbPath = dbUrl.replace('file:', '');

    // Copy database file
    const dbContent = readFileSync(dbPath);
    writeFileSync(backupPath, dbContent);

    return c.json({
      success: true,
      data: {
        name: backupName,
        path: backupPath,
        size: dbContent.length,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Backup error:', error);
    return c.json({ success: false, error: 'Failed to create backup' }, 500);
  }
});

// DELETE /backup/:name - Delete backup
app.delete('/:name', (c) => {
  const name = c.req.param('name');
  const backupPath = join(BACKUP_DIR, name);

  if (!existsSync(backupPath)) {
    return c.json({ success: false, error: 'Backup not found' }, 404);
  }

  try {
    unlinkSync(backupPath);
    return c.json({ success: true, message: 'Backup deleted' });
  } catch (error) {
    console.error('Delete backup error:', error);
    return c.json({ success: false, error: 'Failed to delete backup' }, 500);
  }
});

export default app;
