/**
 * Recommendations Service
 * 
 * Provides AI-powered ayah recommendations based on various signals.
 * Implements content-based filtering using embeddings.
 * 
 * @module recommendations
 */

import { db } from '@/lib/db';
import { getAyahEmbedding, findSimilarAyahs, cosineSimilarity } from './embeddings';
import { chatCompletion, generateSimilarThemes } from '@/lib/z-ai-client';

// Types
export interface Recommendation {
  ayahId: number;
  surahId: number;
  surahName: string;
  ayahNumber: number;
  text: string;
  score: number;
  reason: string;
  type: 'similar' | 'thematic' | 'sequential' | 'complementary';
}

export interface RecommendationContext {
  currentAyahId?: number;
  viewedAyahIds?: number[];
  searchHistory?: string[];
  favorites?: number[];
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
}

/**
 * Get recommendations based on current context
 * 
 * @param context - User context for recommendations
 * @param options - Recommendation options
 * @returns Array of recommended ayahs
 */
export async function getRecommendations(
  context: RecommendationContext = {},
  options: { limit?: number; diversity?: number } = {}
): Promise<Recommendation[]> {
  const { limit = 5, diversity = 0.3 } = options;
  const recommendations: Recommendation[] = [];
  
  // 1. Similar ayahs based on current ayah
  if (context.currentAyahId) {
    const similar = await getSimilarAyahRecommendations(
      context.currentAyahId,
      Math.ceil(limit * (1 - diversity))
    );
    recommendations.push(...similar);
  }
  
  // 2. Thematic recommendations based on search history
  if (context.searchHistory?.length) {
    const thematic = await getThematicRecommendations(
      context.searchHistory,
      Math.ceil(limit * diversity)
    );
    recommendations.push(...thematic);
  }
  
  // 3. Complementary recommendations
  if (context.viewedAyahIds?.length) {
    const complementary = await getComplementaryRecommendations(
      context.viewedAyahIds,
      limit
    );
    recommendations.push(...complementary);
  }
  
  // 4. Time-based recommendations
  if (context.timeOfDay && recommendations.length < limit) {
    const timeBased = await getTimeBasedRecommendations(
      context.timeOfDay,
      limit - recommendations.length
    );
    recommendations.push(...timeBased);
  }
  
  // Deduplicate and sort by score
  const unique = new Map<number, Recommendation>();
  recommendations.forEach(rec => {
    if (!unique.has(rec.ayahId) || unique.get(rec.ayahId)!.score < rec.score) {
      unique.set(rec.ayahId, rec);
    }
  });
  
  return Array.from(unique.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get similar ayah recommendations
 */
async function getSimilarAyahRecommendations(
  ayahId: number,
  limit: number
): Promise<Recommendation[]> {
  try {
    const embeddingResult = await getAyahEmbedding(ayahId);
    const similar = await findSimilarAyahs(embeddingResult.embedding, {
      limit: limit + 1,
      threshold: 0.7,
      excludeAyahId: ayahId,
    });
    
    const ayah = await db.ayah.findUnique({
      where: { id: ayahId },
      include: { Surah: true },
    });
    
    return similar.map(s => ({
      ayahId: s.ayahId,
      surahId: s.surahId,
      surahName: s.surah,
      ayahNumber: s.ayahNumber,
      text: s.textArabic,
      score: s.similarity,
      reason: `مشابهة للآية ${ayah?.Surah?.nameArabic} (${ayah?.surahId}:${ayah?.ayahNumber})`,
      type: 'similar' as const,
    }));
  } catch (error) {
    console.error('[Recommendations] Error getting similar ayahs:', error);
    return [];
  }
}

/**
 * Get thematic recommendations based on search history
 */
async function getThematicRecommendations(
  searchHistory: string[],
  limit: number
): Promise<Recommendation[]> {
  if (searchHistory.length === 0) return [];
  
  // Get themes from recent searches
  const recentSearches = searchHistory.slice(-5);
  const allThemes: string[] = [];
  
  for (const search of recentSearches) {
    try {
      const themes = await generateSimilarThemes(search);
      allThemes.push(...themes);
    } catch {
      // Skip if theme generation fails
    }
  }
  
  // Find ayahs matching themes
  const uniqueThemes = [...new Set(allThemes)].slice(0, 5);
  
  if (uniqueThemes.length === 0) return [];
  
  const ayahs = await db.ayah.findMany({
    where: {
      OR: uniqueThemes.map(theme => ({
        textArabic: { contains: theme },
      })),
    },
    take: limit * 2,
    include: { Surah: true },
  });
  
  return ayahs.slice(0, limit).map((ayah, index) => ({
    ayahId: ayah.id,
    surahId: ayah.surahId,
    surahName: ayah.Surah?.nameArabic || '',
    ayahNumber: ayah.ayahNumber,
    text: ayah.textArabic,
    score: 0.7 - (index * 0.1),
    reason: `يتعلق بموضوعات: ${uniqueThemes.slice(0, 2).join('، ')}`,
    type: 'thematic' as const,
  }));
}

/**
 * Get complementary recommendations (ayurvedic approach)
 */
async function getComplementaryRecommendations(
  viewedAyahIds: number[],
  limit: number
): Promise<Recommendation[]> {
  if (viewedAyahIds.length === 0) return [];
  
  // Get embeddings for viewed ayahs
  const embeddings = await Promise.all(
    viewedAyahIds.slice(-3).map(id => getAyahEmbedding(id))
  );
  
  // Calculate average embedding
  const avgEmbedding: number[] = [];
  const dimensions = 1536;
  
  for (let i = 0; i < dimensions; i++) {
    const sum = embeddings.reduce((acc, e) => acc + e.embedding[i], 0);
    avgEmbedding.push(sum / embeddings.length);
  }
  
  // Find similar ayahs to average embedding
  const similar = await findSimilarAyahs(avgEmbedding, {
    limit: limit + viewedAyahIds.length,
    threshold: 0.6,
  });
  
  // Filter out already viewed
  const viewedSet = new Set(viewedAyahIds);
  const filtered = similar.filter(s => !viewedSet.has(s.ayahId));
  
  return filtered.slice(0, limit).map(s => ({
    ayahId: s.ayahId,
    surahId: s.surahId,
    surahName: s.surah,
    ayahNumber: s.ayahNumber,
    text: s.textArabic,
    score: s.similarity * 0.8,
    reason: 'مكملة للآيات التي شاهدتها',
    type: 'complementary' as const,
  }));
}

/**
 * Get time-based recommendations
 */
async function getTimeBasedRecommendations(
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night',
  limit: number
): Promise<Recommendation[]> {
  const timeThemes: Record<string, string[]> = {
    morning: ['الصبح', 'الضحى', 'الذكر', 'الشكر'],
    afternoon: ['الظهر', 'العمل', 'الصبر'],
    evening: ['العصر', 'المغرب', 'التأمل'],
    night: ['الليل', 'القيام', 'التهجد', 'الاستغفار'],
  };
  
  const themes = timeThemes[timeOfDay] || timeThemes.morning;
  
  const ayahs = await db.ayah.findMany({
    where: {
      OR: themes.map(theme => ({
        textArabic: { contains: theme },
      })),
    },
    take: limit * 2,
    include: { Surah: true },
  });
  
  const timeDescriptions: Record<string, string> = {
    morning: 'مناسبة للصباح',
    afternoon: 'مناسبة للظهيرة',
    evening: 'مناسبة للمساء',
    night: 'مناسبة لليل',
  };
  
  return ayahs.slice(0, limit).map((ayah, index) => ({
    ayahId: ayah.id,
    surahId: ayah.surahId,
    surahName: ayah.Surah?.nameArabic || '',
    ayahNumber: ayah.ayahNumber,
    text: ayah.textArabic,
    score: 0.6 - (index * 0.1),
    reason: timeDescriptions[timeOfDay],
    type: 'thematic' as const,
  }));
}

/**
 * Get sequential recommendations (next/previous ayahs)
 */
export async function getSequentialRecommendations(
  currentAyahId: number,
  limit: number = 3
): Promise<Recommendation[]> {
  const current = await db.ayah.findUnique({
    where: { id: currentAyahId },
    include: { Surah: true },
  });
  
  if (!current) return [];
  
  const recommendations: Recommendation[] = [];
  
  // Get next ayahs in surah
  const nextAyahs = await db.ayah.findMany({
    where: {
      surahId: current.surahId,
      ayahNumber: { gt: current.ayahNumber },
    },
    orderBy: { ayahNumber: 'asc' },
    take: limit,
    include: { Surah: true },
  });
  
  nextAyahs.forEach((ayah, index) => ({
    ayahId: ayah.id,
    surahId: ayah.surahId,
    surahName: ayah.Surah?.nameArabic || '',
    ayahNumber: ayah.ayahNumber,
    text: ayah.textArabic,
    score: 0.9 - (index * 0.1),
    reason: 'الآية التالية في السورة',
    type: 'sequential' as const,
  }));
  
  return recommendations;
}

/**
 * Get personalized recommendations for a user
 */
export async function getPersonalizedRecommendations(
  userId: string,
  limit: number = 5
): Promise<Recommendation[]> {
  // Get user's bookmarks and reading history
  const [bookmarks, history] = await Promise.all([
    db.bookmark.findMany({
      where: { userId },
      select: { ayahId: true },
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
    db.readingHistory.findMany({
      where: { userId },
      select: { ayahId: true },
      take: 20,
      orderBy: { lastRead: 'desc' },
    }),
  ]);
  
  const viewedAyahIds = [
    ...bookmarks.map(b => b.ayahId),
    ...history.map(h => b.ayahId),
  ];
  
  return getRecommendations(
    { viewedAyahIds },
    { limit, diversity: 0.4 }
  );
}

// Export all functions
export default {
  getRecommendations,
  getSequentialRecommendations,
  getPersonalizedRecommendations,
};
