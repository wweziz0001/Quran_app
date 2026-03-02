/**
 * Audio Service Client
 * 
 * HTTP client for communicating with the Audio microservice.
 * Uses the gateway (Caddy) to route requests to the correct service.
 * 
 * @module audio-service-client
 */

// Service port
const AUDIO_SERVICE_PORT = 3002;

/**
 * Make a request to the Audio service
 */
async function audioServiceRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    params?: Record<string, string>;
  } = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const { method = 'GET', body, params } = options;
  
  // Build URL with gateway port transformation
  let url = `/api/${endpoint}?XTransformPort=${AUDIO_SERVICE_PORT}`;
  
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
    console.error('[Audio Service Client] Request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

// Types
export interface Reciter {
  id: number;
  nameArabic: string;
  nameEnglish: string;
  style: string;
  totalRecitations: number;
}

export interface Recitation {
  id: number;
  surahId: number;
  surahName: string;
  reciterId: number;
  reciterName: string;
  audioUrl: string;
  duration: number;
  format: string;
  hlsAvailable: boolean;
}

export interface StreamInfo {
  url: string;
  format: string;
  duration: number;
  bitrate: number;
  expiresIn: number;
}

export interface ProcessingJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

/**
 * Reciters API
 */
export const recitersApi = {
  /**
   * Get all reciters
   */
  async getAll(): Promise<{ success: boolean; data?: Reciter[]; error?: string }> {
    return audioServiceRequest('reciters');
  },

  /**
   * Get a specific reciter
   */
  async getById(id: number): Promise<{ success: boolean; data?: Reciter; error?: string }> {
    return audioServiceRequest(`reciters/${id}`);
  },

  /**
   * Get storage stats for a reciter
   */
  async getStats(id: number): Promise<{ success: boolean; data?: { totalFiles: number; totalSize: number }; error?: string }> {
    return audioServiceRequest(`reciters/${id}/stats`);
  },
};

/**
 * Recitations API
 */
export const recitationsApi = {
  /**
   * Get recitations for a surah
   */
  async getBySurah(surahId: number, options?: { reciterId?: number }): Promise<{ success: boolean; data?: Recitation[]; error?: string }> {
    const params: Record<string, string> = { surahId: String(surahId) };
    if (options?.reciterId) params.reciterId = String(options.reciterId);
    
    return audioServiceRequest('recitations', { params });
  },

  /**
   * Get recitations by reciter
   */
  async getByReciter(reciterId: number): Promise<{ success: boolean; data?: Recitation[]; error?: string }> {
    return audioServiceRequest(`recitations/reciter/${reciterId}`);
  },

  /**
   * Process audio file
   */
  async processAudio(audioFile: File, options?: { reciterId?: number; surahId?: number }): Promise<{ success: boolean; data?: ProcessingJob; error?: string }> {
    // For file uploads, we need to use FormData
    const formData = new FormData();
    formData.append('audio', audioFile);
    if (options?.reciterId) formData.append('reciterId', String(options.reciterId));
    if (options?.surahId) formData.append('surahId', String(options.surahId));
    
    try {
      const response = await fetch(`/api/recitations/process?XTransformPort=${AUDIO_SERVICE_PORT}`, {
        method: 'POST',
        body: formData,
      });
      
      return response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  },

  /**
   * Get processing job status
   */
  async getJobStatus(jobId: string): Promise<{ success: boolean; data?: ProcessingJob; error?: string }> {
    return audioServiceRequest(`recitations/jobs/${jobId}`);
  },

  /**
   * Convert to HLS
   */
  async convertToHls(recitationId: number): Promise<{ success: boolean; data?: { jobId: string }; error?: string }> {
    return audioServiceRequest(`recitations/${recitationId}/convert`, {
      method: 'POST',
    });
  },
};

/**
 * Stream API
 */
export const streamApi = {
  /**
   * Get streaming URL for a recitation
   */
  async getUrl(recitationId: number, options?: { bitrate?: number }): Promise<{ success: boolean; data?: StreamInfo; error?: string }> {
    const params: Record<string, string> = {};
    if (options?.bitrate) params.bitrate = String(options.bitrate);
    
    return audioServiceRequest(`stream/${recitationId}`, { params });
  },

  /**
   * Get HLS playlist for a recitation
   */
  async getHlsPlaylist(recitationId: number): Promise<{ success: boolean; data?: { playlist: string; segments: string[] }; error?: string }> {
    return audioServiceRequest(`stream/${recitationId}/hls`);
  },

  /**
   * Get pre-signed URL for secure streaming
   */
  async getPresignedUrl(recitationId: number, expiresIn?: number): Promise<{ success: boolean; data?: { url: string; token: string; expiresIn: number }; error?: string }> {
    const params: Record<string, string> = {};
    if (expiresIn) params.expiresIn = String(expiresIn);
    
    return audioServiceRequest(`stream/${recitationId}/presigned`, { params });
  },
};

/**
 * Health check for Audio service
 */
export async function checkAudioServiceHealth(): Promise<{ status: string; uptime: number; checks: { database: boolean; ffmpeg: boolean } }> {
  try {
    const response = await fetch(`/api/health?XTransformPort=${AUDIO_SERVICE_PORT}`);
    return response.json();
  } catch {
    return { status: 'unhealthy', uptime: 0, checks: { database: false, ffmpeg: false } };
  }
}

// Export all APIs
export default {
  reciters: recitersApi,
  recitations: recitationsApi,
  stream: streamApi,
  checkHealth: checkAudioServiceHealth,
};
