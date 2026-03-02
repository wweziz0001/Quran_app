import { Hono } from 'hono';
import { 
  generateComprehensiveTafsir, 
  compareTafsirSources, 
  analyzeTheme, 
  getDailyTafsir 
} from '../services/tafsir-ai';

const app = new Hono();

// POST /tafsir-ai/explain - AI-powered tafsir explanation for a specific ayah
app.post('/explain', async (c) => {
  const body = await c.req.json();
  const { 
    ayahId, 
    language = 'ar',
    includeVocabulary = true,
    includeHistory = true,
    includeApplications = true
  } = body;

  if (!ayahId) {
    return c.json({ success: false, error: 'ayahId is required' }, 400);
  }

  try {
    const explanation = await generateComprehensiveTafsir(ayahId, {
      language,
      includeVocabulary,
      includeHistory,
      includeApplications,
    });

    return c.json({
      success: true,
      data: explanation,
    });
  } catch (error) {
    console.error('Tafsir AI error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate tafsir explanation';
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// POST /tafsir-ai/compare - Compare different tafsir sources for an ayah
app.post('/compare', async (c) => {
  const body = await c.req.json();
  const { ayahId } = body;

  if (!ayahId) {
    return c.json({ success: false, error: 'ayahId is required' }, 400);
  }

  try {
    const comparison = await compareTafsirSources(ayahId);

    return c.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    console.error('Compare tafsir error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to compare tafsirs';
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// POST /tafsir-ai/analyze-theme - Analyze a theme across multiple ayahs
app.post('/analyze-theme', async (c) => {
  const body = await c.req.json();
  const { theme, limit = 10 } = body;

  if (!theme) {
    return c.json({ success: false, error: 'theme is required' }, 400);
  }

  try {
    const analysis = await analyzeTheme(theme, { limit });

    return c.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Theme analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze theme';
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// GET /tafsir-ai/daily - Get daily tafsir recommendation
app.get('/daily', async (c) => {
  try {
    const dailyTafsir = await getDailyTafsir();

    return c.json({
      success: true,
      data: dailyTafsir,
    });
  } catch (error) {
    console.error('Daily tafsir error:', error);
    return c.json({ success: false, error: 'Failed to get daily tafsir' }, 500);
  }
});

export default app;
