import { NextRequest, NextResponse } from 'next/server';
import {
  removeDiacritics,
  normalizeForSearch,
  highlightMatch,
  parseReference,
} from '@/lib/arabic-normalizer';

// Service ports
const SEARCH_SERVICE_PORT = 3003;
const QURAN_SERVICE_PORT = 3001;
const TAFSIR_SERVICE_PORT = 3004;

// Types for search results
interface AyahResult {
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
  score: number;
  highlighted?: string;
}

interface SearchMeta {
  query: string;
  normalizedQuery: string;
  type: string;
  took: number;
  method: string;
  fallback?: boolean;
}

/**
 * GET /api/search
 *
 * Main search endpoint for Quran ayahs
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const surahId = searchParams.get('surahId');
    const juz = searchParams.get('juz');
    const highlight = searchParams.get('highlight') !== 'false';

    // Validate query
    if (!q || q.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Query must be at least 2 characters',
      }, { status: 400 });
    }

    // Check for reference search (e.g., "2:255" or "البقرة:255")
    const reference = parseReference(q);
    if (reference) {
      return handleReferenceSearch(reference, startTime);
    }

    // Normalize query for Arabic search
    const normalizedQuery = normalizeForSearch(q);
    const exactQuery = removeDiacritics(q);

    // Call search-service
    const searchParamsObj = new URLSearchParams({
      q,
      page: String(page),
      limit: String(limit),
      ...(surahId && { surahId }),
      ...(juz && { juzNumber: juz }),
      highlight: String(highlight),
    });

    const response = await fetch(`http://localhost:${SEARCH_SERVICE_PORT}/search?${searchParamsObj.toString()}`);
    const data = await response.json();

    if (!data.success) {
      // Fallback to direct quran-service search
      return handleFallbackSearch(q, page, limit, surahId, juz, highlight, startTime);
    }

    // Transform data to match expected format
    const ayahs = (data.data?.ayahs || data.data || []).map((ayah: {
      id: number;
      surahId: number;
      ayahNumber: number;
      ayahNumberGlobal: number;
      textArabic: string;
      textUthmani: string | null;
      pageNumber: number | null;
      juzNumber: number | null;
      hizbNumber: number | null;
      sajdah: boolean;
      Surah?: { number: number; nameArabic: string; nameEnglish: string };
      score?: number;
    }, index: number) => ({
      id: ayah.id,
      surahId: ayah.surahId,
      surahNumber: ayah.Surah?.number || 0,
      surahNameArabic: ayah.Surah?.nameArabic || '',
      surahNameEnglish: ayah.Surah?.nameEnglish || '',
      ayahNumber: ayah.ayahNumber,
      ayahNumberGlobal: ayah.ayahNumberGlobal,
      textArabic: ayah.textArabic || '',
      textUthmani: ayah.textUthmani,
      pageNumber: ayah.pageNumber,
      juzNumber: ayah.juzNumber,
      hizbNumber: ayah.hizbNumber,
      sajdah: ayah.sajdah,
      score: ayah.score || (1 - (index * 0.01)),
      highlighted: highlight
        ? highlightMatch(ayah.textArabic || '', exactQuery, '<mark>', '</mark>')
        : undefined,
    }));

    return NextResponse.json({
      success: true,
      data: { surahs: [], ayahs },
      pagination: data.pagination || {
        page,
        limit,
        total: ayahs.length,
        totalPages: Math.ceil(ayahs.length / limit),
      },
      meta: {
        query: q,
        normalizedQuery,
        type: 'all',
        took: Date.now() - startTime,
        method: 'search-service',
      } as SearchMeta,
    });
  } catch (error) {
    console.error('Search error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to perform search',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * Fallback search using quran-service directly
 */
