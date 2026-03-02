/**
 * Reciter Service Client
 *
 * HTTP client for communicating with the Reciter microservice.
 * Uses the gateway (Caddy) to route requests to the correct service.
 *
 * @module reciter-service-client
 */

// Service port
const RECITER_SERVICE_PORT = 3006;

/**
 * Make a request to the Reciter service
 */
async function reciterServiceRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    params?: Record<string, string>;
  } = {}
): Promise<{ success: boolean; data?: T; error?: string; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
  const { method = 'GET', body, params } = options;

  // Build URL with gateway port transformation
  let url = `/api/${endpoint}?XTransformPort=${RECITER_SERVICE_PORT}`;

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
    console.error('[Reciter Service Client] Request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

// Types
export interface Reciter {
  id: string;
  nameEnglish: string;
  nameArabic: string;
  bio: string | null;
  country: string | null;
  imageUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: { Recitation: number };
  Recitation?: Recitation[];
}

export interface Recitation {
  id: string;
  reciterId: string;
  name: string;
  description: string | null;
  style: string | null;
  isComplete: boolean;
  createdAt: string;
}

/**
 * Reciters API
 */
export const recitersApi = {
  /**
   * Get all reciters
   */
  async getAll(options?: { page?: number; limit?: number; search?: string }): Promise<{
    success: boolean;
    data?: Reciter[];
    error?: string;
    pagination?: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const params: Record<string, string> = {};
    if (options?.page) params.page = String(options.page);
    if (options?.limit) params.limit = String(options.limit);
    if (options?.search) params.search = options.search;

    return reciterServiceRequest('reciters', { params });
  },

  /**
   * Get a specific reciter by ID
   */
  async getById(id: string): Promise<{ success: boolean; data?: Reciter; error?: string }> {
    return reciterServiceRequest(`reciters/${id}`);
  },

  /**
   * Create a new reciter
   */
  async create(data: { nameEnglish: string; nameArabic?: string; bio?: string; country?: string }): Promise<{ success: boolean; data?: Reciter; error?: string }> {
    return reciterServiceRequest('reciters', {
      method: 'POST',
      body: data,
    });
  },

  /**
   * Update a reciter
   */
  async update(id: string, data: Partial<Omit<Reciter, 'id' | 'createdAt' | 'updatedAt'>>): Promise<{ success: boolean; data?: Reciter; error?: string }> {
    return reciterServiceRequest(`reciters/${id}`, {
      method: 'PUT',
      body: data,
    });
  },

  /**
   * Delete a reciter
   */
  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    return reciterServiceRequest(`reciters/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Health check for Reciter service
 */
export async function checkReciterServiceHealth(): Promise<{ status: string; uptime: number }> {
  try {
    const response = await fetch(`/api/health?XTransformPort=${RECITER_SERVICE_PORT}`);
    return response.json();
  } catch {
    return { status: 'unhealthy', uptime: 0 };
  }
}

// Export all APIs
export default {
  reciters: recitersApi,
  checkHealth: checkReciterServiceHealth,
};
