import { NextRequest, NextResponse } from 'next/server';
import { recommendationsApi } from '@/lib/ai-service-client';

/**
 * GET /api/ai/recommendations
 * 
 * Get ayah recommendations based on current ayah
 * 
 * Query params:
 * - ayahId: number
 * - limit?: number
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ayahId = searchParams.get('ayahId');
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 5;
  
  if (!ayahId) {
    return NextResponse.json({
      success: false,
      error: 'ayahId is required',
    }, { status: 400 });
  }
  
  try {
    const result = await recommendationsApi.getRecommendations(parseInt(ayahId), { limit });
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API] Recommendations error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get recommendations',
    }, { status: 500 });
  }
}

/**
 * POST /api/ai/recommendations/personalized
 * 
 * Get personalized recommendations for a user
 * 
 * Body:
 * - userId: string
 * - limit?: number
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, limit } = body;
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId is required',
      }, { status: 400 });
    }
    
    const result = await recommendationsApi.getPersonalized(userId, { limit });
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API] Personalized recommendations error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get personalized recommendations',
    }, { status: 500 });
  }
}

/**
 * PUT /api/ai/recommendations/sequential
 * 
 * Get sequential recommendations (next ayahs to read)
 * 
 * Body:
 * - surahId: number
 * - ayahNumber: number
 * - limit?: number
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { surahId, ayahNumber, limit } = body;
    
    if (!surahId || !ayahNumber) {
      return NextResponse.json({
        success: false,
        error: 'surahId and ayahNumber are required',
      }, { status: 400 });
    }
    
    const result = await recommendationsApi.getSequential(surahId, ayahNumber, { limit });
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API] Sequential recommendations error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get sequential recommendations',
    }, { status: 500 });
  }
}