async function handleFallbackSearch(
  q: string,
  page: number,
  limit: number,
  surahId: string | null,
  juz: string | null,
  highlight: boolean,
  startTime: number
): Promise<NextResponse> {
  const normalizedQuery = normalizeForSearch(q);
  const exactQuery = removeDiacritics(q);
  const searchTerms = normalizedQuery.split(/\s+/filter).filter(t => t.length > 0);

  // Get ayahs from quran-service
  const params = new URLSearchParams({ limit: '7000' });
  if (surahId) params.set('surahId', surahId);
  if (juz) params.set('juz', juz);

  const response = await fetch(`http://localhost:${QURAN_SERVICE_PORT}/ayahs?${params.toString()}`);
  const data = await response.json();

  if (!data.success) {
    return NextResponse.json({
      success: false,
      error: 'Failed to perform search',
    }, { status: 500 });
  }

  // Filter ayahs that match the normalized query
  const matchingAyahs = (data.data || []).filter((ayah: { textArabic: string; textUthmani: string | null }) => {
    const normalizedText = normalizeForSearch(ayah.textArabic || '');
    const normalizedUthmani = normalizeForSearch(ayah.textUthmani || '');

    return searchTerms.every(term =>
      normalizedText.includes(term) || normalizedUthmani.includes(term)
    );
  });

  const total = matchingAyahs.length;

  // Paginate results
  const paginatedAyahs = matchingAyahs.slice((page - 1) * limit, page * limit);

  // Transform results
  const ayahs: AyahResult[] = paginatedAyahs.map((ayah: {
    id: number;
    surahId: number;
    ayahNumber: number;
    ayahNumberGlobal: number;
    textArabic: string;
    textUthmani: string | null;
    pageNumber: number | null;
    juzNumber: number | null;
    hizbNumber: number | null;
    sajdah: boolean;
    Surah?: { number: number; nameArabic: string; nameEnglish: string };
  }, index: number) => ({
    id: ayah.id,
    surahId: ayah.surahId,
    surahNumber: ayah.Surah?.number || 0,
    surahNameArabic: ayah.Surah?.nameArabic || '',
    surahNameEnglish: ayah.Surah?.nameEnglish || '',
    ayahNumber: ayah.ayahNumber,
    ayahNumberGlobal: ayah.ayahNumberGlobal,
    textArabic: ayah.textArabic || '',
    textUthmani: ayah.textUthmani,
    pageNumber: ayah.pageNumber,
    juzNumber: ayah.juzNumber,
    hizbNumber: ayah.hizbNumber,
    sajdah: ayah.sajdah,
    score: 1 - (index * 0.01),
    highlighted: highlight
      ? highlightMatch(ayah.textArabic || '', exactQuery, '<mark>', '</mark>')
      : undefined,
  }));

  return NextResponse.json({
    success: true,
    data: { surahs: [], ayahs },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    meta: {
      query: q,
      normalizedQuery,
      type: 'all',
      took: Date.now() - startTime,
      method: 'quran-service-fallback',
      fallback: true,
    } as SearchMeta,
  });
}

/**
 * Handle reference search (e.g., "2:255" or "البقرة:255")
 */
