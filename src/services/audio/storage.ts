/**
 * Object Storage Service
 * Handles file storage for audio files (S3/MinIO compatible)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

// Configuration
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local'; // 'local' | 's3' | 'minio'
const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || './storage/audio';
const S3_BUCKET = process.env.S3_BUCKET || 'quran-audio';
const S3_REGION = process.env.S3_REGION || 'us-east-1';

export interface StorageConfig {
  type: 'local' | 's3' | 'minio';
  basePath?: string;
  bucket?: string;
  region?: string;
  endpoint?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  etag?: string;
}

export interface FileInfo {
  key: string;
  size: number;
  lastModified: Date;
  contentType: string;
}

// Secret for generating pre-signed tokens
const SECRET_KEY = process.env.STORAGE_SECRET || 'quran-audio-secret-key';

/**
 * Upload file to storage
 */
export async function uploadFile(
  localPath: string,
  key: string,
  contentType: string = 'audio/mpeg'
): Promise<UploadResult> {
  if (STORAGE_TYPE === 'local') {
    return uploadToLocal(localPath, key, contentType);
  }

  // For S3/MinIO
  return uploadToS3(localPath, key, contentType);
}

/**
 * Upload buffer to storage
 */
export async function uploadBuffer(
  buffer: Buffer,
  key: string,
  contentType: string = 'audio/mpeg'
): Promise<UploadResult> {
  if (STORAGE_TYPE === 'local') {
    return uploadBufferToLocal(buffer, key, contentType);
  }

  // For S3, write temp file first then upload
  const tempPath = `/tmp/upload_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await fs.writeFile(tempPath, buffer);
  const result = await uploadToS3(tempPath, key, contentType);
  await fs.unlink(tempPath).catch(() => {});
  return result;
}

/**
 * Upload to local storage
 */
async function uploadToLocal(
  localPath: string,
  key: string,
  contentType: string
): Promise<UploadResult> {
  const destPath = path.join(LOCAL_STORAGE_PATH, key);
  await fs.mkdir(path.dirname(destPath), { recursive: true });

  await fs.copyFile(localPath, destPath);

  const stats = await fs.stat(destPath);

  // Write metadata
  await fs.writeFile(
    `${destPath}.meta`,
    JSON.stringify({ contentType, uploadedAt: new Date().toISOString() })
  );

  return {
    key,
    url: `/api/storage/audio/${key}`,
    size: stats.size,
  };
}

/**
 * Upload buffer to local storage
 */
async function uploadBufferToLocal(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<UploadResult> {
  const destPath = path.join(LOCAL_STORAGE_PATH, key);
  await fs.mkdir(path.dirname(destPath), { recursive: true });

  await fs.writeFile(destPath, buffer);

  // Write metadata
  await fs.writeFile(
    `${destPath}.meta`,
    JSON.stringify({ contentType, uploadedAt: new Date().toISOString() })
  );

  return {
    key,
    url: `/api/storage/audio/${key}`,
    size: buffer.length,
  };
}

/**
 * Upload to S3/MinIO
 */
async function uploadToS3(
  localPath: string,
  key: string,
  contentType: string
): Promise<UploadResult> {
  // In production, use AWS SDK
  // For now, fallback to local storage
  console.log(`[S3 Upload] Would upload ${localPath} to s3://${S3_BUCKET}/${key}`);

  return uploadToLocal(localPath, key, contentType);
}

/**
 * Get pre-signed URL for file
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  if (STORAGE_TYPE === 'local') {
    // For local storage, generate a token-based URL
    const expires = Date.now() + expiresIn * 1000;
    const signature = generateSignature(key, expires);
    const token = Buffer.from(
      JSON.stringify({ key, exp: expires, sig: signature })
    ).toString('base64url');

    return `/api/storage/audio/${key}?token=${token}`;
  }

  // For S3, would generate real pre-signed URL
  return `/api/storage/audio/${key}`;
}

/**
 * Generate signature for token validation
 */
function generateSignature(key: string, expires: number): string {
  const data = `${key}:${expires}:${SECRET_KEY}`;
  return createHash('sha256').update(data).digest('hex').slice(0, 16);
}

/**
 * Verify pre-signed token
 */
