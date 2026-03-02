import { Hono } from 'hono';
import { db } from '@quran/shared/db';
import { chatCompletion, answerQuranQuestion } from '../lib/z-ai-client';
import { answerQuestion, explainAyah, getContextualAnswer } from '../services/question-answering';
import { semanticSearch } from '../services/semantic-search';

const app = new Hono();

// POST /chat/tafsir - AI-powered tafsir explanation
app.post('/tafsir', async (c) => {
  const body = await c.req.json();
  const { ayahId, question } = body;

  if (!ayahId) {
    return c.json({ success: false, error: 'ayahId is required' }, 400);
  }

  try {
    const ayah = await db.ayah.findUnique({
      where: { id: ayahId },
      include: {
        Surah: true,
        TafsirEntry: { include: { TafsirSource: true }, take: 1 },
      },
    });

    if (!ayah) {
      return c.json({ success: false, error: 'Ayah not found' }, 404);
    }

    // Build context from ayah
    const context = [{
      text: ayah.textArabic,
      surah: ayah.Surah?.nameArabic || '',
      reference: `${ayah.surahId}:${ayah.ayahNumber}`,
      tafsir: ayah.TafsirEntry?.[0]?.textArabic,
    }];

    // Use AI to answer based on context
    const answer = question 
      ? await answerQuranQuestion(question, context)
      : await answerQuranQuestion('اشرح هذه الآية', context);

    return c.json({
      success: true,
      data: {
        ayah: ayah.textArabic,
        surah: ayah.Surah?.nameArabic,
        ayahNumber: ayah.ayahNumber,
        explanation: answer,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return c.json({ success: false, error: 'Failed to generate explanation' }, 500);
  }
});

// POST /chat/question - General Quran questions
app.post('/question', async (c) => {
  const body = await c.req.json();
  const { question, language = 'ar', includeTafsir = true } = body;

  if (!question) {
    return c.json({ success: false, error: 'Question is required' }, 400);
  }

  try {
    const result = await answerQuestion(question, {
      language: language as 'ar' | 'en',
      includeTafsir,
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Question error:', error);
    return c.json({ success: false, error: 'Failed to answer question' }, 500);
  }
});

// POST /chat/contextual - Contextual Q&A with follow-ups
app.post('/contextual', async (c) => {
  const body = await c.req.json();
  const { question, previousQuestions, viewedAyahs } = body;

  if (!question) {
    return c.json({ success: false, error: 'Question is required' }, 400);
  }

  try {
    const result = await getContextualAnswer(question, {
      previousQuestions,
      viewedAyahs,
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Contextual question error:', error);
    return c.json({ success: false, error: 'Failed to answer contextual question' }, 500);
  }
});

// POST /chat/explain - Detailed ayah explanation
app.post('/explain', async (c) => {
  const body = await c.req.json();
  const { ayahId, language = 'ar', detailLevel = 'brief' } = body;

  if (!ayahId) {
    return c.json({ success: false, error: 'ayahId is required' }, 400);
  }

  try {
    const result = await explainAyah(ayahId, {
      language: language as 'ar' | 'en',
      detailLevel: detailLevel as 'brief' | 'detailed' | 'academic',
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Explain error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to explain ayah';
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// POST /chat/search - AI-enhanced search
app.post('/search', async (c) => {
  const body = await c.req.json();
  const { query, limit = 10, threshold = 0.5, includeTafsir = false } = body;

  if (!query) {
    return c.json({ success: false, error: 'Query is required' }, 400);
  }

  try {
    const results = await semanticSearch(query, {
      limit,
      threshold,
      includeTafsir,
    });

    return c.json({
      success: true,
      data: results,
      query,
    });
  } catch (error) {
    console.error('Search error:', error);
    return c.json({ success: false, error: 'Failed to search' }, 500);
  }
});

// POST /chat/completions - Generic chat completions
app.post('/completions', async (c) => {
  const body = await c.req.json();
  const { messages, temperature = 0.7, maxTokens } = body;

  if (!messages || !Array.isArray(messages)) {
    return c.json({ success: false, error: 'Messages array is required' }, 400);
  }

  try {
    const response = await chatCompletion({
      messages,
      temperature,
      maxTokens,
    });

    return c.json({
      success: true,
      data: {
        content: response.content,
        model: response.model,
        usage: response.usage,
      },
    });
  } catch (error) {
    console.error('Completion error:', error);
    return c.json({ success: false, error: 'Failed to generate completion' }, 500);
  }
});

export default app;
