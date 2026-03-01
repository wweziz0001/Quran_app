import { Hono } from 'hono';
import { db } from '../../shared/db';

const app = new Hono();

// GET /recitations - List all recitations
app.get('/', async (c) => {
  const reciterId = c.req.query('reciterId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (reciterId) where.reciterId = reciterId;

  const [recitations, total] = await Promise.all([
    db.recitation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        Reciter: { select: { nameEnglish: true, nameArabic: true } },
        _count: { select: { RecitationAyah: true } },
      },
    }),
    db.recitation.count({ where }),
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

// GET /recitations/:id - Get single recitation
app.get('/:id', async (c) => {
  const id = c.req.param('id');

  const recitation = await db.recitation.findUnique({
    where: { id },
    include: {
      Reciter: true,
      _count: { select: { RecitationAyah: true } },
    },
  });

  if (!recitation) {
    return c.json({ success: false, error: 'Recitation not found' }, 404);
  }

  return c.json({ success: true, data: recitation });
});

// GET /recitations/:id/ayahs - Get recitation ayahs
app.get('/:id/ayahs', async (c) => {
  const id = c.req.param('id');
  const surahId = c.req.query('surahId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { recitationId: id };
  if (surahId) {
    where.Ayah = { surahId: parseInt(surahId) };
  }

  const [ayahs, total] = await Promise.all([
    db.recitationAyah.findMany({
      where,
      orderBy: [{ Ayah: { surahId: 'asc' } }, { Ayah: { ayahNumber: 'asc' } }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        Ayah: {
          select: { surahId: true, ayahNumber: true, textArabic: true },
        },
      },
    }),
    db.recitationAyah.count({ where }),
  ]);

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
