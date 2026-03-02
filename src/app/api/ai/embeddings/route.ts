import { NextRequest, NextResponse } from 'next/server';
import { embeddingsApi } from '@/lib/ai-service-client';

/**
 * GET /api/ai/embeddings
 * 
 * Get embedding for a specific ayah or get stats
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ayahId = searchParams.get('ayahId');
  const action = searchParams.get('action');
  
  try {
    // Get embedding for specific ayah
    if (ayahId) {
      const result = await embeddingsApi.getAyahEmbedding(parseInt(ayahId));
      
      return NextResponse.json(result);
    }
    
    // Get stats
    if (action === 'stats') {
      const result = await embeddingsApi.getStats();
      return NextResponse.json(result);
    }
    
    return NextResponse.json({
      success: false,
      error: 'Provide ayahId or action=stats',
    }, { status: 400 });
    
  } catch (error) {
    console.error('[API] Embedding error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get embedding',
    }, { status: 500 });
  }
}

/**
 * POST /api/ai/embeddings
 * 
 * Generate embeddings for ayahs
 * 
 * Body:
 * - action: 'generate_one' | 'generate_many' | 'generate_all'
 * - ayahId?: number
 * - ayahIds?: number[]
 * - force?: boolean
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ayahId, ayahIds, force = false } = body;
    
    const result = await embeddingsApi.generate(action, { ayahId, ayahIds, force });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API] Embedding generation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate embeddings',
    }, { status: 500 });
  }
}
