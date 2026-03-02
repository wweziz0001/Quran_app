import { NextRequest, NextResponse } from 'next/server';
import { searchApi } from '@/lib/search-service-client';
import { normalizeForSearch } from '@/lib/arabic-normalizer';

/**
 * GET /api/search/suggest
 * 
 * Autocomplete suggestions endpoint
 * 
 * Query Parameters:
 * - q: Search prefix (required, min 2 chars)
 * - surahId: Filter by surah (optional)
 * - limit: Number of suggestions (default: 10)
 * - type: 'full' or 'simple' (default: 'full')
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const prefix = searchParams.get('q') || searchParams.get('prefix');
  const surahId = searchParams.get('surahId');
  const limit = parseInt(searchParams.get('limit') || '10');
  const type = searchParams.get('type') || 'full';

  // Validate input
  if (!prefix || prefix.length < 2) {
    return NextResponse.json({
      success: true,
      data: [],
      meta: {
        message: 'Prefix must be at least 2 characters',
      },
    });
  }

  try {
    const result = await searchApi.autocomplete(prefix, {
      surahId: surahId ? parseInt(surahId) : undefined,
      limit,
    });

    if (!result.success || !result.data) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: {
          prefix,
          error: 'Suggestions not available',
          fallback: true,
        },
      });
    }

    const suggestions = result.data;

    // Transform based on type
    const data = type === 'simple'
      ? suggestions.map(s => s.text)
      : suggestions;

    return NextResponse.json({
      success: true,
      data,
      meta: {
        prefix,
        normalizedPrefix: normalizeForSearch(prefix),
        count: suggestions.length,
        type,
      },
    });
  } catch (error) {
    console.error('Suggestion error:', error);

    return NextResponse.json({
      success: true,
      data: [],
      meta: {
        prefix,
        error: 'Suggestions not available',
        fallback: true,
      },
    });
  }
}

/**
 * POST /api/search/suggest
 * 
 * Batch autocomplete suggestions
 * 
 * Body:
 * - prefixes: string[] (array of prefixes to get suggestions for)
 * - limit: Number of suggestions per prefix (default: 5)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prefixes, limit = 5 } = body;

    if (!Array.isArray(prefixes) || prefixes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'prefixes array is required',
      }, { status: 400 });
    }

    // Limit batch size
    const batchLimit = 10;
    const limitedPrefixes = prefixes.slice(0, batchLimit);

    // Get suggestions for all prefixes
    const results = await Promise.all(
      limitedPrefixes.map(async (prefix: string) => {
        if (prefix.length < 2) {
          return { prefix, suggestions: [] };
        }

        const result = await searchApi.autocomplete(prefix, { limit });
        return { prefix, suggestions: result.success ? result.data || [] : [] };
      })
    );

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        totalPrefixes: results.length,
        limit,
      },
    });
  } catch (error) {
    console.error('Batch suggestion error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to get suggestions',
    }, { status: 500 });
  }
}
