/**
 * Question Answering Service
 * 
 * Provides AI-powered question answering for Quran content.
 * Uses semantic search to find relevant ayahs and LLM to generate answers.
 * 
 * @module question-answering
 */

import { db } from '@/lib/db';
import { answerQuranQuestion, chatCompletion } from '@/lib/z-ai-client';
import { semanticSearch, hybridSearch } from './semantic-search';

// Types
export interface QAResult {
  question: string;
  answer: string;
  sources: Array<{
    ayahId: number;
    surah: string;
    reference: string;
    text: string;
    similarity: number;
  }>;
  confidence: number;
  processingTime: number;
}

export interface ExplanationResult {
  ayahId: number;
  ayah: string;
  surah: string;
  explanation: string;
  keyPoints: string[];
  themes: string[];
  crossReferences: Array<{
    ayahId: number;
    reference: string;
    text: string;
    relation: string;
  }>;
}

/**
 * Answer a question about Quran
 * 
 * @param question - User's question
 * @param options - QA options
 * @returns Answer with sources and confidence
 */
export async function answerQuestion(
  question: string,
  options: {
    language?: 'ar' | 'en';
    includeTafsir?: boolean;
    limit?: number;
  } = {}
): Promise<QAResult> {
  const startTime = Date.now();
  const { language = 'ar', includeTafsir = true, limit = 5 } = options;
  
  // Find relevant ayahs
  const relevantAyahs = await semanticSearch(question, {
    limit,
    threshold: 0.5,
    includeTafsir,
  });
  
  if (relevantAyahs.length === 0) {
    return {
      question,
      answer: language === 'ar' 
        ? 'لم أجد آيات ذات صلة بسؤالك. يرجى إعادة صياغة السؤال.'
        : 'I could not find relevant verses for your question. Please rephrase.',
      sources: [],
      confidence: 0,
      processingTime: Date.now() - startTime,
    };
  }
  
  // Build context from relevant ayahs
  const context = relevantAyahs.map(ayah => ({
    text: ayah.textArabic,
    surah: ayah.surahName,
    reference: `${ayah.surahId}:${ayah.ayahNumber}`,
    tafsir: ayah.tafsir,
  }));
  
  // Generate answer
  const answer = await answerQuranQuestion(question, context);
  
  // Calculate confidence based on similarity scores
  const avgSimilarity = relevantAyahs.reduce((sum, a) => sum + a.similarity, 0) / relevantAyahs.length;
  const confidence = Math.min(avgSimilarity * 1.2, 1); // Scale up slightly, cap at 1
  
  return {
    question,
    answer,
    sources: relevantAyahs.map(ayah => ({
      ayahId: ayah.ayahId,
      surah: ayah.surahName,
      reference: `${ayah.surahId}:${ayah.ayahNumber}`,
      text: ayah.textArabic,
      similarity: ayah.similarity,
    })),
    confidence,
    processingTime: Date.now() - startTime,
  };
}

/**
 * Explain an ayah in detail
 * 
 * @param ayahId - The ayah to explain
 * @param options - Explanation options
 * @returns Detailed explanation
 */
export async function explainAyah(
  ayahId: number,
  options: {
    language?: 'ar' | 'en';
    detailLevel?: 'brief' | 'detailed' | 'academic';
  } = {}
): Promise<ExplanationResult> {
  const { language = 'ar', detailLevel = 'brief' } = options;
  
  // Get ayah with tafsir
  const ayah = await db.ayah.findUnique({
    where: { id: ayahId },
    include: {
      Surah: true,
      TafsirEntry: {
        include: { TafsirSource: true },
        take: 3,
      },
      WordAnalysis: {
        take: 10,
        select: { root: true, word: true },
      },
    },
  });
  
  if (!ayah) {
    throw new Error(`Ayah ${ayahId} not found`);
  }
  
  // Build system prompt based on detail level
  const detailInstructions = {
    brief: 'قدم شرحاً مختصراً في 2-3 جمل.',
    detailed: 'قدم شرحاً مفصلاً مع ذكر الأحكام والمعاني المستنبطة.',
    academic: 'قدم شرحاً أكاديمياً مع ذكر أقوال المفسرين والقراءات إن وجدت.',
  };
  
  const systemPrompt = `أنت مفسّر قرآني متخصص. ${detailInstructions[detailLevel]}

الآية: ${ayah.textArabic}
السورة: ${ayah.Surah?.nameArabic}
رقم الآية: ${ayah.ayahNumber}

${ayah.TafsirEntry.length > 0 
  ? `التفاسير المتوفرة:\n${ayah.TafsirEntry.map(t => `- ${t.TafsirSource?.nameArabic}: ${t.textArabic?.substring(0, 300)}...`).join('\n')}` 
  : 'لا توجد تفاسير متوفرة.'}`;

  // Generate explanation
  const response = await chatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'اشرح هذه الآية:' },
    ],
    temperature: 0.6,
  });
  
  const explanation = response.content;
  
  // Extract key points
  const keyPointsResponse = await chatCompletion({
    messages: [
      { role: 'user', content: `من الشرح التالي، استخرج 3-5 نقاط رئيسية كقائمة:\n${explanation}` },
    ],
    temperature: 0.3,
  });
  
  const keyPoints = keyPointsResponse.content
    .split('\n')
    .filter(line => line.trim().match(/^[-•*]\s/) || line.trim().match(/^\d+\.\s/))
    .map(line => line.replace(/^[-•*\d.]\s*/, '').trim())
    .slice(0, 5);
  
  // Extract themes
  const themesResponse = await chatCompletion({
    messages: [
      { role: 'user', content: `ما هي الموضوعات الرئيسية في هذه الآية؟ اذكر 3-5 كلمات مفتاحية فقط:\n${ayah.textArabic}` },
    ],
    temperature: 0.3,
  });
  
  const themes = themesResponse.content
    .split(/[،,\n]/)
    .map(word => word.trim())
    .filter(word => word.length > 0 && !word.includes(':'))
    .slice(0, 5);
  
  // Find cross-references
  const relatedAyahs = await semanticSearch(ayah.textArabic, { limit: 3, threshold: 0.75 });
  
  const crossReferences = relatedAyahs
    .filter(a => a.ayahId !== ayahId)
    .slice(0, 3)
    .map(a => ({
      ayahId: a.ayahId,
      reference: `${a.surahName} (${a.surahId}:${a.ayahNumber})`,
      text: a.textArabic,
      relation: 'متشابه في المعنى',
    }));
  
  return {
    ayahId,
    ayah: ayah.textArabic,
    surah: ayah.Surah?.nameArabic || '',
    explanation,
    keyPoints,
    themes,
    crossReferences,
  };
}

