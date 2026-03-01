import { Hono } from 'hono';
import { db } from '../../shared/db';

const app = new Hono();

// GET /users - List all users (admin only)
app.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');

  const [users, total] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { UserSession: true, Bookmark: true } },
      },
    }),
    db.user.count(),
  ]);

  return c.json({
    success: true,
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// GET /users/:id - Get single user
app.get('/:id', async (c) => {
  const id = c.req.param('id');

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          UserSession: true,
          Bookmark: true,
          Collection: true,
        },
      },
    },
  });

  if (!user) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  return c.json({ success: true, data: user });
});

// PUT /users/:id - Update user
app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, role } = body;

  try {
    const user = await db.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(role && { role }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return c.json({ success: true, data: user });
  } catch {
    return c.json({ success: false, error: 'User not found' }, 404);
  }
});

// DELETE /users/:id - Delete user
app.delete('/:id', async (c) => {
  const id = c.req.param('id');

  try {
    await db.user.delete({
      where: { id },
    });

    return c.json({ success: true, message: 'User deleted' });
  } catch {
    return c.json({ success: false, error: 'User not found' }, 404);
  }
});

export default app;
