import { Hono } from 'hono';
import { 
  getRecommendations, 
  getSequentialRecommendations, 
  getPersonalizedRecommendations 
} from '../services/recommendations';

const app = new Hono();

// POST /recommendations - Get recommendations based on context
app.post('/', async (c) => {
  const body = await c.req.json();
  const { 
    currentAyahId,
    viewedAyahIds,
    searchHistory,
    favorites,
    timeOfDay,
    limit = 5,
    diversity = 0.3
  } = body;

  try {
    const recommendations = await getRecommendations(
      {
        currentAyahId,
        viewedAyahIds,
        searchHistory,
        favorites,
        timeOfDay,
      },
      { limit, diversity }
    );

    return c.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    return c.json({ success: false, error: 'Failed to get recommendations' }, 500);
  }
});

// POST /recommendations/sequential - Get sequential recommendations (next ayahs)
app.post('/sequential', async (c) => {
  const body = await c.req.json();
  const { ayahId, limit = 3 } = body;

  if (!ayahId) {
    return c.json({ success: false, error: 'ayahId is required' }, 400);
  }

  try {
    const recommendations = await getSequentialRecommendations(ayahId, limit);

    return c.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    console.error('Sequential recommendations error:', error);
    return c.json({ success: false, error: 'Failed to get sequential recommendations' }, 500);
  }
});

// POST /recommendations/personalized - Get personalized recommendations
app.post('/personalized', async (c) => {
  const body = await c.req.json();
  const { userId, limit = 5 } = body;

  if (!userId) {
    return c.json({ success: false, error: 'userId is required' }, 400);
  }

  try {
    const recommendations = await getPersonalizedRecommendations(userId, limit);

    return c.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    console.error('Personalized recommendations error:', error);
    return c.json({ success: false, error: 'Failed to get personalized recommendations' }, 500);
  }
});

export default app;
