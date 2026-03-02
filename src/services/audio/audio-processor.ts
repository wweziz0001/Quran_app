/**
 * Audio Processor Service
 * Handles audio processing tasks
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import { getAudioDuration, getAudioMetadata, normalizeAudio } from './hls-converter';

// Processing jobs storage
const processingJobs = new Map<string, ProcessingJob>();

export interface ProcessingJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  inputPath: string;
  outputPath?: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  metadata?: {
    duration?: number;
    bitrate?: number;
    format?: string;
  };
}

export interface AudioValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    duration: number;
    bitrate: number;
    sampleRate: number;
    channels: number;
    format: string;
  };
}

/**
 * Create processing job
 */
export function createProcessingJob(
  id: string,
  inputPath: string
): ProcessingJob {
  const job: ProcessingJob = {
    id,
    status: 'pending',
    progress: 0,
    inputPath,
    startedAt: new Date(),
  };

  processingJobs.set(id, job);
  return job;
}

/**
 * Get processing job
 */
export function getProcessingJob(id: string): ProcessingJob | null {
  return processingJobs.get(id) || null;
}

/**
 * Update job status
 */
function updateJob(id: string, update: Partial<ProcessingJob>): void {
  const job = processingJobs.get(id);
  if (job) {
    processingJobs.set(id, { ...job, ...update });
  }
}

/**
 * Process audio file
 */
export async function processAudioFile(
  inputPath: string,
  options: {
    normalize?: boolean;
    targetDb?: number;
    outputFormat?: 'mp3' | 'wav' | 'aac';
    outputBitrate?: number;
    outputPath?: string;
  } = {}
): Promise<string> {
  const {
    normalize = true,
    targetDb = -16,
    outputFormat = 'mp3',
    outputBitrate = 128,
    outputPath,
  } = options;

  const finalOutputPath =
    outputPath || inputPath.replace(/\.[^.]+$/, `_processed.${outputFormat}`);

  let currentPath = inputPath;

  // Normalize audio if requested
  if (normalize) {
    const normalizedPath = inputPath.replace(
      /\.[^.]+$/,
      `_normalized.${outputFormat}`
    );
    try {
      await normalizeAudio(currentPath, normalizedPath, targetDb);
      currentPath = normalizedPath;
    } catch {
      // Continue without normalization if it fails
    }
  }

  // Convert format if needed
  if (currentPath !== finalOutputPath) {
    await convertAudio(currentPath, finalOutputPath, outputFormat, outputBitrate);
  }

  // Clean up intermediate files
  if (currentPath !== inputPath) {
    await fs.unlink(currentPath).catch(() => {});
  }

  return finalOutputPath;
}

/**
 * Convert audio format
 */
