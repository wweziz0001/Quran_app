import { Hono } from 'hono';
import { db } from '@quran/shared/db';

const app = new Hono();

// GET /surahs - List all surahs
app.get('/', async (c) => {
  const surahs = await db.surah.findMany({
    orderBy: { number: 'asc' },
  });

  return c.json({ success: true, data: surahs });
});

// GET /surahs/:id - Get single surah
app.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));

  if (isNaN(id) || id < 1 || id > 114) {
    return c.json({ success: false, error: 'Invalid surah ID' }, 400);
  }

  const surah = await db.surah.findUnique({
    where: { number: id },
    include: {
      _count: { select: { Ayah: true } },
    },
  });

  if (!surah) {
    return c.json({ success: false, error: 'Surah not found' }, 404);
  }

  return c.json({ success: true, data: surah });
});

// GET /surahs/:id/ayahs - Get surah ayahs
app.get('/:id/ayahs', async (c) => {
  const id = parseInt(c.req.param('id'));
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');

  const ayahs = await db.ayah.findMany({
    where: { surahId: id },
    orderBy: { ayahNumber: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      TafsirEntry: { take: 1 },
      TranslationEntry: { take: 1 },
    },
  });

  const total = await db.ayah.count({ where: { surahId: id } });

  return c.json({
    success: true,
    data: ayahs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export default app;
