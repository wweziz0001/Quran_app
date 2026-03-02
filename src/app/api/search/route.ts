import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  removeDiacritics,
  normalizeForSearch,
  normalizeArabic,
  tokenize,
  highlightMatch,
  parseReference,
} from '@/lib/arabic-normalizer';
import { Prisma } from '@prisma/client';

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
 * 
 * Query Parameters:
 * - q: Search query (required, min 2 characters)
 * - type: 'all' | 'surah' | 'ayah' (default: 'all')
 * - page: Page number for pagination (default: 1)
 * - limit: Results per page (default: 20)
 * - surahId: Filter by surah
 * - juz: Filter by juz
 * - highlight: Enable highlighting (default: true)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const type = searchParams.get('type') || 'all';
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

    // Use raw SQL for better Arabic search support
    // SQLite doesn't support advanced text search, so we use a multi-step approach
    
    // Build where clause using raw SQL for normalized search
    // We'll search using multiple conditions
    const searchTerms = normalizedQuery.split(/\s+/).filter(t => t.length > 0);
    
    // Get all ayahs and filter in memory (for small datasets this is acceptable)
    // For production with Elasticsearch, this would be handled by the search engine
    const allAyahs = await db.ayah.findMany({
      where: {
        ...(surahId && { surahId: parseInt(surahId) }),
        ...(juz && { juzNumber: parseInt(juz) }),
      },
      select: {
        id: true,
        surahId: true,
        ayahNumber: true,
        ayahNumberGlobal: true,
        textArabic: true,
        textUthmani: true,
        pageNumber: true,
        juzNumber: true,
        hizbNumber: true,
        sajdah: true,
      },
    });
    
    // Filter ayahs that match the normalized query
    const matchingAyahs = allAyahs.filter(ayah => {
      const normalizedText = normalizeForSearch(ayah.textArabic || '');
      const normalizedUthmani = normalizeForSearch(ayah.textUthmani || '');
      
      // Check if all search terms are found
      return searchTerms.every(term => 
        normalizedText.includes(term) || normalizedUthmani.includes(term)
      );
    });
    
    const total = matchingAyahs.length;
    
    // Paginate results
    const paginatedAyahs = matchingAyahs.slice((page - 1) * limit, page * limit);
    
    // Get surah info for the paginated results
    const surahIds = [...new Set(paginatedAyahs.map(a => a.surahId))];
    const surahs = await db.surah.findMany({
      where: { id: { in: surahIds } },
      select: { id: true, number: true, nameArabic: true, nameEnglish: true },
    });
    const surahMap = new Map(surahs.map(s => [s.id, s]));
    
    // Build results object
    const results: {
      surahs: unknown[];
      ayahs: AyahResult[];
    } = {
      surahs: [],
      ayahs: paginatedAyahs.map((ayah, index) => ({
        id: ayah.id,
        surahId: ayah.surahId,
        surahNumber: surahMap.get(ayah.surahId)?.number || 0,
        surahNameArabic: surahMap.get(ayah.surahId)?.nameArabic || '',
        surahNameEnglish: surahMap.get(ayah.surahId)?.nameEnglish || '',
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
      })),
    };

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      meta: {
        query: q,
        normalizedQuery,
        type,
        took: Date.now() - startTime,
        method: 'database-normalized',
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
 * Handle reference search (e.g., "2:255" or "البقرة:255")
 */
async function handleReferenceSearch(
  reference: { surah: number | string; ayah: number },
  startTime: number
): Promise<NextResponse> {
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
          { slug: reference.surah.replace(/\s+/g, '-') },
        ],
      },
    });

    if (!surah) {
      return NextResponse.json({
        success: false,
        error: `Surah "${reference.surah}" not found`,
      }, { status: 404 });
    }
    surahId = surah.id;
  }

  const ayah = await db.ayah.findFirst({
    where: {
      surahId,
      ayahNumber: reference.ayah,
    },
    include: {
      Surah: {
        select: {
          id: true,
          number: true,
          nameArabic: true,
          nameEnglish: true,
        },
      },
      TafsirEntry: {
        take: 1,
        include: {
          TafsirSource: {
            select: { name: true },
          },
        },
      },
      TranslationEntry: {
        where: {
          TranslationSource: { languageCode: 'en-sahih' },
        },
        take: 1,
        include: {
          TranslationSource: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!ayah) {
    return NextResponse.json({
      success: false,
      error: `Ayah ${reference.surah}:${reference.ayah} not found`,
    }, { status: 404 });
  }

  const result: AyahResult = {
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
    score: 1,
  };

  return NextResponse.json({
    success: true,
    data: {
      ayah: result,
      translation: ayah.TranslationEntry[0]
        ? {
            text: ayah.TranslationEntry[0].text,
            source: ayah.TranslationEntry[0].TranslationSource?.name,
          }
        : null,
      tafsir: ayah.TafsirEntry[0]
        ? {
            text: ayah.TafsirEntry[0].textArabic,
            source: ayah.TafsirEntry[0].TafsirSource?.name,
          }
        : null,
    },
    meta: {
      query: `${reference.surah}:${reference.ayah}`,
      normalizedQuery: '',
      type: 'reference',
      took: Date.now() - startTime,
      method: 'reference',
    } as SearchMeta,
  });
}

/**
 * POST /api/search
 * 
 * Semantic/AI-powered search endpoint
 * 
 * Request Body:
 * - query: Search query
 * - limit: Number of results (default: 20)
 * - includeTranslations: Include English translations (default: false)
 * - includeTafsir: Include tafsir (default: false)
 * - fuzzy: Enable fuzzy matching (default: false)
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
      fuzzy = false,
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
    const exactQuery = removeDiacritics(query);

    // Build search conditions
    const searchConditions = [
      { textArabic: { contains: exactQuery } },
      { textUthmani: { contains: exactQuery } },
    ];

    // Add fuzzy search conditions if enabled
    if (fuzzy && normalizedQuery !== exactQuery) {
      searchConditions.push(
        { textArabic: { contains: normalizedQuery } }
      );
    }

    // Search ayahs
    const ayahs = await db.ayah.findMany({
      where: {
        OR: searchConditions,
      },
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
            where: {
              TranslationSource: { languageCode: 'en-sahih' },
            },
            select: {
              text: true,
              TranslationSource: {
                select: { name: true, languageCode: true },
              },
            },
            take: 1,
          },
        }),
        ...(includeTafsir && {
          TafsirEntry: {
            select: {
              textArabic: true,
              TafsirSource: {
                select: { name: true },
              },
            },
            take: 1,
          },
        }),
      },
      take: limit,
    });

    // Transform results
    const results = ayahs.map((ayah) => ({
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
        translation: ayah.TranslationEntry?.[0]
          ? {
              text: ayah.TranslationEntry[0].text,
              source: ayah.TranslationEntry[0].TranslationSource,
            }
          : null,
        tafsir: ayah.TafsirEntry?.[0]
          ? {
              text: ayah.TafsirEntry[0].textArabic,
              source: ayah.TafsirEntry[0].TafsirSource,
            }
          : null,
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
        method: 'database',
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