async function handleReferenceSearch(
  reference: { surah: number | string; ayah: number },
  startTime: number
): Promise<NextResponse> {
  try {
    let surahNumber: number;

    if (typeof reference.surah === 'number') {
      surahNumber = reference.surah;
    } else {
      // Search by surah name using quran-service
      const surahsResponse = await fetch(`http://localhost:${QURAN_SERVICE_PORT}/surahs`);
      const surahsData = await surahsResponse.json();

      if (!surahsData.success) {
        return NextResponse.json({
          success: false,
          error: 'Failed to find surah',
        }, { status: 500 });
      }

      const surah = surahsData.data?.find((s: { nameArabic: string; nameEnglish: string }) =>
        s.nameArabic.includes(reference.surah) || s.nameEnglish.toLowerCase().includes(reference.surah.toLowerCase())
      );

      if (!surah) {
        return NextResponse.json({
          success: false,
          error: `Surah "${reference.surah}" not found`,
        }, { status: 404 });
      }
      surahNumber = surah.number;
    }

    // Get ayahs for this surah
    const ayahsResponse = await fetch(`http://localhost:${QURAN_SERVICE_PORT}/surahs/${surahNumber}/ayahs?limit=300`);
    const ayahsData = await ayahsResponse.json();

    if (!ayahsData.success) {
      return NextResponse.json({
        success: false,
        error: `Ayah ${reference.surah}:${reference.ayah} not found`,
      }, { status: 404 });
    }

    const ayah = ayahsData.data?.find((a: { ayahNumber: number }) => a.ayahNumber === reference.ayah);

    if (!ayah) {
      return NextResponse.json({
        success: false,
        error: `Ayah ${reference.surah}:${reference.ayah} not found`,
      }, { status: 404 });
    }

    // Get translation if available
    let translation = null;
    try {
      const translationResponse = await fetch(`http://localhost:${TAFSIR_SERVICE_PORT}/translations/ayah/${ayah.id}`);
      const translationData = await translationResponse.json();
      if (translationData.success && translationData.data?.length > 0) {
        translation = {
          text: translationData.data[0].text,
          source: translationData.data[0].TranslationSource?.name,
        };
      }
    } catch {
      // Translation not available
    }

    const result: AyahResult = {
      id: ayah.id,
      surahId: ayah.surahId,
      surahNumber: surahNumber,
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
      score: 1,
    };

    return NextResponse.json({
      success: true,
      data: {
        ayah: result,
        translation,
        tafsir: null,
      },
      meta: {
        query: `${reference.surah}:${reference.ayah}`,
        normalizedQuery: '',
        type: 'reference',
        took: Date.now() - startTime,
        method: 'reference',
      } as SearchMeta,
    });
  } catch (error) {
    console.error('Reference search error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform reference search',
    }, { status: 500 });
  }
}

/**
 * POST /api/search
 *
 * Semantic/AI-powered search endpoint
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const {
      query,
      limit = 20,
      includeTranslations = false,
      includeTafsir = false,
    } = body;

    // Validate query
    if (!query || query.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Query must be at least 2 characters',
      }, { status: 400 });
    }

    // Normalize query
    const normalizedQuery = normalizeForSearch(query);

    // Call search-service for semantic search
    const response = await fetch(`http://localhost:${SEARCH_SERVICE_PORT}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit, type: 'text' }),
    });

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json({
        success: false,
        error: data.error || 'Search failed',
      }, { status: 500 });
    }

    // Transform results
    const results = (data.data || []).map((ayah: {
      id: number;
      surahId: number;
      ayahNumber: number;
      ayahNumberGlobal: number;
      textArabic: string;
      textUthmani: string | null;
      pageNumber: number | null;
      juzNumber: number | null;
      hizbNumber: number | null;
      rubNumber: number | null;
      sajdah: boolean;
      Surah?: { id: number; number: number; nameArabic: string; nameEnglish: string };
    }) => ({
      verse: {
        id: String(ayah.id),
        surahId: ayah.surahId,
        numberInSurah: ayah.ayahNumber,
        numberGlobal: ayah.ayahNumberGlobal,
        textArabic: ayah.textArabic,
        textUthmani: ayah.textUthmani,
        pageNumber: ayah.pageNumber,
        juzNumber: ayah.juzNumber,
        hizbNumber: ayah.hizbNumber,
        rubNumber: ayah.rubNumber,
        sajdah: ayah.sajdah,
        surah: ayah.Surah,
      },
      score: 1.0,
      highlights: [],
    }));

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        query,
        normalizedQuery,
        type: 'semantic',
        took: Date.now() - startTime,
        method: 'search-service',
      },
    });
  } catch (error) {
    console.error('Semantic search error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to perform search',
    }, { status: 500 });
  }
}
