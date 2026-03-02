import { NextRequest, NextResponse } from 'next/server';
import {
  getAyahEmbedding,
  generateAyahEmbeddings,
  generateAllEmbeddings,
  getEmbeddingStats,
} from '@/services/ai/embeddings';

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
      const result = await getAyahEmbedding(parseInt(ayahId));
      
      return NextResponse.json({
        success: true,
        data: {
          ayahId: result.ayahId,
          model: result.model,
          dimensions: result.embedding.length,
          cached: result.cached,
          // Don't return full embedding in response (too large)
          sample: result.embedding.slice(0, 5),
        },
      });
    }
    
    // Get stats
    if (action === 'stats') {
      const stats = await getEmbeddingStats();
      return NextResponse.json({
        success: true,
        data: stats,
      });
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
    
    switch (action) {
      case 'generate_one':
        if (!ayahId) {
          return NextResponse.json({
            success: false,
            error: 'ayahId is required for generate_one',
          }, { status: 400 });
        }
        
        const singleResult = await getAyahEmbedding(ayahId);
        return NextResponse.json({
          success: true,
          data: {
            ayahId: singleResult.ayahId,
            model: singleResult.model,
            cached: singleResult.cached,
          },
        });
        
      case 'generate_many':
        if (!ayahIds || !Array.isArray(ayahIds)) {
          return NextResponse.json({
            success: false,
            error: 'ayahIds array is required for generate_many',
          }, { status: 400 });
        }
        
        const manyResult = await generateAyahEmbeddings(ayahIds, { force });
        return NextResponse.json({
          success: true,
          data: manyResult,
        });
        
      case 'generate_all':
        // Start async generation (don't wait)
        generateAllEmbeddings()
          .then(result => {
            console.log('[Embeddings] Generation completed:', result);
          })
          .catch(error => {
            console.error('[Embeddings] Generation failed:', error);
          });
        
        return NextResponse.json({
          success: true,
          message: 'Embedding generation started in background',
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: generate_one, generate_many, or generate_all',
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('[API] Embedding generation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate embeddings',
    }, { status: 500 });
  }
}
