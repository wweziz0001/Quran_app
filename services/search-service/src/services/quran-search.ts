/**
 * Search Service
 * 
 * High-level search operations for the Quran application.
 * Combines Elasticsearch with database operations.
 * 
 * @module search-service
 */

import { db } from '../../shared/db';
import {
  search as esSearch,
  autocomplete as esAutocomplete,
  getDocument,
  type SearchOptions,
  type SearchResult,
  type QuranDocument,
} from './elasticsearch';
import {
  normalizeForSearch,
  removeDiacritics,
  tokenize,
  highlightMatch,
  parseReference,
} from './arabic-normalizer';

// Types
export interface SearchParams {
  query: string;
  type?: 'text' | 'semantic' | 'hybrid' | 'reference';
  surahId?: number;
  juzNumber?: number;
  hizbNumber?: number;
  pageNumber?: number;
  page?: number;
  limit?: number;
  fuzzy?: boolean;
  highlight?: boolean;
  includeTranslations?: boolean;
  includeTafsir?: boolean;
}

export interface SearchResponse {
  success: boolean;
  data: SearchResultItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta: {
    query: string;
    normalizedQuery: string;
    type: string;
    took: number;
    fallback?: boolean;
  };
}

export interface SearchResultItem {
  id: number;
  surahId: number;
  surahNumber: number;
  surahNameArabic: string;
  surahNameEnglish: string;
  ayahNumber: number;
  ayahNumberGlobal: number;
  textArabic: string;
  textUthmani: string | null;
  pageNumber: number | null;
  juzNumber: number | null;
  hizbNumber: number | null;
  sajdah: boolean;
  score?: number;
  highlighted?: string;
  translation?: {
    text: string;
    source: string;
  };
  tafsir?: {
    text: string;
    source: string;
  };
}

/**
 * Main search function
 */
export async function searchAyahs(params: SearchParams): Promise<SearchResponse> {
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
  } = params;

  // Check for reference search (e.g., "2:255")
  const reference = parseReference(query);
  if (reference && type !== 'semantic') {
    return searchByReference(reference, { includeTranslations, includeTafsir });
  }

  const normalizedQuery = normalizeForSearch(query);

  try {
    // Try Elasticsearch search
    const searchOptions: SearchOptions = {
      query,
      filters: {
        surahId,
        juzNumber,
        hizbNumber,
        pageNumber,
      },
      from: (page - 1) * limit,
      size: limit,
      fuzzy,
      highlight,
    };

    const result = await esSearch(searchOptions);

    // Transform results
    const items: SearchResultItem[] = await Promise.all(
      result.hits.map(async (hit) => {
        const item: SearchResultItem = {
          id: hit.id,
          surahId: hit.surahId,
          surahNumber: hit.surahNumber || 0,
          surahNameArabic: hit.surahNameArabic || '',
          surahNameEnglish: hit.surahName || '',
          ayahNumber: hit.ayahNumber,
          ayahNumberGlobal: hit.ayahNumberGlobal,
          textArabic: hit.textArabic,
          textUthmani: hit.textUthmani || null,
          pageNumber: hit.pageNumber || null,
          juzNumber: hit.juzNumber || null,
          hizbNumber: hit.hizbNumber || null,
          sajdah: hit.sajdah || false,
          score: hit.score,
          highlighted: hit.highlight?.textArabic?.[0],
        };

        // Add translation if requested
        if (includeTranslations && hit.translation) {
          item.translation = {
            text: hit.translation,
            source: hit.translationSource || '',
          };
        }

        // Add tafsir if requested
        if (includeTafsir && hit.tafsirText) {
          item.tafsir = {
            text: hit.tafsirText,
            source: hit.tafsirSource || '',
          };
        }

        return item;
      })
    );

    return {
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
      meta: {
        query,
        normalizedQuery,
        type,
        took: result.took,
      },
    };
  } catch (error) {
    console.error('Elasticsearch search failed, falling back to database:', error);

    // Fallback to database search
    return searchFromDatabase(params);
  }
}

/**
 * Search by reference (e.g., "2:255")
 */
