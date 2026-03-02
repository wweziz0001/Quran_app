import { Hono } from 'hono';
import { db } from '@quran/shared/db';

const app = new Hono();

// GET /settings - List all settings
app.get('/', async (c) => {
  const settings = await db.appSetting.findMany({
    orderBy: { key: 'asc' },
  });

  return c.json({ success: true, data: settings });
});

// GET /settings/:key - Get single setting
app.get('/:key', async (c) => {
  const key = c.req.param('key');

  const setting = await db.appSetting.findUnique({
    where: { key },
  });

  if (!setting) {
    return c.json({ success: false, error: 'Setting not found' }, 404);
  }

  return c.json({ success: true, data: setting });
});

// PUT /settings/:key - Update setting
app.put('/:key', async (c) => {
  const key = c.req.param('key');
  const body = await c.req.json();
  const { value, description } = body;

  try {
    const setting = await db.appSetting.upsert({
      where: { key },
      update: {
        value,
        ...(description && { description }),
        updatedAt: new Date(),
      },
      create: {
        key,
        value,
        description,
      },
    });

    return c.json({ success: true, data: setting });
  } catch (error) {
    console.error('Update setting error:', error);
    return c.json({ success: false, error: 'Failed to update setting' }, 500);
  }
});

// DELETE /settings/:key - Delete setting
app.delete('/:key', async (c) => {
  const key = c.req.param('key');

  try {
    await db.appSetting.delete({
      where: { key },
    });

    return c.json({ success: true, message: 'Setting deleted' });
  } catch {
    return c.json({ success: false, error: 'Setting not found' }, 404);
  }
});

// GET /settings/features - Get feature flags
app.get('/features/list', async (c) => {
  const features = await db.featureFlag.findMany({
    orderBy: { key: 'asc' },
  });

  return c.json({ success: true, data: features });
});

// PUT /settings/features/:key - Toggle feature flag
app.put('/features/:key', async (c) => {
  const key = c.req.param('key');
  const body = await c.req.json();
  const { enabled } = body;

  try {
    const feature = await db.featureFlag.update({
      where: { key },
      data: { enabled },
    });

    return c.json({ success: true, data: feature });
  } catch {
    return c.json({ success: false, error: 'Feature not found' }, 404);
  }
});

export default app;
