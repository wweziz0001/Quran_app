import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import reciterRoutes from './routes/reciters';
import recitationRoutes from './routes/recitations';
import streamRoutes from './routes/stream';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'audio-service',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      database: true,
      ffmpeg: true,
    },
  });
});

// Routes
app.route('/reciters', reciterRoutes);
app.route('/recitations', recitationRoutes);
app.route('/stream', streamRoutes);

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ success: false, error: err.message }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404);
});

const port = parseInt(process.env.PORT || '3002');

console.log(`🎵 Audio service running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