async function searchByReference(
  reference: { surah: number | string; ayah: number },
  options: { includeTranslations?: boolean; includeTafsir?: boolean }
): Promise<SearchResponse> {
  let surahId: number;

  if (typeof reference.surah === 'number') {
    surahId = reference.surah;
  } else {
    // Search by surah name
    const surah = await db.surah.findFirst({
      where: {
        OR: [
          { nameArabic: { contains: reference.surah } },
          { nameEnglish: { contains: reference.surah } },
          { slug: reference.surah },
        ],
      },
    });
    if (!surah) {
      return {
        success: false,
        data: [],
        pagination: { page: 1, limit: 1, total: 0, totalPages: 0 },
        meta: {
          query: `${reference.surah}:${reference.ayah}`,
          normalizedQuery: '',
          type: 'reference',
          took: 0,
        },
      };
    }
    surahId = surah.id;
  }

  const ayah = await db.ayah.findFirst({
    where: {
      surahId,
      ayahNumber: reference.ayah,
    },
    include: {
      Surah: true,
    },
  });

  if (!ayah) {
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: 1, total: 0, totalPages: 0 },
      meta: {
        query: `${reference.surah}:${reference.ayah}`,
        normalizedQuery: '',
        type: 'reference',
        took: 0,
      },
    };
  }

  const item: SearchResultItem = {
    id: ayah.id,
    surahId: ayah.surahId,
    surahNumber: ayah.Surah?.number || 0,
    surahNameArabic: ayah.Surah?.nameArabic || '',
    surahNameEnglish: ayah.Surah?.nameEnglish || '',
    ayahNumber: ayah.ayahNumber,
    ayahNumberGlobal: ayah.ayahNumberGlobal,
    textArabic: ayah.textArabic,
    textUthmani: ayah.textUthmani,
    pageNumber: ayah.pageNumber,
    juzNumber: ayah.juzNumber,
    hizbNumber: ayah.hizbNumber,
    sajdah: ayah.sajdah,
  };

  return {
    success: true,
    data: [item],
    pagination: { page: 1, limit: 1, total: 1, totalPages: 1 },
    meta: {
      query: `${reference.surah}:${reference.ayah}`,
      normalizedQuery: '',
      type: 'reference',
      took: 0,
    },
  };
}

/**
 * Fallback database search
 */
async function searchFromDatabase(params: SearchParams): Promise<SearchResponse> {
  const {
    query,
    surahId,
    juzNumber,
    page = 1,
    limit = 20,
    includeTranslations = false,
    includeTafsir = false,
  } = params;

  const normalizedQuery = normalizeForSearch(query);
  const exactQuery = removeDiacritics(query);

  // Build where clause
  const where: Record<string, unknown> = {
    OR: [
      { textArabic: { contains: exactQuery } },
      { textUthmani: { contains: exactQuery } },
    ],
  };

  if (surahId) {
    where.surahId = surahId;
  }
  if (juzNumber) {
    where.juzNumber = juzNumber;
  }

  // Get total count
  const total = await db.ayah.count({ where });

  // Get results
  const ayahs = await db.ayah.findMany({
    where,
    orderBy: [{ surahId: 'asc' }, { ayahNumber: 'asc' }],
    skip: (page - 1) * limit,
    take: limit,
    include: {
      Surah: {
        select: {
          id: true,
          number: true,
          nameArabic: true,
          nameEnglish: true,
        },
      },
      ...(includeTranslations && {
        TranslationEntry: {
          where: { source: { languageCode: 'en-sahih' } },
          take: 1,
        },
      }),
      ...(includeTafsir && {
        TafsirEntry: {
          take: 1,
        },
      }),
    },
  });

  // Transform results
  const items: SearchResultItem[] = ayahs.map((ayah) => ({
    id: ayah.id,
    surahId: ayah.surahId,
    surahNumber: ayah.Surah?.number || 0,
    surahNameArabic: ayah.Surah?.nameArabic || '',
    surahNameEnglish: ayah.Surah?.nameEnglish || '',
    ayahNumber: ayah.ayahNumber,
    ayahNumberGlobal: ayah.ayahNumberGlobal,
    textArabic: ayah.textArabic,
    textUthmani: ayah.textUthmani,
    pageNumber: ayah.pageNumber,
    juzNumber: ayah.juzNumber,
    hizbNumber: ayah.hizbNumber,
    sajdah: ayah.sajdah,
    highlighted: highlightMatch(ayah.textArabic, exactQuery),
    ...(includeTranslations &&
      ayah.TranslationEntry?.[0] && {
        translation: {
          text: ayah.TranslationEntry[0].text,
          source: 'Sahih International',
        },
      }),
  }));

  return {
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    meta: {
      query,
      normalizedQuery,
      type: 'text',
      took: 0,
      fallback: true,
    },
  };
}

