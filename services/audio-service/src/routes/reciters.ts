import { Hono } from 'hono';
import { db } from '../../shared/db';
import { getStorageStats, getCacheStats, healthCheck } from '../services';

const app = new Hono();

// GET /reciters - List all reciters
app.get('/', async (c) => {
  const reciters = await db.reciter.findMany({
    orderBy: { nameEnglish: 'asc' },
    include: {
      _count: { select: { Recitation: true } },
    },
  });

  return c.json({ success: true, data: reciters });
});

// GET /reciters/:id - Get single reciter
app.get('/:id', async (c) => {
  const id = c.req.param('id');

  const reciter = await db.reciter.findUnique({
    where: { id },
    include: {
      Recitation: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          _count: { select: { RecitationAyah: true } },
        },
      },
    },
  });

  if (!reciter) {
    return c.json({ success: false, error: 'Reciter not found' }, 404);
  }

  return c.json({ success: true, data: reciter });
});

// GET /reciters/:id/recitations - Get all recitations for a reciter
app.get('/:id/recitations', async (c) => {
  const id = c.req.param('id');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');

  const [recitations, total] = await Promise.all([
    db.recitation.findMany({
      where: { reciterId: id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { RecitationAyah: true } },
      },
    }),
    db.recitation.count({ where: { reciterId: id } }),
  ]);

  return c.json({
    success: true,
    data: recitations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// GET /reciters/stats/storage - Get storage statistics for audio files
app.get('/stats/storage', async (c) => {
  try {
    const stats = await getStorageStats();
    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: (error as Error).message,
    }, 500);
  }
});

// GET /reciters/stats/cache - Get cache statistics
app.get('/stats/cache', async (c) => {
  try {
    const stats = await getCacheStats();
    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: (error as Error).message,
    }, 500);
  }
});

// GET /reciters/health - Health check for audio services
app.get('/health', async (c) => {
  try {
    const health = await healthCheck();
    return c.json({
      success: true,
      data: health,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: (error as Error).message,
    }, 500);
  }
});

export default app;
