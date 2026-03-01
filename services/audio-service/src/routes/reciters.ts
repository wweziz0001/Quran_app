import { Hono } from 'hono';
import { db } from '../../shared/db';

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
      },
    },
  });

  if (!reciter) {
    return c.json({ success: false, error: 'Reciter not found' }, 404);
  }

  return c.json({ success: true, data: reciter });
});

export default app;