/**
 * Autocomplete suggestions
 */
export async function getAutocompleteSuggestions(
  prefix: string,
  options: { surahId?: number; limit?: number } = {}
): Promise<{ text: string; surah: string; reference: string }[]> {
  if (prefix.length < 2) {
    return [];
  }

  try {
    const suggestions = await esAutocomplete({
      prefix,
      size: options.limit || 10,
    });

    return suggestions.filter((s) => {
      if (options.surahId) {
        // Parse reference to get surah number
        const surahNum = parseInt(s.reference.split(':')[0]);
        return surahNum === options.surahId;
      }
      return true;
    });
  } catch (error) {
    console.error('Autocomplete failed, falling back to database:', error);
    return getAutocompleteFromDatabase(prefix, options);
  }
}

/**
 * Fallback autocomplete from database
 */
async function getAutocompleteFromDatabase(
  prefix: string,
  options: { surahId?: number; limit?: number } = {}
): Promise<{ text: string; surah: string; reference: string }[]> {
  const normalizedPrefix = removeDiacritics(prefix);

  const where: Record<string, unknown> = {
    OR: [
      { textArabic: { startsWith: normalizedPrefix } },
      { textArabic: { contains: normalizedPrefix } },
    ],
  };

  if (options.surahId) {
    where.surahId = options.surahId;
  }

  const ayahs = await db.ayah.findMany({
    where,
    take: options.limit || 10,
    include: {
      Surah: {
        select: {
          nameArabic: true,
          number: true,
        },
      },
    },
  });

  return ayahs.map((ayah) => ({
    text: ayah.textArabic.substring(0, 100) + '...',
    surah: ayah.Surah?.nameArabic || '',
    reference: `${ayah.Surah?.number}:${ayah.ayahNumber}`,
  }));
}

/**
 * Get popular search queries (placeholder for future implementation)
 */
export async function getPopularSearches(): Promise<string[]> {
  // TODO: Implement based on search history
  return [
    'بسم الله',
    'الحمد لله',
    'الله أكبر',
    'لا إله إلا الله',
    'قل هو الله أحد',
    'آية الكرسي',
    'يس',
    'الرحمن',
  ];
}

/**
 * Get related ayahs for a given ayah (placeholder)
 */
export async function getRelatedAyahs(ayahId: number): Promise<SearchResultItem[]> {
  // TODO: Implement based on topics, roots, or embeddings
  const ayah = await db.ayah.findUnique({
    where: { id: ayahId },
    include: { Surah: true },
  });

  if (!ayah) {
    return [];
  }

  // For now, return ayahs from the same surah
  const related = await db.ayah.findMany({
    where: {
      surahId: ayah.surahId,
      id: { not: ayahId },
    },
    take: 5,
    include: { Surah: true },
  });

  return related.map((a) => ({
    id: a.id,
    surahId: a.surahId,
    surahNumber: a.Surah?.number || 0,
    surahNameArabic: a.Surah?.nameArabic || '',
    surahNameEnglish: a.Surah?.nameEnglish || '',
    ayahNumber: a.ayahNumber,
    ayahNumberGlobal: a.ayahNumberGlobal,
    textArabic: a.textArabic,
    textUthmani: a.textUthmani,
    pageNumber: a.pageNumber,
    juzNumber: a.juzNumber,
    hizbNumber: a.hizbNumber,
    sajdah: a.sajdah,
  }));
}

// Export all functions as default
export default {
  searchAyahs,
  getAutocompleteSuggestions,
  getPopularSearches,
  getRelatedAyahs,
};
