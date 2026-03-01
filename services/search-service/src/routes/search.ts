import { Hono } from 'hono';
import { db } from '../../shared/db';

const app = new Hono();

// POST /search - Search ayahs
app.post('/', async (c) => {
  const body = await c.req.json();
  const { query, type = 'text', page = 1, limit = 20 } = body;

  if (!query) {
    return c.json({ success: false, error: 'Query is required' }, 400);
  }

  // Text search (using SQLite LIKE for now)
  // In production, this would use Elasticsearch
  const ayahs = await db.ayah.findMany({
    where: {
      OR: [
        { textArabic: { contains: query } },
        { textUthmani: { contains: query } },
      ],
    },
    include: {
      Surah: { select: { nameArabic: true, nameEnglish: true, number: true } },
    },
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await db.ayah.count({
    where: {
      OR: [
        { textArabic: { contains: query } },
        { textUthmani: { contains: query } },
      ],
    },
  });

  return c.json({
    success: true,
    data: ayahs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    query,
    type,
  });
});

// GET /search/suggestions - Autocomplete
app.get('/suggestions', async (c) => {
  const query = c.req.query('q');

  if (!query || query.length < 2) {
    return c.json({ success: true, data: [] });
  }

  const ayahs = await db.ayah.findMany({
    where: {
      textArabic: { startsWith: query },
    },
    take: 5,
    select: {
      textArabic: true,
      surahId: true,
      ayahNumber: true,
      Surah: { select: { nameArabic: true } },
    },
  });

  return c.json({
    success: true,
    data: ayahs.map(a => ({
      text: a.textArabic.substring(0, 100) + '...',
      surah: a.Surah.nameArabic,
      reference: `${a.surahId}:${a.ayahNumber}`,
    })),
  });
});

export default app;
