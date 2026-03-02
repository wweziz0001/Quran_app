import { NextRequest, NextResponse } from 'next/server';
import { tafsirAiApi } from '@/lib/ai-service-client';

/**
 * POST /api/ai/tafsir
 * 
 * Generate AI-powered tafsir explanation for an ayah
 * 
 * Body:
 * - ayahId: number
 * - style?: 'brief' | 'detailed' | 'academic'
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ayahId, style } = body;
    
    if (!ayahId) {
      return NextResponse.json({
        success: false,
        error: 'ayahId is required',
      }, { status: 400 });
    }
    
    const result = await tafsirAiApi.generateTafsir(ayahId, { style });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API] Tafsir AI error:', error);
    return NextResponse.json({
      success: false,
      error: 'Tafsir generation failed',
    }, { status: 500 });
  }
}

/**
 * POST /api/ai/tafsir/compare
 * 
 * Compare tafsir from different sources for an ayah
 * 
 * Body:
 * - ayahId: number
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ayahId } = body;
    
    if (!ayahId) {
      return NextResponse.json({
        success: false,
        error: 'ayahId is required',
      }, { status: 400 });
    }
    
    const result = await tafsirAiApi.compareTafsirs(ayahId);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API] Tafsir comparison error:', error);
    return NextResponse.json({
      success: false,
      error: 'Tafsir comparison failed',
    }, { status: 500 });
  }
}