export function verifyPresignedToken(token: string): { valid: boolean; key?: string } {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    const { key, exp, sig } = decoded;

    // Check expiration
    if (Date.now() > exp) {
      return { valid: false };
    }

    // Verify signature
    const expectedSig = generateSignature(key, exp);
    if (sig !== expectedSig) {
      return { valid: false };
    }

    return { valid: true, key };
  } catch {
    return { valid: false };
  }
}

/**
 * Read file from storage
 */
export async function readFile(key: string): Promise<Buffer> {
  const filePath = path.join(LOCAL_STORAGE_PATH, key);
  return fs.readFile(filePath);
}

/**
 * Read file stream
 */
export async function readFileStream(key: string): Promise<NodeJS.ReadableStream> {
  const filePath = path.join(LOCAL_STORAGE_PATH, key);
  const { createReadStream } = await import('fs');
  return createReadStream(filePath);
}

/**
 * Delete file from storage
 */
export async function deleteFile(key: string): Promise<void> {
  if (STORAGE_TYPE === 'local') {
    const filePath = path.join(LOCAL_STORAGE_PATH, key);
    await fs.unlink(filePath).catch(() => {});
    await fs.unlink(`${filePath}.meta`).catch(() => {});
    return;
  }

  // S3 implementation would go here
  console.log(`[S3 Delete] Would delete s3://${S3_BUCKET}/${key}`);
}

/**
 * Delete directory from storage
 */
export async function deleteDirectory(prefix: string): Promise<void> {
  const dirPath = path.join(LOCAL_STORAGE_PATH, prefix);
  await fs.rm(dirPath, { recursive: true, force: true }).catch(() => {});
}

/**
 * Check if file exists
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const filePath = path.join(LOCAL_STORAGE_PATH, key);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file info
 */
export async function getFileInfo(key: string): Promise<FileInfo | null> {
  try {
    const filePath = path.join(LOCAL_STORAGE_PATH, key);
    const stats = await fs.stat(filePath);

    // Read metadata if exists
    let contentType = 'application/octet-stream';
    try {
      const metaData = await fs.readFile(`${filePath}.meta`, 'utf-8');
      const meta = JSON.parse(metaData);
      contentType = meta.contentType || contentType;
    } catch {
      // No metadata file
    }

    return {
      key,
      size: stats.size,
      lastModified: stats.mtime,
      contentType,
    };
  } catch {
    return null;
  }
}

/**
 * List files in directory
 */
export async function listFiles(prefix: string): Promise<FileInfo[]> {
  const dirPath = path.join(LOCAL_STORAGE_PATH, prefix);
  const files: FileInfo[] = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && !entry.name.endsWith('.meta')) {
        const info = await getFileInfo(path.join(prefix, entry.name));
        if (info) {
          files.push(info);
        }
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return files;
}

/**
 * Upload multiple files (batch)
 */
export async function uploadBatch(
  files: Array<{ localPath: string; key: string; contentType?: string }>
): Promise<UploadResult[]> {
  return Promise.all(
    files.map(f => uploadFile(f.localPath, f.key, f.contentType || 'audio/mpeg'))
  );
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  totalFiles: number;
  totalSize: number;
  byFormat: Record<string, { count: number; size: number }>;
}> {
  const stats = {
    totalFiles: 0,
    totalSize: 0,
    byFormat: {} as Record<string, { count: number; size: number }>,
  };

  try {
    const entries = await fs.readdir(LOCAL_STORAGE_PATH, { recursive: true });

    for (const entry of entries) {
      if (typeof entry === 'string' && !entry.endsWith('.meta')) {
        const filePath = path.join(LOCAL_STORAGE_PATH, entry);
        try {
          const stat = await fs.stat(filePath);
          if (stat.isFile()) {
            stats.totalFiles++;
            stats.totalSize += stat.size;

            const ext = path.extname(entry).toLowerCase();
            if (!stats.byFormat[ext]) {
              stats.byFormat[ext] = { count: 0, size: 0 };
            }
            stats.byFormat[ext].count++;
            stats.byFormat[ext].size += stat.size;
          }
        } catch {
          // Skip files we can't access
        }
      }
    }
  } catch {
    // Storage directory doesn't exist
  }

  return stats;
}

export default {
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
};
