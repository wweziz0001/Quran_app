import { NextRequest, NextResponse } from 'next/server';
import {
  answerQuestion,
  explainAyah,
  compareAyahs,
  getContextualAnswer,
} from '@/services/ai/question-answering';

/**
 * POST /api/ai/chat
 * 
 * AI-powered chat/QA endpoint for Quran questions
 * 
 * Body:
 * - type: 'qa' | 'explain' | 'compare' | 'contextual'
 * - question?: string (for 'qa' and 'contextual')
 * - ayahId?: number (for 'explain')
 * - ayahIds?: number[] (for 'compare')
 * - context?: { previousQuestions?: string[], viewedAyahs?: number[] }
 * - options?: { language?: 'ar' | 'en', includeTafsir?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = 'qa', question, ayahId, ayahIds, context, options = {} } = body;
    
    let result;
    
    switch (type) {
      case 'qa':
        if (!question) {
          return NextResponse.json({
            success: false,
            error: 'Question is required for QA',
          }, { status: 400 });
        }
        
        result = await answerQuestion(question, {
          language: options.language || 'ar',
          includeTafsir: options.includeTafsir !== false,
        });
        break;
        
      case 'explain':
        if (!ayahId) {
          return NextResponse.json({
            success: false,
            error: 'ayahId is required for explain',
          }, { status: 400 });
        }
        
        result = await explainAyah(ayahId, {
          language: options.language || 'ar',
          detailLevel: options.detailLevel || 'brief',
        });
        break;
        
      case 'compare':
        if (!ayahIds || ayahIds.length < 2) {
          return NextResponse.json({
            success: false,
            error: 'At least 2 ayahIds are required for compare',
          }, { status: 400 });
        }
        
        result = await compareAyahs(ayahIds);
        break;
        
      case 'contextual':
        if (!question) {
          return NextResponse.json({
            success: false,
            error: 'Question is required for contextual QA',
          }, { status: 400 });
        }
        
        result = await getContextualAnswer(question, context);
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid type. Use: qa, explain, compare, or contextual',
        }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        type,
        timestamp: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error('[API] AI chat error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET /api/ai/chat
 * 
 * Quick question answering via query parameters
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const question = searchParams.get('q');
  const language = (searchParams.get('lang') || 'ar') as 'ar' | 'en';
  
  if (!question) {
    return NextResponse.json({
      success: false,
      error: 'Query parameter "q" is required',
    }, { status: 400 });
  }
  
  try {
    const result = await answerQuestion(question, {
      language,
      includeTafsir: true,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        question: result.question,
        answer: result.answer,
        sources: result.sources,
        confidence: result.confidence,
      },
      meta: {
        processingTime: result.processingTime,
      },
    });
    
  } catch (error) {
    console.error('[API] AI chat error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to answer question',
    }, { status: 500 });
  }
}
