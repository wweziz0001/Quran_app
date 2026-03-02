import { Hono } from 'hono';
import { db } from '@quran/shared/db';

const app = new Hono();

// GET /translations/sources - List all translation sources
app.get('/sources', async (c) => {
  const sources = await db.translationSource.findMany({
    orderBy: { name: 'asc' },
  });

  return c.json({ success: true, data: sources });
});

// GET /translations/sources/:id - Get single translation source
app.get('/sources/:id', async (c) => {
  const id = c.req.param('id');

  const source = await db.translationSource.findUnique({
    where: { id },
    include: {
      _count: { select: { TranslationEntry: true } },
    },
  });

  if (!source) {
    return c.json({ success: false, error: 'Translation source not found' }, 404);
  }

  return c.json({ success: true, data: source });
});

// GET /translations/ayah/:ayahId - Get translations for an ayah
app.get('/ayah/:ayahId', async (c) => {
  const ayahId = parseInt(c.req.param('ayahId'));
  const sourceId = c.req.query('sourceId');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { ayahId };
  if (sourceId) where.translationSourceId = sourceId;

  const entries = await db.translationEntry.findMany({
    where,
    include: {
      TranslationSource: { select: { name: true, language: true } },
    },
  });

  return c.json({ success: true, data: entries });
});

// GET /translations/:id - Get single translation entry
app.get('/:id', async (c) => {
  const id = c.req.param('id');

  const entry = await db.translationEntry.findUnique({
    where: { id },
    include: {
      TranslationSource: true,
      Ayah: { include: { Surah: { select: { nameArabic: true, number: true } } } },
    },
  });

  if (!entry) {
    return c.json({ success: false, error: 'Translation entry not found' }, 404);
  }

  return c.json({ success: true, data: entry });
});

export default app;
