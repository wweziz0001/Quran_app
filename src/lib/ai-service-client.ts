/**
 * AI Service Client
 * 
 * HTTP client for communicating with the AI microservice.
 * Uses the gateway (Caddy) to route requests to the correct service.
 * 
 * @module ai-service-client
 */

// Service ports
const AI_SERVICE_PORT = 3007;

/**
 * Make a request to the AI service
 */
async function aiServiceRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    params?: Record<string, string>;
  } = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const { method = 'GET', body, params } = options;
  
  // Build URL with gateway port transformation
  let url = `/api/${endpoint}?XTransformPort=${AI_SERVICE_PORT}`;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `&${searchParams.toString()}`;
  }
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[AI Service Client] Request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

// Types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimensions: number;
}

export interface SearchResult {
  ayahId: number;
  surahId: number;
  surahName: string;
  ayahNumber: number;
  textArabic: string;
  score: number;
  translation?: string;
  tafsir?: string;
}

export interface TafsirResult {
  ayahId: number;
  explanation: string;
  keyPoints: string[];
  sources: string[];
}

export interface Recommendation {
  ayahId: number;
  surahId: number;
  surahName: string;
  ayahNumber: number;
  textArabic: string;
  relevanceScore: number;
  reason: string;
}

/**
 * Embeddings API
 */
export const embeddingsApi = {
  /**
   * Get embedding for a specific ayah
   */
  async getAyahEmbedding(ayahId: number): Promise<{ success: boolean; data?: { ayahId: number; model: string; dimensions: number; cached: boolean }; error?: string }> {
    return aiServiceRequest('embeddings', {
      params: { ayahId: String(ayahId) },
    });
  },

  /**
   * Get embedding statistics
   */
  async getStats(): Promise<{ success: boolean; data?: { total: number; generated: number; pending: number }; error?: string }> {
    return aiServiceRequest('embeddings', {
      params: { action: 'stats' },
    });
  },

  /**
   * Generate embeddings for ayahs
   */
  async generate(action: 'generate_one' | 'generate_many' | 'generate_all', options?: { ayahId?: number; ayahIds?: number[]; force?: boolean }): Promise<{ success: boolean; data?: unknown; error?: string }> {
    return aiServiceRequest('embeddings', {
      method: 'POST',
      body: { action, ...options },
    });
  },
};

/**
 * Semantic Search API
 */
export const semanticSearchApi = {
  /**
   * Perform semantic search
   */
  async search(query: string, options?: { limit?: number; threshold?: number; surahId?: number }): Promise<{ success: boolean; data?: SearchResult[]; error?: string }> {
    return aiServiceRequest('semantic-search', {
      method: 'POST',
      body: { query, ...options },
    });
  },

  /**
   * Perform hybrid search (semantic + keyword)
   */
  async hybridSearch(query: string, options?: { limit?: number; surahId?: number }): Promise<{ success: boolean; data?: SearchResult[]; error?: string }> {
    return aiServiceRequest('semantic-search/hybrid', {
      method: 'POST',
      body: { query, ...options },
    });
  },

  /**
   * Find related ayahs
   */
  async findRelated(ayahId: number, options?: { limit?: number }): Promise<{ success: boolean; data?: SearchResult[]; error?: string }> {
    return aiServiceRequest('semantic-search/related', {
      method: 'POST',
      body: { ayahId, ...options },
    });
  },

  /**
   * Search by theme
   */
  async searchByTheme(theme: string, options?: { limit?: number }): Promise<{ success: boolean; data?: SearchResult[]; error?: string }> {
    return aiServiceRequest('semantic-search/theme', {
      method: 'POST',
      body: { theme, ...options },
    });
  },
};

/**
 * Chat API
 */
export const chatApi = {
  /**
   * Send a chat message
   */
  async sendMessage(messages: ChatMessage[], options?: { temperature?: number }): Promise<{ success: boolean; data?: { content: string }; error?: string }> {
    return aiServiceRequest('chat', {
      method: 'POST',
      body: { messages, ...options },
    });
  },

  /**
   * Answer a question about Quran
   */
  async answerQuestion(question: string, context?: Array<{ text: string; surah: string; reference: string }>): Promise<{ success: boolean; data?: { answer: string }; error?: string }> {
    return aiServiceRequest('chat/answer', {
      method: 'POST',
      body: { question, context },
    });
  },
};

/**
 * Tafsir AI API
 */
export const tafsirAiApi = {
  /**
   * Generate tafsir explanation for an ayah
   */
  async generateTafsir(ayahId: number, options?: { style?: 'brief' | 'detailed' | 'academic' }): Promise<{ success: boolean; data?: TafsirResult; error?: string }> {
    return aiServiceRequest('tafsir-ai', {
      method: 'POST',
      body: { ayahId, ...options },
    });
  },

  /**
   * Compare tafsir from different sources
   */
  async compareTafsirs(ayahId: number): Promise<{ success: boolean; data?: { sources: Array<{ source: string; text: string }> }; error?: string }> {
    return aiServiceRequest('tafsir-ai/compare', {
      method: 'POST',
      body: { ayahId },
    });
  },
};

/**
 * Recommendations API
 */
export const recommendationsApi = {
  /**
   * Get ayah recommendations based on current ayah
   */
  async getRecommendations(ayahId: number, options?: { limit?: number }): Promise<{ success: boolean; data?: Recommendation[]; error?: string }> {
    return aiServiceRequest('recommendations', {
      params: { ayahId: String(ayahId), ...options },
    });
  },

  /**
   * Get personalized recommendations
   */
  async getPersonalized(userId: string, options?: { limit?: number }): Promise<{ success: boolean; data?: Recommendation[]; error?: string }> {
    return aiServiceRequest('recommendations/personalized', {
      params: { userId, ...options },
    });
  },

  /**
   * Get sequential recommendations (next ayahs to read)
   */
  async getSequential(surahId: number, ayahNumber: number, options?: { limit?: number }): Promise<{ success: boolean; data?: Recommendation[]; error?: string }> {
    return aiServiceRequest('recommendations/sequential', {
      params: { surahId: String(surahId), ayahNumber: String(ayahNumber), ...options },
    });
  },
};

/**
 * Health check for AI service
 */
export async function checkAiServiceHealth(): Promise<{ status: string; uptime: number }> {
  try {
    const response = await fetch(`/api/health?XTransformPort=${AI_SERVICE_PORT}`);
    return response.json();
  } catch {
    return { status: 'unhealthy', uptime: 0 };
  }
}

// Export all APIs
export default {
  embeddings: embeddingsApi,
  semanticSearch: semanticSearchApi,
  chat: chatApi,
  tafsirAi: tafsirAiApi,
  recommendations: recommendationsApi,
  checkHealth: checkAiServiceHealth,
};
