import { Hono } from 'hono';
import {
  searchAyahs,
  getAutocompleteSuggestions,
  getPopularSearches,
  getRelatedAyahs,
  type SearchParams,
  type SearchResponse,
} from '../services/quran-search';
import {
  getAutocomplete,
  clearCache,
  type AutocompleteSuggestion,
} from '../services/autocomplete';
import {
  checkHealth,
  indexExists,
  INDICES,
} from '../services/elasticsearch';
import { semanticSearch } from '../services/semantic-search';

const app = new Hono();

// POST /search - Main search endpoint
app.post('/', async (c) => {
  const body = await c.req.json();
  const {
    query,
    type = 'text',
    surahId,
    juzNumber,
    hizbNumber,
    pageNumber,
    page = 1,
    limit = 20,
    fuzzy = false,
    highlight = true,
    includeTranslations = false,
    includeTafsir = false,
  } = body as SearchParams;

  if (!query) {
    return c.json({ success: false, error: 'Query is required' }, 400);
  }

  const result = await searchAyahs({
    query,
    type,
    surahId,
    juzNumber,
    hizbNumber,
    pageNumber,
    page,
    limit,
    fuzzy,
    highlight,
    includeTranslations,
    includeTafsir,
  });

  return c.json(result);
});

// GET /search/suggestions - Autocomplete suggestions
app.get('/suggestions', async (c) => {
  const query = c.req.query('q');
  const surahId = c.req.query('surahId') ? parseInt(c.req.query('surahId')!) : undefined;
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 10;

  if (!query || query.length < 2) {
    return c.json({ success: true, data: [] });
  }

  const suggestions = await getAutocomplete({
    prefix: query,
    size: limit,
    surahId,
  });

  return c.json({
    success: true,
    data: suggestions,
  });
});

// GET /search/popular - Popular search queries
app.get('/popular', async (c) => {
  const popular = await getPopularSearches();
  return c.json({
    success: true,
    data: popular,
  });
});

// GET /search/related/:id - Get related ayahs
app.get('/related/:id', async (c) => {
  const id = parseInt(c.req.param('id'));

  if (isNaN(id)) {
    return c.json({ success: false, error: 'Invalid ayah ID' }, 400);
  }

  const related = await getRelatedAyahs(id);
  return c.json({
    success: true,
    data: related,
  });
});

// POST /search/semantic - Semantic search
app.post('/semantic', async (c) => {
  const body = await c.req.json();
  const { query, limit = 10, threshold = 0.7 } = body;

  if (!query) {
    return c.json({ success: false, error: 'Query is required' }, 400);
  }

  const results = await semanticSearch(query, { limit, threshold });
  return c.json({
    success: true,
    data: results,
  });
});

// GET /search/health - Elasticsearch health check
app.get('/health', async (c) => {
  try {
    // Check if Elasticsearch is configured
    if (!process.env.ELASTICSEARCH_URL) {
      return c.json({
        status: 'degraded',
        message: 'Elasticsearch not configured',
        usingDatabase: true,
      });
    }

    const health = await checkHealth();
    const quranIndexExists = await indexExists(INDICES.QURAN_AYAHS);

    return c.json({
      status: health.status,
      cluster: health.clusterName,
      nodes: health.numberOfNodes,
      indices: {
        quran_ayahs: quranIndexExists,
      },
    });
  } catch (error) {
    return c.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      usingDatabase: true,
    }, 503);
  }
});

// DELETE /search/cache - Clear autocomplete cache
app.delete('/cache', async (c) => {
  clearCache();
  return c.json({
    success: true,
    message: 'Cache cleared',
  });
});

export default app;
