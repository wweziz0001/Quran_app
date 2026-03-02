/**
 * Tafsir Service Client
 *
 * HTTP client for communicating with the Tafsir microservice.
 * Uses the gateway (Caddy) to route requests to the correct service.
 *
 * @module tafsir-service-client
 */

// Service port
const TAFSIR_SERVICE_PORT = 3004;

/**
 * Make a request to the Tafsir service
 */
async function tafsirServiceRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    params?: Record<string, string>;
  } = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const { method = 'GET', body, params } = options;

  // Build URL with gateway port transformation
  let url = `/api/${endpoint}?XTransformPort=${TAFSIR_SERVICE_PORT}`;

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
    console.error('[Tafsir Service Client] Request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

// Types
export interface TafsirSource {
  id: string;
  name: string;
  language: string;
  author: string | null;
  description: string | null;
  _count?: { TafsirEntry: number };
}

export interface TafsirEntry {
  id: string;
  ayahId: number;
  tafsirSourceId: string;
  textArabic: string | null;
  textEnglish: string | null;
  TafsirSource?: {
    name: string;
    language: string;
  };
  Ayah?: {
    id: number;
    ayahNumber: number;
    Surah?: {
      nameArabic: string;
      number: number;
    };
  };
}

export interface TranslationSource {
  id: string;
  name: string;
  language: string;
  author: string | null;
  description: string | null;
  _count?: { TranslationEntry: number };
}

export interface TranslationEntry {
  id: string;
  ayahId: number;
  translationSourceId: string;
  text: string;
  TranslationSource?: {
    name: string;
    language: string;
  };
  Ayah?: {
    id: number;
    ayahNumber: number;
    Surah?: {
      nameArabic: string;
      number: number;
    };
  };
}

/**
 * Tafsir API
 */
export const tafsirApi = {
  /**
   * Get all tafsir sources
   */
  async getSources(): Promise<{ success: boolean; data?: TafsirSource[]; error?: string }> {
    return tafsirServiceRequest('tafsir/sources');
  },

  /**
   * Get a specific tafsir source
   */
  async getSourceById(id: string): Promise<{ success: boolean; data?: TafsirSource; error?: string }> {
    return tafsirServiceRequest(`tafsir/sources/${id}`);
  },

  /**
   * Get tafsir for an ayah
   */
  async getForAyah(ayahId: number, sourceId?: string): Promise<{ success: boolean; data?: TafsirEntry[]; error?: string }> {
    const params: Record<string, string> = {};
    if (sourceId) params.sourceId = sourceId;

    return tafsirServiceRequest(`tafsir/ayah/${ayahId}`, { params });
  },

  /**
   * Get a specific tafsir entry
   */
  async getById(id: string): Promise<{ success: boolean; data?: TafsirEntry; error?: string }> {
    return tafsirServiceRequest(`tafsir/${id}`);
  },
};

/**
 * Translations API
 */
export const translationsApi = {
  /**
   * Get all translation sources
   */
  async getSources(): Promise<{ success: boolean; data?: TranslationSource[]; error?: string }> {
    return tafsirServiceRequest('translations/sources');
  },

  /**
   * Get a specific translation source
   */
  async getSourceById(id: string): Promise<{ success: boolean; data?: TranslationSource; error?: string }> {
    return tafsirServiceRequest(`translations/sources/${id}`);
  },

  /**
   * Get translations for an ayah
   */
  async getForAyah(ayahId: number, sourceId?: string): Promise<{ success: boolean; data?: TranslationEntry[]; error?: string }> {
    const params: Record<string, string> = {};
    if (sourceId) params.sourceId = sourceId;

    return tafsirServiceRequest(`translations/ayah/${ayahId}`, { params });
  },

  /**
   * Get a specific translation entry
   */
  async getById(id: string): Promise<{ success: boolean; data?: TranslationEntry; error?: string }> {
    return tafsirServiceRequest(`translations/${id}`);
  },
};

/**
 * Health check for Tafsir service
 */
export async function checkTafsirServiceHealth(): Promise<{ status: string; uptime: number }> {
  try {
    const response = await fetch(`/api/health?XTransformPort=${TAFSIR_SERVICE_PORT}`);
    return response.json();
  } catch {
    return { status: 'unhealthy', uptime: 0 };
  }
}

// Export all APIs
export default {
  tafsir: tafsirApi,
  translations: translationsApi,
  checkHealth: checkTafsirServiceHealth,
};
