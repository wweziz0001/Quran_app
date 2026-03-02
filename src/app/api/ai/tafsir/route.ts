import { NextRequest, NextResponse } from 'next/server';
import {
  generateComprehensiveTafsir,
  compareTafsirSources,
  analyzeTheme,
  getDailyTafsir,
} from '@/services/ai/tafsir-ai';

/**
 * POST /api/ai/tafsir
 * 
 * AI-powered tafsir explanations
 * 
 * Body:
 * - action: 'explain' | 'compare' | 'theme' | 'daily'
 * - ayahId?: number
 * - ayahIds?: number[] (for compare)
 * - theme?: string
 * - options?: object
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action = 'explain', ayahId, ayahIds, theme, options = {} } = body;
    
    let result;
    
    switch (action) {
      case 'explain':
        if (!ayahId) {
          return NextResponse.json({
            success: false,
            error: 'ayahId is required for explain',
          }, { status: 400 });
        }
        
        result = await generateComprehensiveTafsir(ayahId, {
          language: options.language || 'ar',
          includeVocabulary: options.includeVocabulary !== false,
          includeHistory: options.includeHistory !== false,
          includeApplications: options.includeApplications !== false,
        });
        break;
        
      case 'compare':
        if (!ayahId) {
          return NextResponse.json({
            success: false,
            error: 'ayahId is required for compare',
          }, { status: 400 });
        }
        
        result = await compareTafsirSources(ayahId);
        break;
        
      case 'theme':
        if (!theme) {
          return NextResponse.json({
            success: false,
            error: 'theme is required for theme analysis',
          }, { status: 400 });
        }
        
        result = await analyzeTheme(theme, {
          limit: options.limit || 10,
        });
        break;
        
      case 'daily':
        result = await getDailyTafsir();
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: explain, compare, theme, or daily',
        }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        action,
        timestamp: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error('[API] Tafsir AI error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process tafsir request',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET /api/ai/tafsir
 * 
 * Quick tafsir explanation via query parameters
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ayahId = searchParams.get('ayahId');
  const action = searchParams.get('action') || 'explain';
  
  try {
    if (action === 'daily') {
      const result = await getDailyTafsir();
      return NextResponse.json({
        success: true,
        data: result,
      });
    }
    
    if (!ayahId) {
      return NextResponse.json({
        success: false,
        error: 'ayahId is required',
      }, { status: 400 });
    }
    
    const id = parseInt(ayahId);
    
    if (action === 'compare') {
      const result = await compareTafsirSources(id);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }
    
    // Default: explain
    const result = await generateComprehensiveTafsir(id);
    return NextResponse.json({
      success: true,
      data: result,
    });
    
  } catch (error) {
    console.error('[API] Tafsir AI error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get tafsir',
    }, { status: 500 });
  }
}
