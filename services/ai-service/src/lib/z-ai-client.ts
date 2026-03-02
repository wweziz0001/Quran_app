/**
 * Z-AI Client for AI Microservice
 * 
 * Provides unified access to AI capabilities using z-ai-web-dev-sdk
 * 
 * IMPORTANT: This MUST be used in backend code only!
 * 
 * @module z-ai-client
 */

import ZAI from 'z-ai-web-dev-sdk';

// Types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimensions: number;
}

// Singleton instance
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

/**
 * Initialize and get Z-AI client instance
 */
export async function getZAIClient(): Promise<Awaited<ReturnType<typeof ZAI.create>>> {
  if (!zaiInstance) {
    console.log('[Z-AI Client] Initializing...');
    zaiInstance = await ZAI.create();
    console.log('[Z-AI Client] Initialized successfully');
  }
  return zaiInstance;
}

/**
 * Generate text embedding using AI
 * 
 * @param text - Text to generate embedding for
 * @returns Embedding vector with 1536 dimensions
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResponse> {
  const zai = await getZAIClient();
  
  try {
    // Use LLM to generate a semantic representation
    // Note: z-ai-web-dev-sdk doesn't have a direct embedding API
    // We'll use a hash-based approach for now, but in production
    // you'd want to use a proper embedding model
    
    const embedding = generateDeterministicEmbedding(text);
    
    return {
      embedding,
      model: 'quran-semantic-v1',
      dimensions: 1536,
    };
  } catch (error) {
    console.error('[Z-AI Client] Embedding generation error:', error);
    throw error;
  }
}

/**
 * Create chat completion
 * 
 * @param messages - Array of chat messages
 * @param options - Optional parameters
 * @returns AI response
 */
export async function chatCompletion(params: {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<ChatCompletionResponse> {
  const zai = await getZAIClient();
  const { messages, temperature = 0.7 } = params;
  
  try {
    const completion = await zai.chat.completions.create({
      messages: messages.map(m => ({
        role: m.role === 'system' ? 'assistant' as const : m.role as 'user' | 'assistant',
        content: m.content,
      })),
      thinking: { type: 'disabled' },
    });
    
    const content = completion.choices[0]?.message?.content || '';
    
    return {
      content,
      model: 'z-ai-chat',
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  } catch (error) {
    console.error('[Z-AI Client] Chat completion error:', error);
    throw error;
  }
}

/**
 * Answer a question about Quran with context
 * 
 * @param question - User's question
 * @param context - Relevant ayahs as context
 * @returns AI-generated answer
 */
export async function answerQuranQuestion(
  question: string,
  context: Array<{ text: string; surah: string; reference: string; tafsir?: string }>
): Promise<string> {
  const systemPrompt = `أنت عالم في القرآن الكريم والتفسير. أجب على الأسئلة بناءً على الآيات المقترحة.

قواعد مهمة:
1. أجب بشكل مختصر وواضح باللغة العربية
2. استشهد بالآيات عند الحاجة مع ذكر المرجع
3. إذا لم تجد إجابة في الآيات، قل "لا أعلم" أو "لم أجد إجابة واضحة في الآيات المتوفرة"
4. لا تخترع معلومات غير موجودة في الآيات
5. كن محترماً وموضوعياً في إجاباتك`;

  const contextText = context
    .map((c, i) => `[${i + 1}] ${c.surah} (${c.reference}): ${c.text}${c.tafsir ? `\nالتفسير: ${c.tafsir}` : ''}`)
    .join('\n\n');

  const userPrompt = `السؤال: ${question}\n\nالآيات ذات الصلة:\n${contextText}\n\nأجب على السؤال بالاعتماد على الآيات المذكورة:`;

  const response = await chatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5,
  });

  return response.content;
}

/**
 * Generate Tafsir explanation for an ayah
 * 
 * @param ayahText - The ayah text
 * @param surahName - Name of the surah
 * @param ayahNumber - Ayah number
 * @param existingTafsirs - Existing tafsir entries
 * @returns AI-generated explanation
 */
export async function generateTafsirExplanation(
  ayahText: string,
  surahName: string,
  ayahNumber: number,
  existingTafsirs?: Array<{ source: string; text: string }>
): Promise<{ explanation: string; keyPoints: string[] }> {
  const systemPrompt = `أنت مفسّر قرآني متخصص. اشرح الآية بشكل واضح ومختصر.

قواعد:
1. ابدأ بالمعنى العام للآية
2. اذكر النقاط الرئيسية
3. اذكر سبب النزول إن كان معروفاً
4. استفد من التفاسير المتوفرة
5. اجعل الشرح مناسباً لجميع المستويات`;

  const tafsirContext = existingTafsirs
    ?.map(t => `تفسير ${t.source}: ${t.text}`)
    .join('\n\n') || 'لا توجد تفاسير متوفرة';

  const userPrompt = `الآية: ${ayahText}
السورة: ${surahName}
رقم الآية: ${ayahNumber}

التفاسير المتوفرة:
${tafsirContext}

اشرح هذه الآية باختصار ووضوح:`;

  const response = await chatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.6,
  });

  // Extract key points
  const keyPointsPrompt = `من الشرح التالي، استخرج 3-5 نقاط رئيسية كقائمة مختصرة بالعربية:\n\n${response.content}`;

  const keyPointsResponse = await chatCompletion({
    messages: [{ role: 'user', content: keyPointsPrompt }],
    temperature: 0.3,
  });

  const keyPoints = keyPointsResponse.content
    .split('\n')
    .filter(line => line.trim().match(/^[-•*]\s/) || line.trim().match(/^\d+\.\s/))
    .map(line => line.replace(/^[-•*\d.]\s*/, '').trim())
    .slice(0, 5);

  return {
    explanation: response.content,
    keyPoints,
  };
}

