/**
 * Search Service Client
 * 
 * HTTP client for communicating with the Search microservice.
 * Uses the gateway (Caddy) to route requests to the correct service.
 * 
 * @module search-service-client
 */

// Service port
const SEARCH_SERVICE_PORT = 3003;

/**
 * Make a request to the Search service
 */
async function searchServiceRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    params?: Record<string, string>;
  } = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const { method = 'GET', body, params } = options;
  
  // Build URL with gateway port transformation
  let url = `/api/${endpoint}?XTransformPort=${SEARCH_SERVICE_PORT}`;
  
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
    console.error('[Search Service Client] Request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

// Types
export interface SearchParams {
  query: string;
  type?: 'text' | 'semantic' | 'hybrid' | 'reference';
  surahId?: number;
  juzNumber?: number;
  hizbNumber?: number;
  pageNumber?: number;
  page?: number;
  limit?: number;
  fuzzy?: boolean;
  highlight?: boolean;
  includeTranslations?: boolean;
  includeTafsir?: boolean;
}

export interface SearchResultItem {
  id: number;
  surahId: number;
  surahNumber: number;
  surahNameArabic: string;
  surahNameEnglish: string;
  ayahNumber: number;
  ayahNumberGlobal: number;
  textArabic: string;
  textUthmani: string | null;
  pageNumber: number | null;
  juzNumber: number | null;
  hizbNumber: number | null;
  sajdah: boolean;
  score?: number;
  highlighted?: string;
  translation?: {
    text: string;
    source: string;
  };
  tafsir?: {
    text: string;
    source: string;
  };
}

export interface SearchResponse {
  success: boolean;
  data: SearchResultItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta: {
    query: string;
    normalizedQuery: string;
    type: string;
    took: number;
    fallback?: boolean;
  };
}

export interface AutocompleteSuggestion {
  text: string;
  surah: string;
  reference: string;
}

/**
 * Search API
 */
export const searchApi = {
  /**
   * Perform search
   */
  async search(params: SearchParams): Promise<SearchResponse> {
    const { query, type = 'text', surahId, juzNumber, hizbNumber, pageNumber, page, limit, fuzzy, highlight, includeTranslations, includeTafsir } = params;
    
    // Build params object
    const requestParams: Record<string, string> = { q: query };
    if (surahId) requestParams.surahId = String(surahId);
    if (juzNumber) requestParams.juzNumber = String(juzNumber);
    if (hizbNumber) requestParams.hizbNumber = String(hizbNumber);
    if (pageNumber) requestParams.pageNumber = String(pageNumber);
    if (page) requestParams.page = String(page);
    if (limit) requestParams.limit = String(limit);
    if (fuzzy) requestParams.fuzzy = 'true';
    if (highlight !== false) requestParams.highlight = 'true';
    if (includeTranslations) requestParams.includeTranslations = 'true';
    if (includeTafsir) requestParams.includeTafsir = 'true';
    
    if (type === 'semantic') {
      return searchServiceRequest('search/semantic', {
        method: 'POST',
        body: { query, limit, surahId },
      }) as Promise<SearchResponse>;
    }
    
    if (type === 'hybrid') {
      return searchServiceRequest('search/hybrid', {
        method: 'POST',
        body: { query, limit, surahId },
      }) as Promise<SearchResponse>;
    }
    
    return searchServiceRequest('search', { params: requestParams }) as Promise<SearchResponse>;
  },

  /**
   * Get autocomplete suggestions
   */
  async autocomplete(prefix: string, options?: { surahId?: number; limit?: number }): Promise<{ success: boolean; data?: AutocompleteSuggestion[]; error?: string }> {
    const params: Record<string, string> = { prefix };
    if (options?.surahId) params.surahId = String(options.surahId);
    if (options?.limit) params.limit = String(options.limit);
    
    return searchServiceRequest('search/suggestions', { params });
  },

  /**
   * Get popular searches
   */
  async getPopularSearches(): Promise<{ success: boolean; data?: string[]; error?: string }> {
    return searchServiceRequest('search/popular');
  },

  /**
   * Get related ayahs
   */
  async getRelatedAyahs(ayahId: number, options?: { limit?: number }): Promise<{ success: boolean; data?: SearchResultItem[]; error?: string }> {
    const params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    
    return searchServiceRequest(`search/related/${ayahId}`, { params });
  },

  /**
   * Clear search cache
   */
  async clearCache(): Promise<{ success: boolean; error?: string }> {
    return searchServiceRequest('search/cache', { method: 'DELETE' });
  },

  /**
   * Check Elasticsearch health
   */
  async checkHealth(): Promise<{ success: boolean; data?: { elasticsearch: boolean; database: boolean }; error?: string }> {
    return searchServiceRequest('search/health');
  },
};

/**
 * Health check for Search service
 */
export async function checkSearchServiceHealth(): Promise<{ status: string; uptime: number; checks: { database: boolean; elasticsearch: boolean } }> {
  try {
    const response = await fetch(`/api/health?XTransformPort=${SEARCH_SERVICE_PORT}`);
    return response.json();
  } catch {
    return { status: 'unhealthy', uptime: 0, checks: { database: false, elasticsearch: false } };
  }
}

// Export all APIs
export default {
  search: searchApi,
  checkHealth: checkSearchServiceHealth,
};
