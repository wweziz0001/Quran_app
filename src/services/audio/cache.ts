/**
 * Audio Cache Service
 * Redis-based caching for audio URLs and metadata
 */

// In-memory cache for development
const memoryCache = new Map<string, { data: string; expiresAt: number }>();

// Cache settings
const CACHE_PREFIX = 'audio:';
const DEFAULT_TTL = 3600; // 1 hour
const METADATA_TTL = 86400; // 24 hours

// Redis client placeholder
let redisClient: any = null;

/**
 * Initialize Redis client
 */
export async function initRedisClient(): Promise<void> {
  if (process.env.REDIS_URL) {
    try {
      console.log('[Cache] Redis would be initialized with:', process.env.REDIS_URL);
      // In production: const { createClient } = await import('redis');
    } catch (error) {
      console.error('[Cache] Redis initialization failed, using memory cache');
    }
  }
}

/**
 * Get cached URL
 */
export async function getCachedUrl(key: string): Promise<string | null> {
  const cacheKey = `${CACHE_PREFIX}url:${key}`;

  const entry = memoryCache.get(cacheKey);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(cacheKey);
    return null;
  }

  return entry.data;
}

/**
 * Cache URL
 */
export async function cacheUrl(
  key: string,
  url: string,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  const cacheKey = `${CACHE_PREFIX}url:${key}`;

  memoryCache.set(cacheKey, {
    data: url,
    expiresAt: Date.now() + ttl * 1000,
  });
}

/**
 * Get or set cache
 */
export async function getOrSet(
  key: string,
  factory: () => Promise<string>,
  ttl: number = DEFAULT_TTL
): Promise<string> {
  const cached = await getCachedUrl(key);
  if (cached) return cached;

  const url = await factory();
  await cacheUrl(key, url, ttl);

  return url;
}

/**
 * Invalidate cache
 */
export async function invalidateCache(key: string): Promise<void> {
  const cacheKey = `${CACHE_PREFIX}url:${key}`;
  memoryCache.delete(cacheKey);
}

/**
 * Invalidate cache pattern
 */
export async function invalidatePattern(pattern: string): Promise<number> {
  let count = 0;

  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
      count++;
    }
  }

  return count;
}

/**
 * Cache audio metadata
 */
export async function cacheAudioMetadata(
  recitationId: string,
  ayahId: number,
  metadata: {
    duration: number;
    bitrate: number;
    format: string;
  }
): Promise<void> {
  const key = `${CACHE_PREFIX}meta:${recitationId}:${ayahId}`;
  memoryCache.set(key, {
    data: JSON.stringify(metadata),
    expiresAt: Date.now() + METADATA_TTL * 1000,
  });
}

/**
 * Get cached audio metadata
 */
export async function getCachedAudioMetadata(
  recitationId: string,
  ayahId: number
): Promise<{ duration: number; bitrate: number; format: string } | null> {
  const key = `${CACHE_PREFIX}meta:${recitationId}:${ayahId}`;
  const entry = memoryCache.get(key);

  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return JSON.parse(entry.data);
}

/**
 * Cache playlist
 */
export async function cachePlaylist(
  recitationId: string,
  ayahId: number,
  playlist: string
): Promise<void> {
  await cacheUrl(`playlist:${recitationId}:${ayahId}`, playlist);
}

/**
 * Get cached playlist
 */
export async function getCachedPlaylist(
  recitationId: string,
  ayahId: number
): Promise<string | null> {
  return getCachedUrl(`playlist:${recitationId}:${ayahId}`);
}

/**
 * Cache segment URLs
 */
export async function cacheSegmentUrls(
  recitationId: string,
  ayahId: number,
  segments: string[]
): Promise<void> {
  await cacheUrl(`segments:${recitationId}:${ayahId}`, JSON.stringify(segments));
}

/**
 * Get cached segment URLs
 */
export async function getCachedSegmentUrls(
  recitationId: string,
  ayahId: number
): Promise<string[] | null> {
  const cached = await getCachedUrl(`segments:${recitationId}:${ayahId}`);
  return cached ? JSON.parse(cached) : null;
}

/**
 * Warm cache with popular items
 */
export async function warmCache(
  recitationIds: string[],
  limit: number = 100,
  onProgress?: (current: number, total: number) => void
): Promise<{ processed: number; errors: number }> {
  const result = { processed: 0, errors: 0 };
  const total = recitationIds.length * limit;
  let current = 0;

  for (const recitationId of recitationIds) {
    for (let ayahId = 1; ayahId <= limit; ayahId++) {
      try {
        const key = `${recitationId}:${ayahId}`;
        await getCachedUrl(key);
        result.processed++;
      } catch {
        result.errors++;
      }

      current++;
      if (onProgress && current % 100 === 0) {
        onProgress(current, total);
      }
    }
  }

  return result;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  hitRate?: number;
  missRate?: number;
}> {
  return {
    totalEntries: memoryCache.size,
  };
}

/**
 * Clear all cache
 */
export async function clearCache(): Promise<void> {
  memoryCache.clear();
}

export default {
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
};