/**
 * Compare multiple ayahs
 * 
 * @param ayahIds - Array of ayah IDs to compare
 * @returns Comparative analysis
 */
export async function compareAyahs(
  ayahIds: number[]
): Promise<{
  ayahs: Array<{
    ayahId: number;
    surah: string;
    reference: string;
    text: string;
    keyMeaning: string;
  }>;
  commonThemes: string[];
  differences: string[];
  analysis: string;
}> {
  if (ayahIds.length < 2 || ayahIds.length > 5) {
    throw new Error('Please provide 2-5 ayahs to compare');
  }
  
  // Get all ayahs
  const ayahs = await db.ayah.findMany({
    where: { id: { in: ayahIds } },
    include: { Surah: true },
  });
  
  if (ayahs.length !== ayahIds.length) {
    throw new Error('Some ayahs not found');
  }
  
  // Build comparison prompt
  const ayahTexts = ayahs.map(a => 
    `${a.Surah?.nameArabic} (${a.surahId}:${a.ayahNumber}): ${a.textArabic}`
  ).join('\n\n');
  
  const systemPrompt = `أنت عالم في العلوم القرآنية. قارن بين الآيات التالية:

${ayahTexts}

قدم:
1. المعنى الرئيسي لكل آية
2. الموضوعات المشتركة
3. الفروقات بينها`;

  const response = await chatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'قدم المقارنة:' },
    ],
    temperature: 0.5,
  });
  
  // Extract key meanings
  const keyMeanings = await Promise.all(
    ayahs.map(async (ayah) => {
      const meaningResponse = await chatCompletion({
        messages: [
          { role: 'user', content: `في جملة واحدة، ما المعنى الرئيسي لهذه الآية؟\n${ayah.textArabic}` },
        ],
        temperature: 0.3,
      });
      
      return {
        ayahId: ayah.id,
        surah: ayah.Surah?.nameArabic || '',
        reference: `${ayah.surahId}:${ayah.ayahNumber}`,
        text: ayah.textArabic,
        keyMeaning: meaningResponse.content,
      };
    })
  );
  
  return {
    ayahs: keyMeanings,
    commonThemes: [],
    differences: [],
    analysis: response.content,
  };
}

/**
 * Get contextual answers with follow-up suggestions
 */
export async function getContextualAnswer(
  question: string,
  context?: {
    previousQuestions?: string[];
    viewedAyahs?: number[];
  }
): Promise<QAResult & { suggestedFollowUps: string[] }> {
  // Add context to search if available
  let enhancedQuestion = question;
  
  if (context?.previousQuestions?.length) {
    enhancedQuestion = `${question} (متابعة على: ${context.previousQuestions.slice(-2).join('، ')})`;
  }
  
  const result = await answerQuestion(enhancedQuestion);
  
  // Generate follow-up suggestions
  const followUpPrompt = `بناءً على السؤال "${question}" والإجابة "${result.answer}"، اقترح 3 أسئلة متابعة قد تهم المستخدم. اذكر الأسئلة فقط، كل سؤال في سطر جديد.`;
  
  const followUpResponse = await chatCompletion({
    messages: [{ role: 'user', content: followUpPrompt }],
    temperature: 0.5,
  });
  
  const suggestedFollowUps = followUpResponse.content
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => line.replace(/^\d+\.?\s*/, '').trim())
    .slice(0, 3);
  
  return {
    ...result,
    suggestedFollowUps,
  };
}

// Export all functions
export default {
  answerQuestion,
  explainAyah,
  compareAyahs,
  getContextualAnswer,
};
