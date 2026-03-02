/**
 * Semantic Search Service
 * 
 * Provides AI-powered semantic search capabilities for Quran content.
 * Combines text search with embedding-based similarity search.
 * 
 * @module semantic-search
 */

import { db } from '@quran/shared/db';
import { generateEmbedding } from '../lib/z-ai-client';
import { 
  getAyahEmbedding, 
  findSimilarAyahs, 
  cosineSimilarity 
} from './embeddings';
import { normalizeForSearch } from '@quran/shared/arabic-normalizer';

// Types
export interface SemanticSearchResult {
  ayahId: number;
  surahId: number;
  surahName: string;
  surahNameEnglish: string;
  ayahNumber: number;
  ayahNumberGlobal: number;
  textArabic: string;
  textUthmani?: string;
  similarity: number;
  translation?: string;
  tafsir?: string;
  juzNumber?: number;
  pageNumber?: number;
}

export interface HybridSearchResult extends SemanticSearchResult {
  textScore?: number;
  semanticScore?: number;
  combinedScore: number;
}

/**
 * Perform semantic search using embeddings
 * 
 * @param query - Search query
 * @param options - Search options
 * @returns Array of matching ayahs with similarity scores
 */
export async function semanticSearch(
  query: string,
  options: {
    limit?: number;
    threshold?: number;
    surahId?: number;
    juz?: number;
    includeTranslation?: boolean;
    includeTafsir?: boolean;
  } = {}
): Promise<SemanticSearchResult[]> {
  const {
    limit = 10,
    threshold = 0.5,
    surahId,
    juz,
    includeTranslation = false,
    includeTafsir = false,
  } = options;
  
  // Generate query embedding
  const embeddingResult = await generateEmbedding(query);
  const queryEmbedding = embeddingResult.embedding;
  
  // Get all indexed ayahs with their embeddings
  const indices = await db.searchIndex.findMany({
    where: {
      embedding: { not: null },
      ...(surahId && {
        Ayah: { surahId }
      }),
    },
    select: {
      ayahId: true,
      embedding: true,
      Ayah: {
        select: {
          surahId: true,
          ayahNumber: true,
          ayahNumberGlobal: true,
          textArabic: true,
          textUthmani: true,
          juzNumber: true,
          pageNumber: true,
          Surah: { 
            select: { 
              nameArabic: true, 
              nameEnglish: true 
            } 
          },
          ...(includeTranslation && {
            TranslationEntry: {
              where: { 
                TranslationSource: { languageCode: 'en-sahih' } 
              },
              take: 1,
              select: { text: true },
            },
          }),
          ...(includeTafsir && {
            TafsirEntry: {
              take: 1,
              select: { 
                textArabic: true,
                TafsirSource: { select: { nameArabic: true } }
              },
            },
          }),
        },
      },
    },
  });
  
  // Calculate similarities
  let results = indices
    .filter(index => index.embedding && index.Ayah)
    .map((index) => {
      const storedEmbedding = JSON.parse(index.embedding!);
      const similarity = cosineSimilarity(queryEmbedding, storedEmbedding);
      
      return {
        ayahId: index.ayahId,
        surahId: index.Ayah!.surahId,
        surahName: index.Ayah!.Surah?.nameArabic || '',
        surahNameEnglish: index.Ayah!.Surah?.nameEnglish || '',
        ayahNumber: index.Ayah!.ayahNumber,
        ayahNumberGlobal: index.Ayah!.ayahNumberGlobal,
        textArabic: index.Ayah!.textArabic,
        textUthmani: index.Ayah!.textUthmani || undefined,
        similarity,
        translation: includeTranslation 
          ? index.Ayah!.TranslationEntry?.[0]?.text 
          : undefined,
        tafsir: includeTafsir 
          ? index.Ayah!.TafsirEntry?.[0]?.textArabic 
          : undefined,
        juzNumber: index.Ayah!.juzNumber || undefined,
        pageNumber: index.Ayah!.pageNumber || undefined,
      };
    });
  
  // Filter by juz if specified
  if (juz) {
    results = results.filter(r => r.juzNumber === juz);
  }
  
  // Sort by similarity and filter by threshold
  return results
    .filter(r => r.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Perform hybrid search (text + semantic)
 * 
 * Combines traditional text search with semantic search for better results
 * 
 * @param query - Search query
 * @param options - Search options
 * @returns Array of matching ayahs with combined scores
 */
export async function hybridSearch(
  query: string,
  options: {
    limit?: number;
    textWeight?: number;
    semanticWeight?: number;
    surahId?: number;
    juz?: number;
  } = {}
): Promise<HybridSearchResult[]> {
  const { 
    limit = 10, 
    textWeight = 0.3, 
    semanticWeight = 0.7,
    surahId,
    juz,
  } = options;
  
  // Get text search results
  const normalizedQuery = normalizeForSearch(query);
  
  const textResults = await db.ayah.findMany({
    where: {
      OR: [
        { textArabic: { contains: normalizedQuery } },
        { textUthmani: { contains: normalizedQuery } },
      ],
      ...(surahId && { surahId }),
      ...(juz && { juzNumber: juz }),
    },
    take: limit * 2,
    select: {
      id: true,
      surahId: true,
      ayahNumber: true,
      ayahNumberGlobal: true,
      textArabic: true,
      textUthmani: true,
      juzNumber: true,
      pageNumber: true,
      Surah: { 
        select: { 
          nameArabic: true, 
          nameEnglish: true 
        } 
      },
    },
  });
  
  // Get semantic results
  const semanticResults = await semanticSearch(query, { 
    limit: limit * 2,
    surahId,
    juz,
  });
  
  // Combine and re-rank
  const combined = new Map<number, HybridSearchResult>();
  
  // Add text results
  textResults.forEach((ayah, index) => {
    const textScore = 1 - (index / textResults.length);
    combined.set(ayah.id, {
      ayahId: ayah.id,
      surahId: ayah.surahId,
      surahName: ayah.Surah?.nameArabic || '',
      surahNameEnglish: ayah.Surah?.nameEnglish || '',
      ayahNumber: ayah.ayahNumber,
      ayahNumberGlobal: ayah.ayahNumberGlobal,
      textArabic: ayah.textArabic,
      textUthmani: ayah.textUthmani || undefined,
      similarity: textScore * textWeight,
      textScore: textScore * textWeight,
      semanticScore: 0,
      combinedScore: textScore * textWeight,
      juzNumber: ayah.juzNumber || undefined,
      pageNumber: ayah.pageNumber || undefined,
    });
  });
  
  // Add/merge semantic results
  semanticResults.forEach((result) => {
    const existing = combined.get(result.ayahId);
    const semanticScore = result.similarity * semanticWeight;
    
    if (existing) {
      existing.semanticScore = semanticScore;
      existing.combinedScore = existing.combinedScore + semanticScore;
      existing.similarity = existing.combinedScore;
    } else {
      combined.set(result.ayahId, {
        ...result,
        textScore: 0,
        semanticScore,
        combinedScore: semanticScore,
      });
    }
  });
  
  // Sort by combined score
  return Array.from(combined.values())
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, limit);
}

/**
 * Find ayahs related to a specific ayah
 * 
 * @param ayahId - Source ayah ID
 * @param options - Search options
 * @returns Array of related ayahs
 */
export async function findRelatedAyahs(
  ayahId: number,
  options: { limit?: number; threshold?: number } = {}
): Promise<SemanticSearchResult[]> {
  const { limit = 5, threshold = 0.7 } = options;
  
  // Get the ayah's embedding
  const embeddingResult = await getAyahEmbedding(ayahId);
  
  // Find similar ayahs
  return findSimilarAyahs(embeddingResult.embedding, {
    limit,
    threshold,
    excludeAyahId: ayahId,
  }).then(results => 
    results.map(r => ({
      ...r,
      surahNameEnglish: '',
      ayahNumberGlobal: 0,
    }))
  );
}

/**
 * Search by theme/topic
 * 
 * @param theme - Theme or topic to search for
 * @param options - Search options
 * @returns Array of matching ayahs
 */
export async function searchByTheme(
  theme: string,
  options: { limit?: number; threshold?: number } = {}
): Promise<SemanticSearchResult[]> {
  // Convert theme to a query
  const themeQuery = `آيات عن ${theme}`;
  return semanticSearch(themeQuery, options);
}

// Export all functions
export default {
  semanticSearch,
  hybridSearch,
  findRelatedAyahs,
  searchByTheme,
};
