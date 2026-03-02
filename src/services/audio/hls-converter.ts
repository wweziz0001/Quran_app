/**
 * HLS Converter Service
 * Converts audio files to HLS format with multiple quality levels
 */

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface HLSConversionResult {
  playlistUrl: string;
  segments: string[];
  duration: number;
  bitrates: number[];
}

export interface HLSConversionOptions {
  inputPath: string;
  outputDir: string;
  segmentDuration?: number; // seconds
  bitrates?: number[]; // kbps
}

const DEFAULT_BITRATES = [64, 128, 192, 256];

/**
 * Check if FFmpeg is available
 */
export function isFFmpegAvailable(): boolean {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);
    ffmpeg.on('close', (code) => resolve(code === 0));
    ffmpeg.on('error', () => resolve(false));
  });
}

/**
 * Convert audio file to HLS format with multiple bitrates
 */
export async function convertToHLS(
  options: HLSConversionOptions
): Promise<HLSConversionResult> {
  const {
    inputPath,
    outputDir,
    segmentDuration = 10,
    bitrates = DEFAULT_BITRATES,
  } = options;

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Generate HLS for each bitrate
  const playlistEntries: string[] = [];
  const allSegments: string[] = [];

  for (const bitrate of bitrates) {
    const bitrateDir = path.join(outputDir, `${bitrate}k`);
    await fs.mkdir(bitrateDir, { recursive: true });

    const playlistPath = path.join(bitrateDir, 'playlist.m3u8');
    const segmentPattern = path.join(bitrateDir, 'segment_%03d.ts');

    // FFmpeg command for HLS conversion
    const args = [
      '-i', inputPath,
      '-c:a', 'aac',
      '-b:a', `${bitrate}k`,
      '-hls_time', segmentDuration.toString(),
      '-hls_list_size', '0',
      '-hls_segment_filename', segmentPattern,
      '-f', 'hls',
      playlistPath,
    ];

    await runFFmpeg(args);

    // Read generated segments
    const files = await fs.readdir(bitrateDir);
    const segments = files.filter(f => f.endsWith('.ts'));

    allSegments.push(...segments.map(s => path.join(bitrateDir, s)));

    playlistEntries.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bitrate * 1000},NAME="${bitrate}k"
${bitrate}k/playlist.m3u8`);
  }

  // Create master playlist
  const masterPlaylist = `#EXTM3U
#EXT-X-VERSION:3
${playlistEntries.join('\n')}
`;

  const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
  await fs.writeFile(masterPlaylistPath, masterPlaylist);

  // Get duration
  const duration = await getAudioDuration(inputPath);

  return {
    playlistUrl: masterPlaylistPath,
    segments: allSegments,
    duration,
    bitrates,
  };
}

/**
 * Convert single audio to HLS (simple version)
 */
export async function convertSingleToHLS(
  inputPath: string,
  outputDir: string,
  segmentDuration: number = 10
): Promise<{ playlistPath: string; segments: string[]; duration: number }> {
  await fs.mkdir(outputDir, { recursive: true });

  const playlistPath = path.join(outputDir, 'playlist.m3u8');
  const segmentPattern = path.join(outputDir, 'segment_%03d.ts');

  const args = [
    '-i', inputPath,
    '-c:a', 'aac',
    '-b:a', '128k',
    '-hls_time', segmentDuration.toString(),
    '-hls_list_size', '0',
    '-hls_segment_filename', segmentPattern,
    '-f', 'hls',
    playlistPath,
  ];

  await runFFmpeg(args);

  const files = await fs.readdir(outputDir);
  const segments = files.filter(f => f.endsWith('.ts'));
  const duration = await getAudioDuration(inputPath);

  return {
    playlistPath,
    segments: segments.map(s => path.join(outputDir, s)),
    duration,
  };
}

/**
 * Run FFmpeg command
 */
async function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ['-y', ...args]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Get audio duration in seconds using ffprobe
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);

    let output = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        resolve(parseFloat(output.trim()));
      } else {
        reject(new Error('Failed to get audio duration'));
      }
    });

    ffprobe.on('error', () => {
      // Fallback: estimate duration from file size
      resolve(0);
    });
  });
}

/**
 * Extract audio segment (for partial loading)
 */
export async function extractSegment(
  inputPath: string,
  startTime: number,
  endTime: number,
  outputPath: string
): Promise<string> {
  const args = [
    '-i', inputPath,
    '-ss', startTime.toString(),
    '-to', endTime.toString(),
    '-c:a', 'aac',
    '-b:a', '128k',
    outputPath,
  ];

  await runFFmpeg(args);
  return outputPath;
}

/**
 * Normalize audio volume
 */
export async function normalizeAudio(
  inputPath: string,
  outputPath: string,
  targetDb: number = -16
): Promise<string> {
  const args = [
    '-i', inputPath,
    '-af', `loudnorm=I=${targetDb}dB`,
    '-c:a', 'aac',
    '-b:a', '128k',
    outputPath,
  ];

  await runFFmpeg(args);
  return outputPath;
}

/**
 * Convert audio format
 */
export async function convertFormat(
  inputPath: string,
  outputPath: string,
  format: 'mp3' | 'aac' | 'wav' | 'ogg' = 'mp3',
  bitrate: number = 128
): Promise<string> {
  const codecMap = {
    mp3: 'libmp3lame',
    aac: 'aac',
    wav: 'pcm_s16le',
    ogg: 'libvorbis',
  };

  const args = [
    '-i', inputPath,
    '-c:a', codecMap[format],
    '-b:a', `${bitrate}k`,
    outputPath,
  ];

  await runFFmpeg(args);
  return outputPath;
}

/**
 * Get audio metadata
 */
export async function getAudioMetadata(filePath: string): Promise<{
  duration: number;
  bitrate: number;
  sampleRate: number;
  channels: number;
  format: string;
}> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration,bit_rate:stream=sample_rate,channels,codec_name',
      '-of', 'json',
      filePath,
    ]);

    let output = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          const data = JSON.parse(output);
          const format = data.format || {};
          const stream = data.streams?.[0] || {};

          resolve({
            duration: parseFloat(format.duration) || 0,
            bitrate: parseInt(format.bit_rate) || 128000,
            sampleRate: parseInt(stream.sample_rate) || 44100,
            channels: parseInt(stream.channels) || 2,
            format: stream.codec_name || 'unknown',
          });
        } catch {
          resolve({
            duration: 0,
            bitrate: 128000,
            sampleRate: 44100,
            channels: 2,
            format: 'unknown',
          });
        }
      } else {
        reject(new Error('Failed to get audio metadata'));
      }
    });

    ffprobe.on('error', () => {
      resolve({
        duration: 0,
        bitrate: 128000,
        sampleRate: 44100,
        channels: 2,
        format: 'unknown',
      });
    });
  });
}

export default {
  isFFmpegAvailable,
  convertToHLS,
  convertSingleToHLS,
  getAudioDuration,
  extractSegment,
  normalizeAudio,
  convertFormat,
  getAudioMetadata,
};
