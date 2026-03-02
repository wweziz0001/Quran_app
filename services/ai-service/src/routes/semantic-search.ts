import { Hono } from 'hono';
import { semanticSearch, hybridSearch, findRelatedAyahs, searchByTheme } from '../services/semantic-search';

const app = new Hono();

// POST /semantic-search - Perform semantic search
app.post('/', async (c) => {
  const body = await c.req.json();
  const { 
    query, 
    limit = 10, 
    threshold = 0.5, 
    surahId, 
    juz,
    includeTranslation = false,
    includeTafsir = false
  } = body;

  if (!query) {
    return c.json({ success: false, error: 'Query is required' }, 400);
  }

  try {
    const results = await semanticSearch(query, {
      limit,
      threshold,
      surahId,
      juz,
      includeTranslation,
      includeTafsir,
    });

    return c.json({
      success: true,
      data: results,
      query,
      count: results.length,
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    return c.json({ success: false, error: 'Failed to perform semantic search' }, 500);
  }
});

// POST /semantic-search/hybrid - Hybrid search (text + semantic)
app.post('/hybrid', async (c) => {
  const body = await c.req.json();
  const { 
    query, 
    limit = 10, 
    textWeight = 0.3, 
    semanticWeight = 0.7,
    surahId,
    juz
  } = body;

  if (!query) {
    return c.json({ success: false, error: 'Query is required' }, 400);
  }

  try {
    const results = await hybridSearch(query, {
      limit,
      textWeight,
      semanticWeight,
      surahId,
      juz,
    });

    return c.json({
      success: true,
      data: results,
      query,
      count: results.length,
    });
  } catch (error) {
    console.error('Hybrid search error:', error);
    return c.json({ success: false, error: 'Failed to perform hybrid search' }, 500);
  }
});

// POST /semantic-search/related - Find related ayahs
app.post('/related', async (c) => {
  const body = await c.req.json();
  const { ayahId, limit = 5, threshold = 0.7 } = body;

  if (!ayahId) {
    return c.json({ success: false, error: 'ayahId is required' }, 400);
  }

  try {
    const results = await findRelatedAyahs(ayahId, { limit, threshold });

    return c.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Related ayahs error:', error);
    return c.json({ success: false, error: 'Failed to find related ayahs' }, 500);
  }
});

// POST /semantic-search/theme - Search by theme
app.post('/theme', async (c) => {
  const body = await c.req.json();
  const { theme, limit = 10, threshold = 0.5 } = body;

  if (!theme) {
    return c.json({ success: false, error: 'Theme is required' }, 400);
  }

  try {
    const results = await searchByTheme(theme, { limit, threshold });

    return c.json({
      success: true,
      data: results,
      theme,
      count: results.length,
    });
  } catch (error) {
    console.error('Theme search error:', error);
    return c.json({ success: false, error: 'Failed to search by theme' }, 500);
  }
});

export default app;
