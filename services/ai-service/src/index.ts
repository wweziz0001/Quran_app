import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import embeddingsRoutes from './routes/embeddings';
import chatRoutes from './routes/chat';

const app = new Hono();

app.use('*', cors());
app.use('*', logger());

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'ai-service',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      database: true,
      ai_sdk: true,
    },
  });
});

app.route('/embeddings', embeddingsRoutes);
app.route('/chat', chatRoutes);

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ success: false, error: err.message }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404);
});

const port = parseInt(process.env.PORT || '3007');

console.log(`🤖 AI service running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
