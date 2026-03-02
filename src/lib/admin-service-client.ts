/**
 * Admin Service Client
 *
 * HTTP client for communicating with the Admin microservice.
 * Uses the gateway (Caddy) to route requests to the correct service.
 *
 * @module admin-service-client
 */

// Service port
const ADMIN_SERVICE_PORT = 3008;

/**
 * Make a request to the Admin service
 */
async function adminServiceRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    params?: Record<string, string>;
  } = {}
): Promise<{ success: boolean; data?: T; error?: string; message?: string }> {
  const { method = 'GET', body, params } = options;

  // Build URL with gateway port transformation
  let url = `/api/${endpoint}?XTransformPort=${ADMIN_SERVICE_PORT}`;

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
    console.error('[Admin Service Client] Request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

// Types
export interface TableInfo {
  name: string;
}

export interface DatabaseStats {
  surahs: number;
  ayahs: number;
  reciters: number;
  users: number;
  tafsirs: number;
  translations: number;
}

export interface DatabaseHealth {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
}

export interface BackupInfo {
  name: string;
  size: number;
  createdAt: string;
}

export interface BackupCreateResult {
  name: string;
  path: string;
  size: number;
  createdAt: string;
}

/**
 * Database API
 */
export const databaseApi = {
  /**
   * Get all database tables
   */
  async getTables(): Promise<{ success: boolean; data?: TableInfo[]; error?: string }> {
    return adminServiceRequest('database/tables');
  },

  /**
   * Get database statistics
   */
  async getStats(): Promise<{ success: boolean; data?: DatabaseStats; error?: string }> {
    return adminServiceRequest('database/stats');
  },

  /**
   * Check database health
   */
  async checkHealth(): Promise<{ success: boolean; data?: DatabaseHealth; error?: string }> {
    return adminServiceRequest('database/health');
  },
};

/**
 * Backup API
 */
export const backupApi = {
  /**
   * List all backups
   */
  async getAll(): Promise<{ success: boolean; data?: BackupInfo[]; error?: string }> {
    return adminServiceRequest('backup');
  },

  /**
   * Create a new backup
   */
  async create(): Promise<{ success: boolean; data?: BackupCreateResult; error?: string }> {
    return adminServiceRequest('backup', {
      method: 'POST',
    });
  },

  /**
   * Delete a backup
   */
  async delete(name: string): Promise<{ success: boolean; error?: string; message?: string }> {
    return adminServiceRequest(`backup/${name}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Health check for Admin service
 */
export async function checkAdminServiceHealth(): Promise<{ status: string; uptime: number }> {
  try {
    const response = await fetch(`/api/health?XTransformPort=${ADMIN_SERVICE_PORT}`);
    return response.json();
  } catch {
    return { status: 'unhealthy', uptime: 0 };
  }
}

// Export all APIs
export default {
  database: databaseApi,
  backup: backupApi,
  checkHealth: checkAdminServiceHealth,
};
