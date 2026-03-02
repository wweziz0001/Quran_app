/**
 * Embeddings Service
 * 
 * Handles generation and storage of text embeddings for Quran ayahs.
 * Provides semantic search capabilities through vector similarity.
 * 
 * @module embeddings
 */

import { db } from '@quran/shared/db';
import { generateEmbedding } from '../lib/z-ai-client';

// Constants
const EMBEDDING_MODEL = 'quran-semantic-v1';
const EMBEDDING_DIMENSIONS = 1536;

// Types
export interface EmbeddingResult {
  ayahId: number;
  embedding: number[];
  model: string;
  cached: boolean;
}

export interface SimilarAyah {
  ayahId: number;
  similarity: number;
  surahId: number;
  surahName: string;
  ayahNumber: number;
  textArabic: string;
}

/**
 * Get or generate embedding for an ayah
 * 
 * @param ayahId - The ayah ID
 * @returns Embedding result with cached status
 */
export async function getAyahEmbedding(ayahId: number): Promise<EmbeddingResult> {
  // Check cache first
  const cached = await db.searchIndex.findUnique({
    where: { ayahId },
    select: { embedding: true, embeddingModel: true },
  });
  
  if (cached?.embedding) {
    return {
      ayahId,
      embedding: JSON.parse(cached.embedding),
      model: cached.embeddingModel || EMBEDDING_MODEL,
      cached: true,
    };
  }
  
  // Generate new embedding
  const ayah = await db.ayah.findUnique({
    where: { id: ayahId },
    select: { 
      textArabic: true, 
      textUthmani: true,
      Surah: { select: { nameArabic: true } },
    },
  });
  
  if (!ayah) {
    throw new Error(`Ayah ${ayahId} not found`);
  }
  
  // Use uthmani text for better semantic understanding
  const text = ayah.textUthmani || ayah.textArabic;
  const embeddingResult = await generateEmbedding(text);
  
  // Cache the embedding
  await db.searchIndex.upsert({
    where: { ayahId },
    update: {
      embedding: JSON.stringify(embeddingResult.embedding),
      embeddingModel: embeddingResult.model,
      lastIndexed: new Date(),
      content: text,
    },
    create: {
      ayahId,
      content: text,
      embedding: JSON.stringify(embeddingResult.embedding),
      embeddingModel: embeddingResult.model,
    },
  });
  
  return {
    ayahId,
    embedding: embeddingResult.embedding,
    model: embeddingResult.model,
    cached: false,
  };
}

/**
 * Generate embeddings for multiple ayahs
 * 
 * @param ayahIds - Array of ayah IDs
 * @param options - Batch size and force regenerate options
 * @returns Processing statistics
 */
export async function generateAyahEmbeddings(
  ayahIds: number[],
  options: { batchSize?: number; force?: boolean } = {}
): Promise<{ processed: number; cached: number; errors: number }> {
  const { batchSize = 10, force = false } = options;
  
  let processed = 0;
  let cached = 0;
  let errors = 0;
  
  for (let i = 0; i < ayahIds.length; i += batchSize) {
    const batch = ayahIds.slice(i, i + batchSize);
    
    const promises = batch.map(async (ayahId) => {
      try {
        if (!force) {
          const existing = await db.searchIndex.findUnique({
            where: { ayahId },
          });
          
          if (existing?.embedding) {
            cached++;
            return;
          }
        }
        
        await getAyahEmbedding(ayahId);
        processed++;
      } catch (error) {
        console.error(`[Embeddings] Error processing ayah ${ayahId}:`, error);
        errors++;
      }
    });
    
    await Promise.all(promises);
    
    // Log progress
    const progress = Math.min(i + batchSize, ayahIds.length);
    console.log(`[Embeddings] Progress: ${progress}/${ayahIds.length} (${processed} new, ${cached} cached, ${errors} errors)`);
  }
  
  return { processed, cached, errors };
}

/**
 * Generate embeddings for all ayahs in the database
 */
export async function generateAllEmbeddings(): Promise<{
  total: number;
  processed: number;
  cached: number;
  errors: number;
}> {
  console.log('[Embeddings] Starting to generate embeddings for all ayahs...');
  
  const ayahs = await db.ayah.findMany({
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  
  const ayahIds = ayahs.map(a => a.id);
  const total = ayahIds.length;
  
  console.log(`[Embeddings] Found ${total} ayahs to process`);
  
  const result = await generateAyahEmbeddings(ayahIds, { batchSize: 5 });
  
  console.log(`[Embeddings] Completed: ${result.processed} processed, ${result.cached} cached, ${result.errors} errors`);
  
  return { total, ...result };
}

/**
 * Calculate cosine similarity between two vectors
 * 
 * @param a - First vector
 * @param b - Second vector
 * @returns Similarity score (0-1)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Find similar ayahs by embedding
 * 
 * @param embedding - Query embedding
 * @param options - Search options
 * @returns Array of similar ayahs with similarity scores
 */
export async function findSimilarAyahs(
  embedding: number[],
  options: {
    limit?: number;
    threshold?: number;
    excludeAyahId?: number;
    surahId?: number;
  } = {}
): Promise<SimilarAyah[]> {
  const { limit = 10, threshold = 0.7, excludeAyahId, surahId } = options;
  
  // Get all embeddings from database
  // Note: In production with pgvector or dedicated vector DB, 
  // this would be much more efficient
  const indices = await db.searchIndex.findMany({
    where: {
      embedding: { not: null },
      ...(excludeAyahId && { ayahId: { not: excludeAyahId } }),
    },
    select: {
      ayahId: true,
      embedding: true,
      Ayah: {
        select: {
          surahId: true,
          ayahNumber: true,
          textArabic: true,
          Surah: { select: { nameArabic: true } },
        },
      },
    },
  });
  
  // Calculate similarities
  const similarities = indices
    .filter(index => index.embedding && index.Ayah)
    .filter(index => !surahId || index.Ayah?.surahId === surahId)
    .map((index) => {
      const storedEmbedding = JSON.parse(index.embedding!);
      const similarity = cosineSimilarity(embedding, storedEmbedding);
      
      return {
        ayahId: index.ayahId,
        similarity,
        surahId: index.Ayah!.surahId,
        surahName: index.Ayah!.Surah?.nameArabic || '',
        ayahNumber: index.Ayah!.ayahNumber,
        textArabic: index.Ayah!.textArabic,
      };
    });
  
  // Sort by similarity and filter
  return similarities
    .filter(s => s.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Get embedding statistics
 */
export async function getEmbeddingStats(): Promise<{
  totalAyahs: number;
  indexedAyahs: number;
  pendingAyahs: number;
  model: string;
}> {
  const [totalAyahs, indexedAyahs] = await Promise.all([
    db.ayah.count(),
    db.searchIndex.count({ where: { embedding: { not: null } } }),
  ]);
  
  const sampleIndex = await db.searchIndex.findFirst({
    where: { embedding: { not: null } },
    select: { embeddingModel: true },
  });
  
  return {
    totalAyahs,
    indexedAyahs,
    pendingAyahs: totalAyahs - indexedAyahs,
    model: sampleIndex?.embeddingModel || EMBEDDING_MODEL,
  };
}

// Export all functions
export default {
  getAyahEmbedding,
  generateAyahEmbeddings,
  generateAllEmbeddings,
  cosineSimilarity,
  findSimilarAyahs,
  getEmbeddingStats,
};
