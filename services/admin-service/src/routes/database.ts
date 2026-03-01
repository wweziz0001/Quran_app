import { Hono } from 'hono';
import { db } from '../../shared/db';

const app = new Hono();

// GET /database/tables - List all tables
app.get('/tables', async (c) => {
  const result = await db.$queryRaw`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'
    ORDER BY name
  `;

  return c.json({ success: true, data: result });
});

// GET /database/stats - Database statistics
app.get('/stats', async () => {
  const [
    surahCount,
    ayahCount,
    reciterCount,
    userCount,
    tafsirCount,
    translationCount,
  ] = await Promise.all([
    db.surah.count(),
    db.ayah.count(),
    db.reciter.count(),
    db.user.count(),
    db.tafsirEntry.count(),
    db.translationEntry.count(),
  ]);

  return Response.json({
    success: true,
    data: {
      surahs: surahCount,
      ayahs: ayahCount,
      reciters: reciterCount,
      users: userCount,
      tafsirs: tafsirCount,
      translations: translationCount,
    },
  });
});

// GET /database/health - Database health check
app.get('/health', async (c) => {
  try {
    await db.$queryRaw`SELECT 1`;
    return c.json({
      success: true,
      data: { status: 'healthy', timestamp: new Date().toISOString() },
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Database connection failed',
    }, 500);
  }
});

export default app;
