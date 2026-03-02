#!/usr/bin/env bun

/**
 * Convert audio files to HLS format
 * Usage: bun run scripts/convert-to-hls.ts --recitation=ar.alafasy --start=1 --end=10
 */

import { db } from '../src/lib/db';
import { convertToHLS, getAudioMetadata, isFFmpegAvailable } from '../src/services/audio/hls-converter';
import { uploadFile } from '../src/services/audio/storage';
import { writeFile, mkdir, unlink, rm } from 'fs/promises';
import { join } from 'path';

interface ConversionOptions {
  recitationId?: string;
  startAyah?: number;
  endAyah?: number;
  bitrates?: number[];
  segmentDuration?: number;
  overwrite?: boolean;
}

async function main() {
  const args = process.argv.slice(2);
  const options: ConversionOptions = {};

  // Parse arguments
  for (const arg of args) {
    const [key, value] = arg.replace('--', '').split('=');
    if (key === 'recitation') options.recitationId = value;
    if (key === 'start') options.startAyah = parseInt(value);
    if (key === 'end') options.endAyah = parseInt(value);
    if (key === 'bitrates') options.bitrates = value.split(',').map(Number);
    if (key === 'segment') options.segmentDuration = parseInt(value);
    if (key === 'overwrite') options.overwrite = true;
  }

  console.log('='.repeat(60));
  console.log('Audio to HLS Converter');
  console.log('='.repeat(60));
  console.log('Options:', options);
  console.log('');

  // Check FFmpeg
  const ffmpegAvailable = await isFFmpegAvailable();
  if (!ffmpegAvailable) {
    console.error('❌ FFmpeg is not available. Please install FFmpeg first.');
    console.error('   Ubuntu/Debian: sudo apt-get install ffmpeg');
    console.error('   macOS: brew install ffmpeg');
    process.exit(1);
  }

  console.log('✅ FFmpeg is available');

  // Get recitations to process
  let recitations: { id: string }[] = [];
  if (options.recitationId) {
    recitations = [{ id: options.recitationId }];
  } else {
    recitations = await db.recitation.findMany({
      where: { isActive: true },
      select: { id: true },
    });
  }

  console.log(`📚 Found ${recitations.length} recitations to process`);

  const tempDir = join(process.cwd(), 'temp', 'hls');
  await mkdir(tempDir, { recursive: true });

  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const recitation of recitations) {
    console.log('');
    console.log(`🎙️ Processing recitation: ${recitation.id}`);

    // Get audio files for this recitation
    const startId = options.startAyah || 1;
    const endId = options.endAyah || 6236;

    const audioFiles = await db.audioFile.findMany({
      where: {
        recitationId: recitation.id,
        ayahId: { gte: startId, lte: endId },
        status: options.overwrite ? undefined : 'ready',
      },
      orderBy: { ayahId: 'asc' },
    });

    // Get recitation ayahs
    const recitationAyahs = await db.recitationAyah.findMany({
      where: {
        recitationId: recitation.id,
        ayahId: { gte: startId, lte: endId },
      },
      orderBy: { ayahId: 'asc' },
    });

    console.log(`   Found ${recitationAyahs.length} ayahs to process`);

    for (const ayah of recitationAyahs) {
      const existingFile = audioFiles.find((f) => f.ayahId === ayah.ayahId);

      if (existingFile && !options.overwrite) {
        console.log(`   ⏭️ Ayah ${ayah.ayahId}: Already converted`);
        totalSkipped++;
        continue;
      }

      try {
        // Get audio URL
        const audioBaseUrl = process.env.AUDIO_BASE_URL || 'https://cdn.islamic.network/audio';
        const audioUrl = ayah.audioUrl || `${audioBaseUrl}/${recitation.id}/${ayah.ayahId}.mp3`;

        // Download audio
        const tempFile = join(tempDir, `${recitation.id}_${ayah.ayahId}.mp3`);

        const response = await fetch(audioUrl);
        if (!response.ok) {
          console.log(`   ❌ Ayah ${ayah.ayahId}: Failed to download (${response.status})`);
          totalErrors++;
          continue;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        await writeFile(tempFile, buffer);

        // Convert to HLS
        const outputDir = join(tempDir, `${recitation.id}_${ayah.ayahId}_hls`);

        const result = await convertToHLS({
          inputPath: tempFile,
          outputDir,
          segmentDuration: options.segmentDuration || 10,
          bitrates: options.bitrates || [64, 128, 192],
        });

        // Upload to storage
        const key = `audio/hls/${recitation.id}/${ayah.ayahId}`;
        await uploadFile(result.playlistUrl, `${key}/master.m3u8`, 'application/vnd.apple.mpegurl');

        // Update database
        const metadata = await getAudioMetadata(tempFile);

        if (existingFile) {
          await db.audioFile.update({
            where: { id: existingFile.id },
            data: {
              format: 'hls',
              hlsPlaylistUrl: `${key}/master.m3u8`,
              hlsSegmentsUrl: `${key}/`,
              durationMs: Math.round(result.duration * 1000),
              bitrate: metadata.bitrate,
              sampleRate: metadata.sampleRate,
              channels: metadata.channels,
              status: 'ready',
              processedAt: new Date(),
            },
          });
        } else {
          await db.audioFile.create({
            data: {
              id: `${recitation.id}_${ayah.ayahId}`,
              recitationId: recitation.id,
              ayahId: ayah.ayahId,
              format: 'hls',
              hlsPlaylistUrl: `${key}/master.m3u8`,
              hlsSegmentsUrl: `${key}/`,
              durationMs: Math.round(result.duration * 1000),
              bitrate: metadata.bitrate,
              sampleRate: metadata.sampleRate,
              channels: metadata.channels,
              fileSize: buffer.length,
              status: 'ready',
              processedAt: new Date(),
            },
          });
        }

        // Cleanup
        await unlink(tempFile).catch(() => {});
        await rm(outputDir, { recursive: true }).catch(() => {});

        console.log(`   ✅ Ayah ${ayah.ayahId}: Converted (${result.duration.toFixed(1)}s, ${result.bitrates.length} bitrates)`);
        totalProcessed++;
      } catch (error) {
        console.log(`   ❌ Ayah ${ayah.ayahId}: ${(error as Error).message}`);
        totalErrors++;
      }
    }
  }

  // Cleanup temp directory
  await rm(tempDir, { recursive: true }).catch(() => {});

  console.log('');
  console.log('='.repeat(60));
  console.log('Conversion Complete');
  console.log('='.repeat(60));
  console.log(`✅ Processed: ${totalProcessed}`);
  console.log(`⏭️ Skipped: ${totalSkipped}`);
  console.log(`❌ Errors: ${totalErrors}`);
  console.log('');
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