/**
 * Enhance search query for better semantic search
 * 
 * @param query - Original search query
 * @returns Enhanced query
 */
export async function enhanceSearchQuery(query: string): Promise<string> {
  const systemPrompt = `أنت مساعد في تحسين استعلامات البحث القرآني.
حسّن الاستعلام ليكون أكثر فعالية في البحث عن الآيات القرآنية.
أعد الاستعلام المحسّن فقط بدون أي شرح إضافي.`;

  const response = await chatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ],
    temperature: 0.3,
  });

  return response.content.trim();
}

/**
 * Generate similar ayah recommendations
 * 
 * @param ayahText - The source ayah
 * @param count - Number of recommendations
 * @returns Theme keywords for finding similar ayahs
 */
export async function generateSimilarThemes(ayahText: string): Promise<string[]> {
  const systemPrompt = `أنت خبير في تحليل الموضوعات القرآنية.
استخرج 3-5 كلمات مفتاحية تمثل الموضوعات الرئيسية في الآية.
أعد الكلمات مفصولة بفواصل فقط.`;

  const response = await chatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: ayahText },
    ],
    temperature: 0.3,
  });

  return response.content
    .split(/[،,]/)
    .map(word => word.trim())
    .filter(word => word.length > 0)
    .slice(0, 5);
}

/**
 * Generate deterministic embedding for text
 * This creates a consistent vector representation based on text content
 * In production, replace with actual embedding model
 */
function generateDeterministicEmbedding(text: string): number[] {
  const dimensions = 1536;
  const embedding: number[] = [];
  
  // Normalize text
  const normalizedText = text
    .replace(/[\u064B-\u065F]/g, '') // Remove diacritics
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  
  // Generate hash from text
  let hash1 = 0;
  let hash2 = 0;
  
  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText.charCodeAt(i);
    hash1 = ((hash1 << 5) - hash1 + char) | 0;
    hash2 = ((hash2 << 7) + hash2 + char * (i + 1)) | 0;
  }
  
  // Generate embedding values using multiple hash functions
  for (let i = 0; i < dimensions; i++) {
    // Use combination of hash functions for better distribution
    const seed = (hash1 * (i + 1) + hash2 * (dimensions - i)) >>> 0;
    const value = Math.sin(seed * 0.00001) * Math.cos(seed * 0.00002);
    embedding.push(value);
  }
  
  // Normalize to unit length for cosine similarity
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  
  if (magnitude === 0) {
    return embedding.map(() => 1 / Math.sqrt(dimensions));
  }
  
  return embedding.map(v => v / magnitude);
}

// Export all functions
export default {
  getZAIClient,
  generateEmbedding,
  chatCompletion,
  answerQuranQuestion,
  generateTafsirExplanation,
  enhanceSearchQuery,
  generateSimilarThemes,
};
