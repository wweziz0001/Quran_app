/**
 * Pre-signed URLs Service
 * Generates and validates secure URLs for audio streaming
 */

import { createHash, randomBytes } from 'crypto';

// Configuration
const SECRET_KEY = process.env.PRESIGNED_SECRET || 'quran-audio-presigned-secret';
const DEFAULT_EXPIRY = 3600; // 1 hour

// Token store
const tokenStore = new Map<string, PresignedToken>();

// Rate limiting
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

export interface PresignedUrlOptions {
  key: string;
  expiresIn?: number;
  ip?: string;
  userAgent?: string;
  rateLimit?: number;
  metadata?: Record<string, unknown>;
}

export interface PresignedToken {
  key: string;
  expiresAt: number;
  signature: string;
  nonce: string;
  ip?: string;
  createdAt: number;
}

/**
 * Generate pre-signed URL
 */
export function generatePresignedUrl(options: PresignedUrlOptions): string {
  const {
    key,
    expiresIn = DEFAULT_EXPIRY,
    ip,
  } = options;

  const expiresAt = Date.now() + expiresIn * 1000;
  const nonce = randomBytes(16).toString('hex');
  const signature = generateSignature(key, expiresAt, nonce, ip);

  const token: PresignedToken = {
    key,
    expiresAt,
    signature,
    nonce,
    ip,
    createdAt: Date.now(),
  };

  tokenStore.set(nonce, token);

  const encodedToken = encodeToken(token);

  return `/api/audio/stream?token=${encodedToken}`;
}

/**
 * Generate signature
 */
function generateSignature(
  key: string,
  expiresAt: number,
  nonce: string,
  ip?: string
): string {
  const data = `${key}:${expiresAt}:${nonce}:${ip || ''}:${SECRET_KEY}`;
  return createHash('sha256').update(data).digest('hex').slice(0, 32);
}

/**
 * Encode token
 */
function encodeToken(token: PresignedToken): string {
  const json = JSON.stringify(token);
  return Buffer.from(json).toString('base64url');
}

/**
 * Decode token
 */
function decodeToken(encoded: string): PresignedToken | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString();
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Validate pre-signed URL
 */
export function validatePresignedUrl(
  encodedToken: string,
  ip?: string
): { valid: boolean; key?: string; error?: string } {
  const token = decodeToken(encodedToken);

  if (!token) {
    return { valid: false, error: 'Invalid token format' };
  }

  // Check expiration
  if (Date.now() > token.expiresAt) {
    return { valid: false, error: 'Token expired' };
  }

  // Verify signature
  const expectedSignature = generateSignature(
    token.key,
    token.expiresAt,
    token.nonce,
    ip
  );

  if (token.signature !== expectedSignature) {
    return { valid: false, error: 'Invalid signature' };
  }

  // Check IP if bound
  if (token.ip && ip && token.ip !== ip) {
    return { valid: false, error: 'IP address mismatch' };
  }

  // Check token store
  const stored = tokenStore.get(token.nonce);
  if (!stored) {
    return { valid: false, error: 'Token not found or already used' };
  }

  return { valid: true, key: token.key };
}

/**
 * Revoke pre-signed URL
 */
export function revokePresignedUrl(encodedToken: string): boolean {
  const token = decodeToken(encodedToken);

  if (!token) {
    return false;
  }

  return tokenStore.delete(token.nonce);
}

/**
 * Generate batch URLs
 */
export function generateBatchUrls(
  keys: string[],
  expiresIn: number = DEFAULT_EXPIRY
): Record<string, string> {
  const urls: Record<string, string> = {};

  for (const key of keys) {
    urls[key] = generatePresignedUrl({ key, expiresIn });
  }

  return urls;
}

/**
 * Cleanup expired tokens
 */
export function cleanupExpiredTokens(): number {
  const now = Date.now();
  let removed = 0;

  for (const [nonce, token] of tokenStore.entries()) {
    if (now > token.expiresAt) {
      tokenStore.delete(nonce);
      removed++;
    }
  }

  return removed;
}

/**
 * Get token statistics
 */
export function getTokenStats(): {
  total: number;
  expired: number;
  active: number;
} {
  const now = Date.now();
  let expired = 0;
  let active = 0;

  for (const token of tokenStore.values()) {
    if (now > token.expiresAt) {
      expired++;
    } else {
      active++;
    }
  }

  return {
    total: tokenStore.size,
    expired,
    active,
  };
}

/**
 * Generate signed playlist
 */
export function generateSignedPlaylist(
  segments: string[],
  expiresIn: number = DEFAULT_EXPIRY
): string {
  const signedSegments = segments.map((seg) => {
    const url = generatePresignedUrl({ key: seg, expiresIn });
    return url;
  });

  return `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
${signedSegments
  .map((url) => `#EXTINF:10.0,
${url}`)
  .join('\n')}
#EXT-X-ENDLIST`;
}

/**
 * Check rate limit
 */
export function checkRateLimit(
  ip: string,
  limit: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimiter.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Cleanup rate limiter
 */
export function cleanupRateLimiter(): number {
  const now = Date.now();
  let removed = 0;

  for (const [ip, entry] of rateLimiter.entries()) {
    if (now > entry.resetAt) {
      rateLimiter.delete(ip);
      removed++;
    }
  }

  return removed;
}

export default {
  generatePresignedUrl,
  validatePresignedUrl,
  revokePresignedUrl,
  generateBatchUrls,
  cleanupExpiredTokens,
  getTokenStats,
  generateSignedPlaylist,
  checkRateLimit,
  cleanupRateLimiter,
};
