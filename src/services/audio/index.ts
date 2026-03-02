/**
 * Audio Services - Main Export
 * Audio streaming and processing capabilities for Quran Platform
 */

// HLS Converter
export {
  isFFmpegAvailable,
  convertToHLS,
  convertSingleToHLS,
  getAudioDuration,
  extractSegment,
  normalizeAudio,
  convertFormat,
  getAudioMetadata,
  type HLSConversionResult,
  type HLSConversionOptions,
} from './hls-converter';

// Storage
export {
  uploadFile,
  uploadBuffer,
  getPresignedUrl,
  verifyPresignedToken,
  readFile,
  readFileStream,
  deleteFile,
  deleteDirectory,
  fileExists,
  getFileInfo,
  listFiles,
  uploadBatch,
  getStorageStats,
  type StorageConfig,
  type UploadResult,
  type FileInfo,
} from './storage';

// Cache
export {
  initRedisClient,
  getCachedUrl,
  cacheUrl,
  getOrSet,
  invalidateCache,
  invalidatePattern,
  cacheAudioMetadata,
  getCachedAudioMetadata,
  cachePlaylist,
  getCachedPlaylist,
  cacheSegmentUrls,
  getCachedSegmentUrls,
  warmCache,
  getCacheStats,
  clearCache,
} from './cache';

// Audio Processor
export {
  createProcessingJob,
  getProcessingJob,
  processAudioFile,
  validateAudioFile,
  extractAudioSegment,
  concatenateAudio,
  splitAudioIntoSegments,
  generateWaveform,
  batchProcessAudio,
  cleanupOldJobs,
  type ProcessingJob,
  type AudioValidation,
} from './audio-processor';

// Pre-signed URLs
export {
  generatePresignedUrl,
  validatePresignedUrl,
  revokePresignedUrl,
  generateBatchUrls,
  cleanupExpiredTokens,
  getTokenStats,
  generateSignedPlaylist,
  checkRateLimit,
  cleanupRateLimiter,
  type PresignedUrlOptions,
  type PresignedToken,
} from './pre-signed';

/**
 * Initialize audio services
 */
export async function initializeAudioServices(): Promise<{
  ffmpeg: boolean;
  storage: boolean;
  cache: boolean;
}> {
  const results = {
    ffmpeg: false,
    storage: true,
    cache: true,
  };

  // Check FFmpeg availability
  const { isFFmpegAvailable } = await import('./hls-converter');
  results.ffmpeg = await isFFmpegAvailable();

  // Initialize storage directory
  const fs = await import('fs/promises');
  const storagePath = process.env.LOCAL_STORAGE_PATH || './storage/audio';

  try {
    await fs.mkdir(storagePath, { recursive: true });
  } catch {
    results.storage = false;
  }

  // Initialize cache
  const { initRedisClient } = await import('./cache');
  await initRedisClient();

  console.log('[Audio Services] Initialization complete:', results);

  return results;
}

/**
 * Health check for audio services
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, { status: string; details?: string }>;
}> {
  const services: Record<string, { status: string; details?: string }> = {};

  // Check FFmpeg
  const { isFFmpegAvailable } = await import('./hls-converter');
  const ffmpegAvailable = await isFFmpegAvailable();
  services.ffmpeg = {
    status: ffmpegAvailable ? 'ok' : 'unavailable',
    details: ffmpegAvailable ? 'FFmpeg is available' : 'FFmpeg not found',
  };

  // Check storage
  const { getStorageStats } = await import('./storage');
  try {
    const stats = await getStorageStats();
    services.storage = {
      status: 'ok',
      details: `${stats.totalFiles} files, ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`,
    };
  } catch (error) {
    services.storage = {
      status: 'error',
      details: (error as Error).message,
    };
  }

  // Check cache
  const { getCacheStats } = await import('./cache');
  try {
    const stats = await getCacheStats();
    services.cache = {
      status: 'ok',
      details: `${stats.totalEntries} cached items`,
    };
  } catch (error) {
    services.cache = {
      status: 'error',
      details: (error as Error).message,
    };
  }

  // Determine overall status
  const statuses = Object.values(services).map((s) => s.status);
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  if (statuses.includes('error') || statuses.includes('unavailable')) {
    status = statuses.every((s) => s === 'ok')
      ? 'healthy'
      : statuses.some((s) => s === 'ok')
      ? 'degraded'
      : 'unhealthy';
  }

  return { status, services };
}

/**
 * Get audio streaming configuration
 */
export function getStreamingConfig(): {
  defaultBitrate: number;
  availableBitrates: number[];
  segmentDuration: number;
  cacheTTL: number;
  presignedExpiry: number;
} {
  return {
    defaultBitrate: 128,
    availableBitrates: [64, 128, 192, 256],
    segmentDuration: 10,
    cacheTTL: parseInt(process.env.AUDIO_CACHE_TTL || '3600'),
    presignedExpiry: parseInt(process.env.PRESIGNED_EXPIRY || '3600'),
  };
}

export default {
  initializeAudioServices,
  healthCheck,
  getStreamingConfig,
};
