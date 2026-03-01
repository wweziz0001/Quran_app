import { Hono } from 'hono';
import { db } from '../../shared/db';

const app = new Hono();

// GET /sessions - List all sessions
app.get('/', async (c) => {
  const userId = c.req.query('userId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (userId) where.userId = userId;

  const [sessions, total] = await Promise.all([
    db.userSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        userId: true,
        ipAddress: true,
        userAgent: true,
        expiresAt: true,
        createdAt: true,
        User: { select: { email: true, name: true } },
      },
    }),
    db.userSession.count({ where }),
  ]);

  return c.json({
    success: true,
    data: sessions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// DELETE /sessions/:id - Delete session (logout)
app.delete('/:id', async (c) => {
  const id = c.req.param('id');

  try {
    await db.userSession.delete({
      where: { id },
    });

    return c.json({ success: true, message: 'Session deleted' });
  } catch {
    return c.json({ success: false, error: 'Session not found' }, 404);
  }
});

// DELETE /sessions/user/:userId - Delete all user sessions
app.delete('/user/:userId', async (c) => {
  const userId = c.req.param('userId');

  const result = await db.userSession.deleteMany({
    where: { userId },
  });

  return c.json({
    success: true,
    message: `Deleted ${result.count} sessions`,
  });
});

export default app;
