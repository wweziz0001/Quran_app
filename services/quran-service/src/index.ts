import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import surahRoutes from './routes/surahs';
import ayahRoutes from './routes/ayahs';
import mushafRoutes from './routes/mushafs';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'quran-service',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.route('/surahs', surahRoutes);
app.route('/ayahs', ayahRoutes);
app.route('/mushafs', mushafRoutes);

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ success: false, error: err.message }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404);
});

const port = parseInt(process.env.PORT || '3001');

console.log(`🚀 Quran service running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
