// Standard API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Service Health
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    database: boolean;
    cache?: boolean;
    external?: boolean;
  };
}

// User Context (from JWT)
export interface UserContext {
  userId: string;
  email: string;
  role: 'USER' | 'EDITOR' | 'ADMIN';
  iat: number;
  exp: number;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
