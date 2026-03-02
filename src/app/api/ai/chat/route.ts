import { NextRequest, NextResponse } from 'next/server';
import { chatApi } from '@/lib/ai-service-client';

/**
 * POST /api/ai/chat
 * 
 * Send a chat message and get AI response
 * 
 * Body:
 * - messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
 * - temperature?: number
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, temperature } = body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Messages array is required',
      }, { status: 400 });
    }
    
    const result = await chatApi.sendMessage(messages, { temperature });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API] Chat error:', error);
    return NextResponse.json({
      success: false,
      error: 'Chat request failed',
    }, { status: 500 });
  }
}

/**
 * POST /api/ai/chat/answer
 * 
 * Answer a question about Quran with context
 * 
 * Body:
 * - question: string
 * - context?: Array<{ text: string; surah: string; reference: string }>
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, context } = body;
    
    if (!question) {
      return NextResponse.json({
        success: false,
        error: 'Question is required',
      }, { status: 400 });
    }
    
    const result = await chatApi.answerQuestion(question, context);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API] Answer error:', error);
    return NextResponse.json({
      success: false,
      error: 'Answer request failed',
    }, { status: 500 });
  }
}
