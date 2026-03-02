import { Hono } from 'hono';
import { answerQuestion, explainAyah, compareAyahs, getContextualAnswer } from '../services/question-answering';

const app = new Hono();

// POST /qa - Answer a question about Quran
app.post('/', async (c) => {
  const body = await c.req.json();
  const { question, language = 'ar', includeTafsir = true, limit = 5 } = body;

  if (!question) {
    return c.json({ success: false, error: 'Question is required' }, 400);
  }

  try {
    const result = await answerQuestion(question, {
      language: language as 'ar' | 'en',
      includeTafsir,
      limit,
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('QA error:', error);
    return c.json({ success: false, error: 'Failed to answer question' }, 500);
  }
});

// POST /qa/explain - Explain an ayah in detail
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

// POST /qa/compare - Compare multiple ayahs
app.post('/compare', async (c) => {
  const body = await c.req.json();
  const { ayahIds } = body;

  if (!ayahIds || !Array.isArray(ayahIds) || ayahIds.length < 2) {
    return c.json({ success: false, error: 'At least 2 ayahIds are required' }, 400);
  }

  if (ayahIds.length > 5) {
    return c.json({ success: false, error: 'Maximum 5 ayahs can be compared' }, 400);
  }

  try {
    const result = await compareAyahs(ayahIds);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Compare error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to compare ayahs';
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// POST /qa/contextual - Contextual Q&A with follow-ups
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
    console.error('Contextual QA error:', error);
    return c.json({ success: false, error: 'Failed to answer contextual question' }, 500);
  }
});

export default app;
