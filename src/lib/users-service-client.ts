/**
 * Users Service Client
 *
 * HTTP client for communicating with the Users microservice.
 * Uses the gateway (Caddy) to route requests to the correct service.
 *
 * @module users-service-client
 */

// Service port
const USERS_SERVICE_PORT = 3005;

/**
 * Make a request to the Users service
 */
async function usersServiceRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    params?: Record<string, string>;
    token?: string;
  } = {}
): Promise<{ success: boolean; data?: T; error?: string; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
  const { method = 'GET', body, params, token } = options;

  // Build URL with gateway port transformation
  let url = `/api/${endpoint}?XTransformPort=${USERS_SERVICE_PORT}`;

  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `&${searchParams.toString()}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Users Service Client] Request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'EDITOR' | 'ADMIN';
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    UserSession?: number;
    Bookmark?: number;
    Collection?: number;
  };
}

export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Auth API
 */
export const authApi = {
  /**
   * Register a new user
   */
  async register(email: string, password: string, name?: string): Promise<{ success: boolean; data?: AuthResponse; error?: string }> {
    return usersServiceRequest('auth/register', {
      method: 'POST',
      body: { email, password, name },
    });
  },

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ success: boolean; data?: AuthResponse; error?: string }> {
    return usersServiceRequest('auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  /**
   * Verify token
   */
  async verifyToken(token: string): Promise<{ success: boolean; data?: User; error?: string }> {
    return usersServiceRequest('auth/verify', {
      method: 'POST',
      token,
    });
  },
};

/**
 * Users API
 */
export const usersApi = {
  /**
   * Get all users (admin only)
   */
  async getAll(options?: { page?: number; limit?: number }, token?: string): Promise<{
    success: boolean;
    data?: User[];
    error?: string;
    pagination?: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const params: Record<string, string> = {};
    if (options?.page) params.page = String(options.page);
    if (options?.limit) params.limit = String(options.limit);

    return usersServiceRequest('users', { params, token });
  },

  /**
   * Get a specific user by ID
   */
  async getById(id: string, token?: string): Promise<{ success: boolean; data?: User; error?: string }> {
    return usersServiceRequest(`users/${id}`, { token });
  },

  /**
   * Update a user
   */
  async update(id: string, data: { name?: string; role?: 'USER' | 'EDITOR' | 'ADMIN' }, token?: string): Promise<{ success: boolean; data?: User; error?: string }> {
    return usersServiceRequest(`users/${id}`, {
      method: 'PUT',
      body: data,
      token,
    });
  },

  /**
   * Delete a user
   */
  async delete(id: string, token?: string): Promise<{ success: boolean; error?: string }> {
    return usersServiceRequest(`users/${id}`, {
      method: 'DELETE',
      token,
    });
  },
};

/**
 * Health check for Users service
 */
export async function checkUsersServiceHealth(): Promise<{ status: string; uptime: number }> {
  try {
    const response = await fetch(`/api/health?XTransformPort=${USERS_SERVICE_PORT}`);
    return response.json();
  } catch {
    return { status: 'unhealthy', uptime: 0 };
  }
}

// Export all APIs
export default {
  auth: authApi,
  users: usersApi,
  checkHealth: checkUsersServiceHealth,
};
