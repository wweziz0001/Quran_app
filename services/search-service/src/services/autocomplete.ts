/**
 * Autocomplete Service
 * 
 * Provides fast autocomplete suggestions for Quran search.
 * Uses edge n-grams and prefix matching.
 * 
 * @module autocomplete
 */

import {
  removeDiacritics,
  normalizeForSearch,
  generateEdgeNgrams,
  tokenize,
} from './arabic-normalizer';
import { search as esSearch, INDICES } from './elasticsearch';
import { db } from '../../shared/db';

// Types
export interface AutocompleteSuggestion {
  id: number;
  text: string;
  normalizedText: string;
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  type: 'ayah' | 'surah' | 'topic' | 'root';
  score: number;
}

export interface AutocompleteOptions {
  prefix: string;
  size?: number;
  types?: ('ayah' | 'surah' | 'topic' | 'root')[];
  surahId?: number;
  fuzzy?: boolean;
}

// Cache for frequently searched prefixes
const suggestionCache = new Map<string, AutocompleteSuggestion[]>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cacheTimers = new Map<string, NodeJS.Timeout>();

/**
 * Get autocomplete suggestions
 */
export async function getAutocomplete(
  options: AutocompleteOptions
): Promise<AutocompleteSuggestion[]> {
  const { prefix, size = 10, types = ['ayah', 'surah'], surahId, fuzzy = true } = options;

  if (prefix.length < 2) {
    return [];
  }

  const normalizedPrefix = normalizeForSearch(prefix);
  const cacheKey = `${normalizedPrefix}:${types.join(',')}:${surahId || 'all'}`;

  // Check cache
  const cached = suggestionCache.get(cacheKey);
  if (cached) {
    return cached.slice(0, size);
  }

  try {
    // Try Elasticsearch first
    const suggestions = await getAutocompleteFromES({
      prefix: normalizedPrefix,
      size,
      types,
      surahId,
      fuzzy,
    });

    // Cache the results
    setCache(cacheKey, suggestions);

    return suggestions;
  } catch (error) {
    console.error('Elasticsearch autocomplete failed:', error);

    // Fallback to database
    return getAutocompleteFromDB({
      prefix: normalizedPrefix,
      size,
      types,
      surahId,
    });
  }
}

/**
 * Elasticsearch autocomplete
 */
