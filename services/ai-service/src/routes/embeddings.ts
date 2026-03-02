import { Hono } from 'hono';
import { db } from '../../shared/db';
import { 
  getAyahEmbedding, 
  generateAyahEmbeddings, 
  generateAllEmbeddings,
  findSimilarAyahs,
  getEmbeddingStats,
  cosineSimilarity
} from '../services/embeddings';
import { generateEmbedding } from '../lib/z-ai-client';

const app = new Hono();

// POST /embeddings/generate - Generate embeddings for text
app.post('/generate', async (c) => {
  const body = await c.req.json();
  const { text } = body;

  if (!text) {
    return c.json({ success: false, error: 'Text is required' }, 400);
  }

  try {
    const embeddingResult = await generateEmbedding(text);

    return c.json({
      success: true,
      data: {
        text,
        embedding: embeddingResult.embedding,
        model: embeddingResult.model,
        dimensions: embeddingResult.dimensions,
      },
    });
  } catch (error) {
    console.error('Embedding error:', error);
    return c.json({ success: false, error: 'Failed to generate embedding' }, 500);
  }
});

// POST /embeddings/index - Index ayah embeddings
app.post('/index', async (c) => {
  const body = await c.req.json();
  const { ayahId, force = false } = body;

  if (!ayahId) {
    return c.json({ success: false, error: 'ayahId is required' }, 400);
  }

  try {
    const result = await getAyahEmbedding(ayahId);

    return c.json({
      success: true,
      data: {
        ayahId,
        indexed: true,
        cached: result.cached,
        model: result.model,
      },
    });
  } catch (error) {
    console.error('Index error:', error);
    return c.json({ success: false, error: 'Failed to index ayah' }, 500);
  }
});

// POST /embeddings/index-batch - Index multiple ayahs
app.post('/index-batch', async (c) => {
  const body = await c.req.json();
  const { ayahIds, batchSize = 10, force = false } = body;

  if (!ayahIds || !Array.isArray(ayahIds)) {
    return c.json({ success: false, error: 'ayahIds array is required' }, 400);
  }

  try {
    const result = await generateAyahEmbeddings(ayahIds, { batchSize, force });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Batch index error:', error);
    return c.json({ success: false, error: 'Failed to index ayahs' }, 500);
  }
});

// POST /embeddings/index-all - Index all ayahs
app.post('/index-all', async (c) => {
  try {
    const result = await generateAllEmbeddings();

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Index all error:', error);
    return c.json({ success: false, error: 'Failed to index all ayahs' }, 500);
  }
});

// POST /embeddings/search - Semantic search
app.post('/search', async (c) => {
  const body = await c.req.json();
  const { query, limit = 10, threshold = 0.5, surahId, excludeAyahId } = body;

  if (!query) {
    return c.json({ success: false, error: 'Query is required' }, 400);
  }

  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Find similar ayahs
    const results = await findSimilarAyahs(queryEmbedding.embedding, {
      limit,
      threshold,
      surahId,
      excludeAyahId,
    });

    // Get ayah details
    const ayahIds = results.map(r => r.ayahId);
    const ayahs = await db.ayah.findMany({
      where: { id: { in: ayahIds } },
      include: {
        Surah: { select: { nameArabic: true, nameEnglish: true, number: true } },
      },
    });

    const ayahMap = new Map(ayahs.map(a => [a.id, a]));

    return c.json({
      success: true,
      data: results.map(r => {
        const ayah = ayahMap.get(r.ayahId);
        return {
          ayahId: r.ayahId,
          text: ayah?.textArabic,
          textUthmani: ayah?.textUthmani,
          surah: ayah?.Surah?.nameArabic,
          surahEnglish: ayah?.Surah?.nameEnglish,
          surahNumber: ayah?.Surah?.number,
          ayahNumber: r.ayahNumber,
          similarity: r.similarity,
        };
      }),
      query,
    });
  } catch (error) {
    console.error('Search error:', error);
    return c.json({ success: false, error: 'Failed to search' }, 500);
  }
});

// POST /embeddings/similar - Find similar ayahs by ayah ID
app.post('/similar', async (c) => {
  const body = await c.req.json();
  const { ayahId, limit = 10, threshold = 0.7 } = body;

  if (!ayahId) {
    return c.json({ success: false, error: 'ayahId is required' }, 400);
  }

  try {
    const embeddingResult = await getAyahEmbedding(ayahId);
    const results = await findSimilarAyahs(embeddingResult.embedding, {
      limit,
      threshold,
      excludeAyahId: ayahId,
    });

    // Get ayah details
    const ayahIds = results.map(r => r.ayahId);
    const ayahs = await db.ayah.findMany({
      where: { id: { in: ayahIds } },
      include: {
        Surah: { select: { nameArabic: true, nameEnglish: true } },
      },
    });

    const ayahMap = new Map(ayahs.map(a => [a.id, a]));

    return c.json({
      success: true,
      data: results.map(r => {
        const ayah = ayahMap.get(r.ayahId);
        return {
          ayahId: r.ayahId,
          text: ayah?.textArabic,
          surah: ayah?.Surah?.nameArabic,
          surahNumber: ayah?.surahId,
          ayahNumber: r.ayahNumber,
          similarity: r.similarity,
        };
      }),
    });
  } catch (error) {
    console.error('Similar search error:', error);
    return c.json({ success: false, error: 'Failed to find similar ayahs' }, 500);
  }
});

// GET /embeddings/stats - Get embedding statistics
app.get('/stats', async (c) => {
  try {
    const stats = await getEmbeddingStats();
    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return c.json({ success: false, error: 'Failed to get stats' }, 500);
  }
});

// POST /embeddings/similarity - Calculate similarity between two texts
app.post('/similarity', async (c) => {
  const body = await c.req.json();
  const { text1, text2 } = body;

  if (!text1 || !text2) {
    return c.json({ success: false, error: 'Both text1 and text2 are required' }, 400);
  }

  try {
    const [embedding1, embedding2] = await Promise.all([
      generateEmbedding(text1),
      generateEmbedding(text2),
    ]);

    const similarity = cosineSimilarity(embedding1.embedding, embedding2.embedding);

    return c.json({
      success: true,
      data: {
        text1,
        text2,
        similarity,
      },
    });
  } catch (error) {
    console.error('Similarity error:', error);
    return c.json({ success: false, error: 'Failed to calculate similarity' }, 500);
  }
});

export default app;
