import { NextRequest, NextResponse } from 'next/server';
import {
  getRecommendations,
  getSequentialRecommendations,
  getPersonalizedRecommendations,
} from '@/services/ai/recommendations';

/**
 * POST /api/ai/recommendations
 * 
 * Get AI-powered ayah recommendations
 * 
 * Body:
 * - type: 'contextual' | 'sequential' | 'personalized'
 * - context?: RecommendationContext
 * - ayahId?: number (for sequential)
 * - userId?: string (for personalized)
 * - options?: { limit?: number, diversity?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type = 'contextual',
      context = {},
      ayahId,
      userId,
      options = {},
    } = body;
    
    let result;
    
    switch (type) {
      case 'contextual':
        result = await getRecommendations(context, {
          limit: options.limit || 5,
          diversity: options.diversity || 0.3,
        });
        break;
        
      case 'sequential':
        if (!ayahId) {
          return NextResponse.json({
            success: false,
            error: 'ayahId is required for sequential recommendations',
          }, { status: 400 });
        }
        
        result = await getSequentialRecommendations(ayahId, options.limit || 3);
        break;
        
      case 'personalized':
        if (!userId) {
          return NextResponse.json({
            success: false,
            error: 'userId is required for personalized recommendations',
          }, { status: 400 });
        }
        
        result = await getPersonalizedRecommendations(userId, options.limit || 5);
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid type. Use: contextual, sequential, or personalized',
        }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        type,
        count: result.length,
      },
    });
    
  } catch (error) {
    console.error('[API] Recommendations error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get recommendations',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET /api/ai/recommendations
 * 
 * Get recommendations based on current ayah
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ayahId = searchParams.get('ayahId');
  const limit = parseInt(searchParams.get('limit') || '5');
  const type = searchParams.get('type') || 'similar';
  
  if (!ayahId) {
    return NextResponse.json({
      success: false,
      error: 'ayahId is required',
    }, { status: 400 });
  }
  
  try {
    let result;
    
    if (type === 'sequential') {
      result = await getSequentialRecommendations(parseInt(ayahId), limit);
    } else {
      result = await getRecommendations(
        { currentAyahId: parseInt(ayahId) },
        { limit }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result,
    });
    
  } catch (error) {
    console.error('[API] Recommendations error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get recommendations',
    }, { status: 500 });
  }
}
