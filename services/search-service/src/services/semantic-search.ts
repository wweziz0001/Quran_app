/**
 * Semantic Search Service
 * Provides AI-powered semantic search using embeddings
 */

import { db } from '@quran/shared/db';

interface SemanticSearchResult {
  ayahId: number;
  surahId: number;
  ayahNumber: number;
  text: string;
  similarity: number;
  surah?: {
    nameArabic: string;
    nameEnglish: string;
    number: number;
  };
}

interface EmbeddingVector {
  vector: number[];
  dimensions: number;
  model: string;
}

/**
 * Generate embedding for text
 * Uses z-ai-web-dev-sdk in production
 */
export async function generateEmbedding(text: string): Promise<EmbeddingVector> {
  console.log(`[Semantic Search] Generating embedding for text (${text.length} chars)`);

  // In production, use z-ai-web-dev-sdk:
  // const zai = await ZAI.create();
  // const embedding = await zai.embeddings.create({
  //   model: 'text-embedding-ada-002',
  //   input: text,
  // });

  // Placeholder: return random vector
  const dimensions = 1536;
  const vector = Array(dimensions).fill(0).map(() => Math.random());

  return {
    vector,
    dimensions,
    model: 'text-embedding-ada-002',
  };
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find similar ayahs using embeddings
 */
export async function findSimilarAyahs(
  queryEmbedding: number[],
  options: {
    limit?: number;
    threshold?: number;
    surahFilter?: number[];
  } = {}
): Promise<SemanticSearchResult[]> {
  const { limit = 10, threshold = 0.7 } = options;

  console.log(`[Semantic Search] Finding similar ayahs`);
  console.log(`  Limit: ${limit}, Threshold: ${threshold}`);

  // Get all indexed ayahs
  const indices = await db.searchIndex.findMany({
    take: limit * 3, // Get more to filter by threshold
    include: {
      Ayah: {
        include: {
          Surah: {
            select: { nameArabic: true, nameEnglish: true, number: true },
          },
        },
      },
    },
  });

  // Calculate similarities
  const results: SemanticSearchResult[] = [];

  for (const index of indices) {
    if (!index.embedding || !index.Ayah) continue;

    try {
      const storedEmbedding = JSON.parse(index.embedding as string) as number[];
      const similarity = cosineSimilarity(queryEmbedding, storedEmbedding);

      if (similarity >= threshold) {
        results.push({
          ayahId: index.ayahId,
          surahId: index.Ayah.surahId,
          ayahNumber: index.Ayah.ayahNumber,
          text: index.content || index.Ayah.textArabic,
          similarity,
          surah: index.Ayah.Surah
            ? {
                nameArabic: index.Ayah.Surah.nameArabic,
                nameEnglish: index.Ayah.Surah.nameEnglish,
                number: index.Ayah.Surah.number,
              }
            : undefined,
        });
      }
    } catch (error) {
      console.error(`[Semantic Search] Error parsing embedding for ayah ${index.ayahId}`);
    }
  }

  // Sort by similarity and return top results
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Index ayah for semantic search
 */
export async function indexAyah(ayahId: number): Promise<boolean> {
  console.log(`[Semantic Search] Indexing ayah ${ayahId}`);

  const ayah = await db.ayah.findUnique({
    where: { id: ayahId },
    include: { Surah: true },
  });

  if (!ayah) {
    console.error(`[Semantic Search] Ayah ${ayahId} not found`);
    return false;
  }

  // Generate embedding
  const embedding = await generateEmbedding(ayah.textArabic);

  // Store in database
  await db.searchIndex.upsert({
    where: { ayahId },
    update: {
      content: ayah.textArabic,
      embedding: JSON.stringify(embedding.vector),
      embeddingModel: embedding.model,
      lastIndexed: new Date(),
    },
    create: {
      ayahId,
      content: ayah.textArabic,
      embedding: JSON.stringify(embedding.vector),
      embeddingModel: embedding.model,
    },
  });

  return true;
}

/**
 * Batch index ayahs
 */
export async function batchIndexAyahs(
  ayahIds: number[],
  batchSize: number = 100
): Promise<{ indexed: number; failed: number }> {
  console.log(`[Semantic Search] Batch indexing ${ayahIds.length} ayahs`);

  let indexed = 0;
  let failed = 0;

  for (let i = 0; i < ayahIds.length; i += batchSize) {
    const batch = ayahIds.slice(i, i + batchSize);

    for (const ayahId of batch) {
      const success = await indexAyah(ayahId);
      if (success) {
        indexed++;
      } else {
        failed++;
      }
    }

    console.log(`[Semantic Search] Progress: ${indexed}/${ayahIds.length}`);
  }

  return { indexed, failed };
}

/**
 * Search by text query
 */
export async function semanticSearch(
  query: string,
  options: {
    limit?: number;
    threshold?: number;
  } = {}
): Promise<SemanticSearchResult[]> {
  console.log(`[Semantic Search] Searching for: "${query}"`);

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);

  // Find similar ayahs
  return findSimilarAyahs(queryEmbedding.vector, options);
}
