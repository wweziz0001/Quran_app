import { NextRequest, NextResponse } from 'next/server';
import { searchAyahs } from '@/services/search-service';
import { normalizeForSearch, removeDiacritics, tokenize } from '@/services/arabic-normalizer';

/**
 * GET /api/search/advanced
 * 
 * Advanced search with multiple filters and options
 * 
 * Query Parameters:
 * - q: Search query (required)
 * - type: 'text' | 'semantic' | 'hybrid' | 'reference' (default: 'text')
 * - surah: Surah ID(s), comma-separated for multiple
 * - juz: Juz number
 * - hizb: Hizb number
 * - page: Page number for pagination
 * - limit: Results per page (default: 20)
 * - fuzzy: Enable fuzzy matching (default: false)
 * - highlight: Enable highlighting (default: true)
 * - translations: Include translations (default: false)
 * - tafsir: Include tafsir (default: false)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const query = searchParams.get('q');
  const type = (searchParams.get('type') || 'text') as 'text' | 'semantic' | 'hybrid' | 'reference';
  const surah = searchParams.get('surah');
  const juz = searchParams.get('juz');
  const hizb = searchParams.get('hizb');
  const pageNumber = searchParams.get('page');
  const limit = searchParams.get('limit');
  const fuzzy = searchParams.get('fuzzy') === 'true';
  const highlight = searchParams.get('highlight') !== 'false';
  const includeTranslations = searchParams.get('translations') === 'true';
  const includeTafsir = searchParams.get('tafsir') === 'true';

  // Validate required params
  if (!query) {
    return NextResponse.json({
      success: false,
      error: 'Query parameter "q" is required',
    }, { status: 400 });
  }

  // Parse surah IDs (can be comma-separated)
  let surahId: number | number[] | undefined;
  if (surah) {
    const surahIds = surah.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    if (surahIds.length === 1) {
      surahId = surahIds[0];
    } else if (surahIds.length > 1) {
      surahId = surahIds;
    }
  }

  try {
    const result = await searchAyahs({
      query,
      type,
      surahId,
      juzNumber: juz ? parseInt(juz) : undefined,
      hizbNumber: hizb ? parseInt(hizb) : undefined,
      page: pageNumber ? parseInt(pageNumber) : 1,
      limit: limit ? parseInt(limit) : 20,
      fuzzy,
      highlight,
      includeTranslations,
      includeTafsir,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: {
        ...result.meta,
        filters: {
          surah: surahId,
          juz,
          hizb,
        },
        options: {
          fuzzy,
          highlight,
          includeTranslations,
          includeTafsir,
        },
      },
    });
  } catch (error) {
    console.error('Advanced search error:', error);

    return NextResponse.json({
      success: false,
      error: 'Search failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * POST /api/search/advanced
 * 
 * Advanced search with complex query body
 * 
 * Request Body:
 * - query: Search query string
 * - type: 'text' | 'semantic' | 'hybrid' | 'reference'
 * - filters: Object with filter criteria
 *   - surahId: number | number[]
 *   - juzNumber: number
 *   - hizbNumber: number
 *   - pageNumber: number
 *   - sajdah: boolean
 * - options: Object with search options
 *   - page: number
 *   - limit: number
 *   - fuzzy: boolean
 *   - highlight: boolean
 *   - includeTranslations: boolean
 *   - includeTafsir: boolean
 *   - sort: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      query,
      type = 'text',
      filters = {},
      options = {},
    } = body;

    // Validate required fields
    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Query is required',
      }, { status: 400 });
    }

    // Build search params
    const searchParams = {
      query,
      type,
      surahId: filters.surahId,
      juzNumber: filters.juzNumber,
      hizbNumber: filters.hizbNumber,
      pageNumber: filters.pageNumber,
      page: options.page || 1,
      limit: options.limit || 20,
      fuzzy: options.fuzzy || false,
      highlight: options.highlight !== false,
      includeTranslations: options.includeTranslations || false,
      includeTafsir: options.includeTafsir || false,
    };

    const result = await searchAyahs(searchParams);

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: {
        ...result.meta,
        filters,
        options,
      },
    });
  } catch (error) {
    console.error('Advanced search error:', error);

    return NextResponse.json({
      success: false,
      error: 'Search failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * OPTIONS /api/search/advanced
 * 
 * Return API documentation
 */
export async function OPTIONS() {
  return NextResponse.json({
    endpoints: {
      'GET /api/search/advanced': {
        description: 'Search with query parameters',
        parameters: {
          q: { type: 'string', required: true, description: 'Search query' },
          type: { type: 'string', enum: ['text', 'semantic', 'hybrid', 'reference'], default: 'text' },
          surah: { type: 'string', description: 'Surah ID(s), comma-separated' },
          juz: { type: 'number', description: 'Juz number' },
          hizb: { type: 'number', description: 'Hizb number' },
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20 },
          fuzzy: { type: 'boolean', default: false },
          highlight: { type: 'boolean', default: true },
          translations: { type: 'boolean', default: false },
          tafsir: { type: 'boolean', default: false },
        },
      },
      'POST /api/search/advanced': {
        description: 'Search with complex JSON body',
        body: {
          query: { type: 'string', required: true },
          type: { type: 'string', enum: ['text', 'semantic', 'hybrid', 'reference'] },
          filters: {
            type: 'object',
            properties: {
              surahId: { type: 'number | number[]' },
              juzNumber: { type: 'number' },
              hizbNumber: { type: 'number' },
              pageNumber: { type: 'number' },
              sajdah: { type: 'boolean' },
            },
          },
          options: {
            type: 'object',
            properties: {
              page: { type: 'number' },
              limit: { type: 'number' },
              fuzzy: { type: 'boolean' },
              highlight: { type: 'boolean' },
              includeTranslations: { type: 'boolean' },
              includeTafsir: { type: 'boolean' },
              sort: { type: 'string' },
            },
          },
        },
      },
    },
    examples: {
      searchByKeyword: '/api/search/advanced?q=بسم الله',
      searchWithFilters: '/api/search/advanced?q=الله&surah=1,2&juz=1',
      semanticSearch: '/api/search/advanced?q=mercy&type=semantic',
      referenceSearch: '/api/search/advanced?q=2:255&type=reference',
    },
  });
}
