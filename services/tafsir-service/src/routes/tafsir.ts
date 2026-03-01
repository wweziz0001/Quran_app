import { Hono } from 'hono';
import { db } from '../../shared/db';

const app = new Hono();

// GET /tafsir/sources - List all tafsir sources
app.get('/sources', async (c) => {
  const sources = await db.tafsirSource.findMany({
    orderBy: { name: 'asc' },
  });

  return c.json({ success: true, data: sources });
});

// GET /tafsir/sources/:id - Get single tafsir source
app.get('/sources/:id', async (c) => {
  const id = c.req.param('id');

  const source = await db.tafsirSource.findUnique({
    where: { id },
    include: {
      _count: { select: { TafsirEntry: true } },
    },
  });

  if (!source) {
    return c.json({ success: false, error: 'Tafsir source not found' }, 404);
  }

  return c.json({ success: true, data: source });
});

// GET /tafsir/ayah/:ayahId - Get tafsir for an ayah
app.get('/ayah/:ayahId', async (c) => {
  const ayahId = parseInt(c.req.param('ayahId'));
  const sourceId = c.req.query('sourceId');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { ayahId };
  if (sourceId) where.tafsirSourceId = sourceId;

  const entries = await db.tafsirEntry.findMany({
    where,
    include: {
      TafsirSource: { select: { name: true, language: true } },
    },
  });

  return c.json({ success: true, data: entries });
});

// GET /tafsir/:id - Get single tafsir entry
app.get('/:id', async (c) => {
  const id = c.req.param('id');

  const entry = await db.tafsirEntry.findUnique({
    where: { id },
    include: {
      TafsirSource: true,
      Ayah: { include: { Surah: { select: { nameArabic: true, number: true } } } },
    },
  });

  if (!entry) {
    return c.json({ success: false, error: 'Tafsir entry not found' }, 404);
  }

  return c.json({ success: true, data: entry });
});

export default app;
