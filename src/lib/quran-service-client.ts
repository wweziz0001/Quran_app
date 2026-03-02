/**
 * Quran Service Client
 *
 * HTTP client for communicating with the Quran microservice.
 * Uses the gateway (Caddy) to route requests to the correct service.
 *
 * @module quran-service-client
 */

// Service port
const QURAN_SERVICE_PORT = 3001;

/**
 * Make a request to the Quran service
 */
async function quranServiceRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    params?: Record<string, string>;
  } = {}
): Promise<{ success: boolean; data?: T; error?: string; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
  const { method = 'GET', body, params } = options;

  // Build URL with gateway port transformation
  let url = `/api/${endpoint}?XTransformPort=${QURAN_SERVICE_PORT}`;

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
    console.error('[Quran Service Client] Request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

// Types
export interface Surah {
  id: number;
  number: number;
  nameArabic: string;
  nameEnglish: string;
  nameTransliteration: string | null;
  revelationType: 'Meccan' | 'Medinan';
  totalAyahs: number;
  pageNumberStart: number | null;
  juzNumberStart: number | null;
  description: string | null;
  _count?: { Ayah: number };
}

export interface Ayah {
  id: number;
  surahId: number;
  ayahNumber: number;
  ayahNumberGlobal: number;
  textArabic: string;
  textUthmani: string | null;
  textIndopak: string | null;
  pageNumber: number | null;
  juzNumber: number | null;
  hizbNumber: number | null;
  rubNumber: number | null;
  sajdah: boolean;
  sajdahType: string | null;
  wordCount: number | null;
  letterCount: number | null;
  Surah?: {
    id: number;
    number: number;
    nameArabic: string;
    nameEnglish: string;
  };
}

export interface MushafEdition {
  id: string;
  name: string;
  description: string | null;
  style: string | null;
  linesPerPage: number;
  isDefault: boolean;
  _count?: { MushafPage: number };
}

export interface MushafPage {
  id: string;
  pageNumber: number;
  imageUrl: string | null;
  mushafEditionId: string;
}

/**
 * Surahs API
 */
export const surahsApi = {
  /**
   * Get all surahs
   */
  async getAll(): Promise<{ success: boolean; data?: Surah[]; error?: string }> {
    return quranServiceRequest('surahs');
  },

  /**
   * Get a specific surah by number (1-114)
   */
  async getByNumber(number: number): Promise<{ success: boolean; data?: Surah; error?: string }> {
    return quranServiceRequest(`surahs/${number}`);
  },

  /**
   * Get ayahs for a specific surah
   */
  async getAyahs(surahNumber: number, options?: { page?: number; limit?: number }): Promise<{
    success: boolean;
    data?: Ayah[];
    error?: string;
    pagination?: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const params: Record<string, string> = {};
    if (options?.page) params.page = String(options.page);
    if (options?.limit) params.limit = String(options.limit);

    return quranServiceRequest(`surahs/${surahNumber}/ayahs`, { params });
  },
};

/**
 * Ayahs API
 */
export const ayahsApi = {
  /**
   * Get ayahs with filters
   */
  async getAll(options?: {
    surahId?: number;
    page?: number;
    limit?: number;
    juz?: number;
    pageNumber?: number;
  }): Promise<{
    success: boolean;
    data?: Ayah[];
    error?: string;
    pagination?: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const params: Record<string, string> = {};
    if (options?.surahId) params.surahId = String(options.surahId);
    if (options?.page) params.page = String(options.page);
    if (options?.limit) params.limit = String(options.limit);
    if (options?.juz) params.juz = String(options.juz);
    if (options?.pageNumber) params.page = String(options.pageNumber);

    return quranServiceRequest('ayahs', { params });
  },

  /**
   * Get a specific ayah by ID
   */
  async getById(id: number): Promise<{ success: boolean; data?: Ayah; error?: string }> {
    return quranServiceRequest(`ayahs/${id}`);
  },

  /**
   * Get a random ayah
   */
  async getRandom(): Promise<{ success: boolean; data?: Ayah; error?: string }> {
    return quranServiceRequest('ayahs/random');
  },
};

/**
 * Mushafs API
 */
export const mushafsApi = {
  /**
   * Get all mushaf editions
   */
  async getAll(): Promise<{ success: boolean; data?: MushafEdition[]; error?: string }> {
    return quranServiceRequest('mushafs');
  },

  /**
   * Get a specific mushaf by ID
   */
  async getById(id: string): Promise<{ success: boolean; data?: MushafEdition; error?: string }> {
    return quranServiceRequest(`mushafs/${id}`);
  },

  /**
   * Get pages for a mushaf
   */
  async getPages(mushafId: string, options?: { page?: number; limit?: number }): Promise<{
    success: boolean;
    data?: MushafPage[];
    error?: string;
    pagination?: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const params: Record<string, string> = {};
    if (options?.page) params.page = String(options.page);
    if (options?.limit) params.limit = String(options.limit);

    return quranServiceRequest(`mushafs/${mushafId}/pages`, { params });
  },
};

/**
 * Health check for Quran service
 */
export async function checkQuranServiceHealth(): Promise<{ status: string; uptime: number; version?: string }> {
  try {
    const response = await fetch(`/api/health?XTransformPort=${QURAN_SERVICE_PORT}`);
    return response.json();
  } catch {
    return { status: 'unhealthy', uptime: 0 };
  }
}

// Export all APIs
export default {
  surahs: surahsApi,
  ayahs: ayahsApi,
  mushafs: mushafsApi,
  checkHealth: checkQuranServiceHealth,
};