async function convertAudio(
  inputPath: string,
  outputPath: string,
  format: string,
  bitrate: number
): Promise<void> {
  const codecMap: Record<string, string> = {
    mp3: 'libmp3lame',
    wav: 'pcm_s16le',
    aac: 'aac',
    ogg: 'libvorbis',
  };

  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-c:a', codecMap[format] || 'libmp3lame',
      '-b:a', `${bitrate}k`,
      '-y',
      outputPath,
    ];

    const ffmpeg = spawn('ffmpeg', args);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg conversion failed: ${stderr}`));
      }
    });

    ffmpeg.on('error', reject);
  });
}

/**
 * Validate audio file
 */
export async function validateAudioFile(filePath: string): Promise<AudioValidation> {
  const result: AudioValidation = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  try {
    // Check file exists
    const stats = await fs.stat(filePath);

    // Check file size (max 100MB)
    if (stats.size > 100 * 1024 * 1024) {
      result.errors.push('File size exceeds 100MB limit');
      result.isValid = false;
    }

    // Check file size (min 1KB)
    if (stats.size < 1024) {
      result.errors.push('File size is too small');
      result.isValid = false;
    }

    // Get metadata
    const metadata = await getAudioMetadata(filePath);
    result.metadata = metadata;

    // Validate duration (max 30 minutes)
    if (metadata.duration > 30 * 60) {
      result.errors.push('Audio duration exceeds 30 minutes limit');
      result.isValid = false;
    }

    // Validate sample rate
    if (metadata.sampleRate < 22050) {
      result.warnings.push('Low sample rate detected');
    }

    // Validate bitrate
    if (metadata.bitrate < 64000) {
      result.warnings.push('Low bitrate detected');
    }
  } catch (error) {
    result.errors.push(`Failed to read file: ${(error as Error).message}`);
    result.isValid = false;
  }

  return result;
}

/**
 * Extract audio segment
 */
export async function extractAudioSegment(
  inputPath: string,
  startTime: number,
  endTime: number,
  outputPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-ss', startTime.toString(),
      '-to', endTime.toString(),
      '-c:a', 'aac',
      '-b:a', '128k',
      '-y',
      outputPath,
    ];

    const ffmpeg = spawn('ffmpeg', args);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`Segment extraction failed: ${stderr}`));
      }
    });

    ffmpeg.on('error', reject);
  });
}

/**
 * Concatenate audio files
 */
export async function concatenateAudio(
  inputPaths: string[],
  outputPath: string
): Promise<string> {
  // Create file list
  const listContent = inputPaths.map((p) => `file '${p}'`).join('\n');
  const listPath = outputPath.replace(/\.[^.]+$/, '_list.txt');

  await fs.writeFile(listPath, listContent);

  return new Promise((resolve, reject) => {
    const args = [
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-y',
      outputPath,
    ];

    const ffmpeg = spawn('ffmpeg', args);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', async (code) => {
      await fs.unlink(listPath).catch(() => {});

      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`Concatenation failed: ${stderr}`));
      }
    });

    ffmpeg.on('error', reject);
  });
}

/**
 * Split audio into segments
 */
export async function splitAudioIntoSegments(
  inputPath: string,
  outputDir: string,
  segmentDuration: number = 10
): Promise<string[]> {
  await fs.mkdir(outputDir, { recursive: true });

  const duration = await getAudioDuration(inputPath);
  const segments: string[] = [];

  for (let start = 0; start < duration; start += segmentDuration) {
    const end = Math.min(start + segmentDuration, duration);
    const segmentPath = path.join(outputDir, `segment_${segments.length}.mp3`);

    await extractAudioSegment(inputPath, start, end, segmentPath);
    segments.push(segmentPath);
  }

  return segments;
}

/**
 * Generate waveform data
 */
export async function generateWaveform(
  inputPath: string,
  samples: number = 1000
): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-ac', '1',
      '-filter:a', `aresample=${samples}`,
      '-f', 's16le',
      'pipe:1',
    ];

    const ffmpeg = spawn('ffmpeg', args);
    const chunks: Buffer[] = [];

    ffmpeg.stdout.on('data', (data: Buffer) => {
      chunks.push(data);
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        const buffer = Buffer.concat(chunks);
        const waveform: number[] = [];

        for (let i = 0; i < buffer.length; i += 2) {
          const sample = buffer.readInt16LE(i);
          waveform.push(sample / 32768);
        }

        resolve(waveform);
      } else {
        reject(new Error('Waveform generation failed'));
      }
    });

    ffmpeg.on('error', reject);
  });
}

/**
 * Batch process audio files
 */
export async function batchProcessAudio(
  jobs: Array<{
    id: string;
    inputPath: string;
    options?: Parameters<typeof processAudioFile>[1];
  }>,
  onProgress?: (id: string, progress: number, total: number) => void
): Promise<Record<string, { success: boolean; outputPath?: string; error?: string }>> {
  const results: Record<string, {
    success: boolean;
    outputPath?: string;
    error?: string;
  }> = {};

  let completed = 0;

  for (const job of jobs) {
    createProcessingJob(job.id, job.inputPath);
    updateJob(job.id, { status: 'processing' });

    try {
      const outputPath = await processAudioFile(job.inputPath, job.options);

      results[job.id] = { success: true, outputPath };
      updateJob(job.id, {
        status: 'completed',
        progress: 100,
        outputPath,
        completedAt: new Date(),
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      results[job.id] = { success: false, error: errorMessage };
      updateJob(job.id, { status: 'error', error: errorMessage });
    }

    completed++;
    onProgress?.(job.id, completed, jobs.length);
  }

  return results;
}

/**
 * Cleanup old jobs
 */
export function cleanupOldJobs(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
  const now = Date.now();
  let removed = 0;

  for (const [id, job] of processingJobs.entries()) {
    const age = now - job.startedAt.getTime();
    if (age > maxAgeMs) {
      processingJobs.delete(id);
      removed++;
    }
  }

  return removed;
}

export default {
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
};
