import { Hono } from 'hono';
import { db } from '@quran/shared/db';

const app = new Hono();

// GET /ayahs - List ayahs with filters
app.get('/', async (c) => {
  const surahId = c.req.query('surahId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const juz = c.req.query('juz');
  const pageNumber = c.req.query('page');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (surahId) where.surahId = parseInt(surahId);
  if (juz) where.juzNumber = parseInt(juz);
  if (pageNumber) where.pageNumber = parseInt(pageNumber);

  const [ayahs, total] = await Promise.all([
    db.ayah.findMany({
      where,
      orderBy: [{ surahId: 'asc' }, { ayahNumber: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: { Surah: { select: { nameArabic: true, nameEnglish: true } } },
    }),
    db.ayah.count({ where }),
  ]);

  return c.json({
    success: true,
    data: ayahs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// GET /ayahs/:id - Get single ayah
app.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));

  const ayah = await db.ayah.findUnique({
    where: { id },
    include: {
      Surah: true,
      TafsirEntry: { include: { TafsirSource: true } },
      TranslationEntry: { include: { TranslationSource: true } },
      RecitationAyah: { include: { Recitation: { include: { Reciter: true } } } },
    },
  });

  if (!ayah) {
    return c.json({ success: false, error: 'Ayah not found' }, 404);
  }

  return c.json({ success: true, data: ayah });
});

// GET /ayahs/random - Get random ayah
app.get('/random', async (c) => {
  const count = await db.ayah.count();
  const skip = Math.floor(Math.random() * count);

  const ayah = await db.ayah.findFirst({
    skip,
    include: { Surah: { select: { nameArabic: true, number: true } } },
  });

  return c.json({ success: true, data: ayah });
});

export default app;