async function getAutocompleteFromES(
  options: AutocompleteOptions
): Promise<AutocompleteSuggestion[]> {
  const { prefix, size = 10, types, surahId, fuzzy } = options;

  const suggestions: AutocompleteSuggestion[] = [];

  // Build query
  const should: Record<string, unknown>[] = [];

  if (types.includes('ayah')) {
    should.push({
      match: {
        'textArabic.autocomplete': {
          query: prefix,
          ...(fuzzy && { fuzziness: 'AUTO' }),
        },
      },
    });

    should.push({
      match_phrase_prefix: {
        textArabic: {
          query: prefix,
        },
      },
    });
  }

  if (types.includes('surah')) {
    should.push({
      match_phrase_prefix: {
        surahNameArabic: {
          query: prefix,
        },
      },
    });
  }

  if (types.includes('root')) {
    should.push({
      prefix: {
        roots: prefix,
      },
    });
  }

  // Build filter
  const filter: Record<string, unknown>[] = [];
  if (surahId) {
    filter.push({ term: { surahId } });
  }

  const searchBody = {
    query: {
      bool: {
        should,
        minimum_should_match: 1,
        filter: filter.length > 0 ? filter : undefined,
      },
    },
    _source: [
      'id',
      'textArabic',
      'surahId',
      'surahNumber',
      'surahNameArabic',
      'ayahNumber',
      'roots',
    ],
    size,
  };

  const response = await fetch(`${process.env.ELASTICSEARCH_URL || 'http://localhost:9200'}/${INDICES.QURAN_AYAHS}/_search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(searchBody),
  });

  if (!response.ok) {
    throw new Error('Elasticsearch search failed');
  }

  const result = await response.json();

  // Process results
  for (const hit of result.hits.hits) {
    const source = hit._source;

    suggestions.push({
      id: source.id,
      text: source.textArabic?.substring(0, 100) || '',
      normalizedText: normalizeForSearch(source.textArabic || ''),
      surahNumber: source.surahNumber || 0,
      ayahNumber: source.ayahNumber || 0,
      surahName: source.surahNameArabic || '',
      type: 'ayah',
      score: hit._score,
    });
  }

  // Sort by score
  suggestions.sort((a, b) => b.score - a.score);

  return suggestions.slice(0, size);
}

/**
 * Database fallback autocomplete
 */
async function getAutocompleteFromDB(
  options: AutocompleteOptions
): Promise<AutocompleteSuggestion[]> {
  const { prefix, size = 10, types, surahId } = options;
  const suggestions: AutocompleteSuggestion[] = [];

  // Search ayahs
  if (types.includes('ayah')) {
    const where: Record<string, unknown> = {
      OR: [
        { textArabic: { startsWith: prefix } },
        { textArabic: { contains: prefix } },
      ],
    };

    if (surahId) {
      where.surahId = surahId;
    }

    const ayahs = await db.ayah.findMany({
      where,
      take: size,
      include: {
        Surah: {
          select: {
            number: true,
            nameArabic: true,
          },
        },
      },
    });

    for (const ayah of ayahs) {
      suggestions.push({
        id: ayah.id,
        text: ayah.textArabic.substring(0, 100),
        normalizedText: normalizeForSearch(ayah.textArabic),
        surahNumber: ayah.Surah?.number || 0,
        ayahNumber: ayah.ayahNumber,
        surahName: ayah.Surah?.nameArabic || '',
        type: 'ayah',
        score: 1,
      });
    }
  }

  // Search surahs
  if (types.includes('surah') && suggestions.length < size) {
    const surahs = await db.surah.findMany({
      where: {
        OR: [
          { nameArabic: { startsWith: prefix } },
          { nameArabic: { contains: prefix } },
          { nameEnglish: { startsWith: prefix } },
        ],
      },
      take: size - suggestions.length,
    });

    for (const surah of surahs) {
      suggestions.push({
        id: surah.id,
        text: surah.nameArabic,
        normalizedText: normalizeForSearch(surah.nameArabic),
        surahNumber: surah.number,
        ayahNumber: 0,
        surahName: surah.nameArabic,
        type: 'surah',
        score: 0.9,
      });
    }
  }

  return suggestions.slice(0, size);
}

/**
 * Set cache with TTL
 */
function setCache(key: string, value: AutocompleteSuggestion[]): void {
  // Clear existing timer
  const existingTimer = cacheTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set cache
  suggestionCache.set(key, value);

  // Set TTL timer
  const timer = setTimeout(() => {
    suggestionCache.delete(key);
    cacheTimers.delete(key);
  }, CACHE_TTL);

  cacheTimers.set(key, timer);
}

/**
 * Clear all caches
 */
export function clearCache(): void {
  for (const timer of cacheTimers.values()) {
    clearTimeout(timer);
  }
  suggestionCache.clear();
  cacheTimers.clear();
}

/**
 * Get popular completions for a prefix
 */
export async function getPopularCompletions(prefix: string): Promise<string[]> {
  // TODO: Implement based on search history analytics
  // For now, return common Quranic phrases
  const commonPhrases = [
    'بسم الله الرحمن الرحيم',
    'الحمد لله رب العالمين',
    'قل هو الله أحد',
    'قل أعوذ برب الفلق',
    'قل أعوذ برب الناس',
    'لا إله إلا الله',
    'الله أكبر',
    'سبحان الله',
    'أستغفر الله',
  ];

  const normalizedPrefix = normalizeForSearch(prefix);
  return commonPhrases
    .filter((phrase) => normalizeForSearch(phrase).startsWith(normalizedPrefix))
    .slice(0, 5);
}

/**
 * Get word suggestions (for typo correction)
 */
export async function getWordSuggestions(
  word: string,
  maxDistance: number = 2
): Promise<string[]> {
  // TODO: Implement using Elasticsearch fuzzy matching or a spell checker
  // For now, return the word as-is
  return [word];
}

/**
 * Group suggestions by type
 */
export function groupByType(
  suggestions: AutocompleteSuggestion[]
): Record<string, AutocompleteSuggestion[]> {
  return suggestions.reduce(
    (acc, suggestion) => {
      const type = suggestion.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(suggestion);
      return acc;
    },
    {} as Record<string, AutocompleteSuggestion[]>
  );
}

// Export all functions as default
export default {
  getAutocomplete,
  clearCache,
  getPopularCompletions,
  getWordSuggestions,
  groupByType,
};
