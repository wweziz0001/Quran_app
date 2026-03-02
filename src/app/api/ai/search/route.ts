import { NextRequest, NextResponse } from 'next/server';
import {
  semanticSearch,
  hybridSearch,
  findRelatedAyahs,
  searchByTheme,
} from '@/services/ai/semantic-search';

/**
 * POST /api/ai/search
 * 
 * Perform AI-powered semantic search
 * 
 * Body:
 * - query: string (required)
 * - type: 'semantic' | 'hybrid' | 'theme' | 'related' (default: 'semantic')
 * - limit?: number
 * - threshold?: number
 * - surahId?: number
 * - juz?: number
 * - ayahId?: number (for 'related' type)
 * - theme?: string (for 'theme' type)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      type = 'semantic',
      limit = 10,
      threshold = 0.5,
      surahId,
      juz,
      ayahId,
      theme,
    } = body;
    
    let results;
    
    switch (type) {
      case 'semantic':
        if (!query) {
          return NextResponse.json({
            success: false,
            error: 'Query is required for semantic search',
          }, { status: 400 });
        }
        
        results = await semanticSearch(query, {
          limit,
          threshold,
          surahId,
          juz,
          includeTranslation: true,
          includeTafsir: true,
        });
        break;
        
      case 'hybrid':
        if (!query) {
          return NextResponse.json({
            success: false,
            error: 'Query is required for hybrid search',
          }, { status: 400 });
        }
        
        results = await hybridSearch(query, {
          limit,
          surahId,
          juz,
        });
        break;
        
      case 'related':
        if (!ayahId) {
          return NextResponse.json({
            success: false,
            error: 'ayahId is required for related search',
          }, { status: 400 });
        }
        
        results = await findRelatedAyahs(ayahId, {
          limit,
          threshold,
        });
        break;
        
      case 'theme':
        const searchTheme = theme || query;
        if (!searchTheme) {
          return NextResponse.json({
            success: false,
            error: 'theme or query is required for theme search',
          }, { status: 400 });
        }
        
        results = await searchByTheme(searchTheme, {
          limit,
          threshold,
        });
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid search type. Use: semantic, hybrid, related, or theme',
        }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        query,
        type,
        count: results.length,
      },
    });
    
  } catch (error) {
    console.error('[API] AI search error:', error);
    return NextResponse.json({
      success: false,
      error: 'Search failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET /api/ai/search
 * 
 * Quick search via query parameters
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const type = searchParams.get('type') || 'semantic';
  const limit = parseInt(searchParams.get('limit') || '10');
  const surahId = searchParams.get('surahId') ? parseInt(searchParams.get('surahId')!) : undefined;
  const juz = searchParams.get('juz') ? parseInt(searchParams.get('juz')!) : undefined;
  
  if (!query) {
    return NextResponse.json({
      success: false,
      error: 'Query parameter "q" is required',
    }, { status: 400 });
  }
  
  try {
    let results;
    
    if (type === 'hybrid') {
      results = await hybridSearch(query, { limit, surahId, juz });
    } else {
      results = await semanticSearch(query, {
        limit,
        surahId,
        juz,
        includeTranslation: true,
      });
    }
    
    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        query,
        type,
        count: results.length,
      },
    });
    
  } catch (error) {
    console.error('[API] AI search error:', error);
    return NextResponse.json({
      success: false,
      error: 'Search failed',
    }, { status: 500 });
  }
}
