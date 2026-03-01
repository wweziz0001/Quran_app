import { Hono } from 'hono';
import { db } from '../../shared/db';

const app = new Hono();

// POST /chat/tafsir - AI-powered tafsir explanation
app.post('/tafsir', async (c) => {
  const body = await c.req.json();
  const { ayahId, question } = body;

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

    // In production, use z-ai-web-dev-sdk for actual AI response
    // const zai = await ZAI.create();
    // const completion = await zai.chat.completions.create({...});

    const systemPrompt = `أنت مفسّر قرآني متخصص. اجب على الأسئلة بشكل مختصر وواضح.
الآية: ${ayah.textArabic}
السورة: ${ayah.Surah?.nameArabic}
التفسير المتوفر: ${ayah.TafsirEntry?.[0]?.textArabic || 'غير متوفر'}`;

    // Placeholder AI response
    const explanation = `هذه الآية من سورة ${ayah.Surah?.nameArabic} تحمل معاني عظيمة. ${
      question || 'اشرح هذه الآية باختصار'
    } - هذا رد تجريبي. في الإنتاج، سيتم استخدام z-ai-web-dev-sdk للإجابة الفعلية.`;

    return c.json({
      success: true,
      data: {
        ayah: ayah.textArabic,
        surah: ayah.Surah?.nameArabic,
        explanation,
        systemPrompt,
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
  const { question } = body;

  if (!question) {
    return c.json({ success: false, error: 'Question is required' }, 400);
  }

  try {
    // In production, use z-ai-web-dev-sdk for actual AI response
    // const zai = await ZAI.create();
    // const completion = await zai.chat.completions.create({
    //   messages: [
    //     { role: 'system', content: 'أنت مساعد متخصص في القرآن الكريم...' },
    //     { role: 'user', content: question },
    //   ],
    // });

    // Placeholder AI response
    const answer = `شكراً على سؤالك: "${question}" - هذا رد تجريبي. في الإنتاج، سيتم استخدام z-ai-web-dev-sdk للإجابة الفعلية باستخدام الذكاء الاصطناعي.`;

    return c.json({
      success: true,
      data: {
        question,
        answer,
      },
    });
  } catch (error) {
    console.error('Question error:', error);
    return c.json({ success: false, error: 'Failed to answer question' }, 500);
  }
});

export default app;
