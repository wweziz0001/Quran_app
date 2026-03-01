import { Hono } from 'hono';
import { db } from '../../shared/db';

const app = new Hono();

// GET /reciters - List all reciters
app.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const search = c.req.query('search');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (search) {
    where.OR = [
      { nameEnglish: { contains: search } },
      { nameArabic: { contains: search } },
    ];
  }

  const [reciters, total] = await Promise.all([
    db.reciter.findMany({
      where,
      orderBy: { nameEnglish: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { Recitation: true } },
      },
    }),
    db.reciter.count({ where }),
  ]);

  return c.json({
    success: true,
    data: reciters,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
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
      },
      _count: { select: { Recitation: true } },
    },
  });

  if (!reciter) {
    return c.json({ success: false, error: 'Reciter not found' }, 404);
  }

  return c.json({ success: true, data: reciter });
});

// POST /reciters - Create new reciter
app.post('/', async (c) => {
  const body = await c.req.json();
  const { nameEnglish, nameArabic, bio, country } = body;

  if (!nameEnglish) {
    return c.json({ success: false, error: 'nameEnglish is required' }, 400);
  }

  try {
    const reciter = await db.reciter.create({
      data: {
        nameEnglish,
        nameArabic: nameArabic || nameEnglish,
        bio,
        country,
      },
    });

    return c.json({ success: true, data: reciter }, 201);
  } catch (error) {
    console.error('Create reciter error:', error);
    return c.json({ success: false, error: 'Failed to create reciter' }, 500);
  }
});

// PUT /reciters/:id - Update reciter
app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  try {
    const reciter = await db.reciter.update({
      where: { id },
      data: body,
    });

    return c.json({ success: true, data: reciter });
  } catch {
    return c.json({ success: false, error: 'Reciter not found' }, 404);
  }
});

// DELETE /reciters/:id - Delete reciter
app.delete('/:id', async (c) => {
  const id = c.req.param('id');

  try {
    await db.reciter.delete({
      where: { id },
    });

    return c.json({ success: true, message: 'Reciter deleted' });
  } catch {
    return c.json({ success: false, error: 'Reciter not found' }, 404);
  }
});

export default app;
