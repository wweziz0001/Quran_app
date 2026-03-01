import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import tafsirRoutes from './routes/tafsir';
import translationRoutes from './routes/translations';

const app = new Hono();

app.use('*', cors());
app.use('*', logger());

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'tafsir-service',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.route('/tafsir', tafsirRoutes);
app.route('/translations', translationRoutes);

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ success: false, error: err.message }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404);
});

const port = parseInt(process.env.PORT || '3004');

console.log(`📖 Tafsir service running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
