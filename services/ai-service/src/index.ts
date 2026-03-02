import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import embeddingsRoutes from './routes/embeddings';
import chatRoutes from './routes/chat';
import tafsirAiRoutes from './routes/tafsir-ai';
import semanticSearchRoutes from './routes/semantic-search';
import questionAnsweringRoutes from './routes/question-answering';
import recommendationsRoutes from './routes/recommendations';

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
    routes: [
      '/embeddings',
      '/chat',
      '/tafsir-ai',
      '/semantic-search',
      '/qa',
      '/recommendations',
    ],
    checks: {
      database: true,
      ai_sdk: true,
    },
  });
});

// AI Routes
app.route('/embeddings', embeddingsRoutes);
app.route('/chat', chatRoutes);
app.route('/tafsir-ai', tafsirAiRoutes);
app.route('/semantic-search', semanticSearchRoutes);
app.route('/qa', questionAnsweringRoutes);
app.route('/recommendations', recommendationsRoutes);

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
console.log(`📚 Available routes:`);
console.log(`   - /embeddings (generate, index, search)`);
console.log(`   - /chat (tafsir, question, explain, search)`);
console.log(`   - /tafsir-ai (explain, compare, analyze-theme, daily)`);
console.log(`   - /semantic-search (hybrid, related, theme)`);
console.log(`   - /qa (explain, compare, contextual)`);
console.log(`   - /recommendations (sequential, personalized)`);

export default {
  port,
  fetch: app.fetch,
};
