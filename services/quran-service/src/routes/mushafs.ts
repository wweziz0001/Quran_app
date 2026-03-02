import { Hono } from 'hono';
import { db } from '@quran/shared/db';

const app = new Hono();

// GET /mushafs - List all mushaf editions
app.get('/', async (c) => {
  const mushafs = await db.mushafEdition.findMany({
    orderBy: { name: 'asc' },
  });

  return c.json({ success: true, data: mushafs });
});

// GET /mushafs/:id - Get single mushaf
app.get('/:id', async (c) => {
  const id = c.req.param('id');

  const mushaf = await db.mushafEdition.findUnique({
    where: { id },
    include: {
      _count: { select: { MushafPage: true } },
    },
  });

  if (!mushaf) {
    return c.json({ success: false, error: 'Mushaf not found' }, 404);
  }

  return c.json({ success: true, data: mushaf });
});

// GET /mushafs/:id/pages - Get mushaf pages
app.get('/:id/pages', async (c) => {
  const id = c.req.param('id');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');

  const pages = await db.mushafPage.findMany({
    where: { mushafEditionId: id },
    orderBy: { pageNumber: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await db.mushafPage.count({ where: { mushafEditionId: id } });

  return c.json({
    success: true,
    data: pages,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export default app;
