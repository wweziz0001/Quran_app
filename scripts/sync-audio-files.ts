#!/usr/bin/env bun

/**
 * Sync audio files from external API
 * Usage: bun run scripts/sync-audio-files.ts --recitation=ar.alafasy --source=alquran.cloud
 */

import { db } from '../src/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

interface SyncOptions {
  recitationId?: string;
  source?: string;
  startAyah?: number;
  endAyah?: number;
  force?: boolean;
}

const AUDIO_SOURCES = {
  'alquran.cloud': {
    baseUrl: 'https://cdn.islamic.network/audio',
    format: 'mp3',
  },
  'everyayah': {
    baseUrl: 'https://www.everyayah.com/data',
    format: 'mp3',
  },
};

async function main() {
  const args = process.argv.slice(2);
  const options: SyncOptions = {};

  // Parse arguments
  for (const arg of args) {
    const [key, value] = arg.replace('--', '').split('=');
    if (key === 'recitation') options.recitationId = value;
    if (key === 'source') options.source = value;
    if (key === 'start') options.startAyah = parseInt(value);
    if (key === 'end') options.endAyah = parseInt(value);
    if (key === 'force') options.force = true;
  }

  console.log('='.repeat(60));
  console.log('Audio Files Sync Tool');
  console.log('='.repeat(60));
  console.log('Options:', options);
  console.log('');

  // Get recitations to sync
  let recitations: { id: string; reciterId: string }[] = [];
  if (options.recitationId) {
    recitations = [{ id: options.recitationId, reciterId: '' }];
  } else {
    recitations = await db.recitation.findMany({
      where: { isActive: true },
      select: { id: true, reciterId: true },
    });
  }

  console.log(`📚 Found ${recitations.length} recitations to sync`);

  const tempDir = join(process.cwd(), 'temp', 'sync');
  await mkdir(tempDir, { recursive: true });

  let totalSynced = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const recitation of recitations) {
    console.log('');
    console.log(`🎙️ Syncing recitation: ${recitation.id}`);

    // Get ayahs to sync
    const startId = options.startAyah || 1;
    const endId = options.endAyah || 6236;

    const start = globalThis.performance.now();

    // Check which ayahs already have recitation ayahs
    const existingAyahs = await db.recitationAyah.findMany({
      where: {
        recitationId: recitation.id,
        ayahId: { gte: startId, lte: endId },
      },
      select: { ayahId: true },
    });

    const existingAyahIds = new Set(existingAyahs.map((a) => a.ayahId));

    // Create batch of ayahs to process
    const batch: Array<{ ayahId: number; audioUrl: string }> = [];

    for (let ayahId = startId; ayahId <= endId; ayahId++) {
      if (existingAyahIds.has(ayahId) && !options.force) {
        totalSkipped++;
        continue;
      }

      const source = options.source || 'alquran.cloud';
      const sourceConfig = AUDIO_SOURCES[source as keyof typeof AUDIO_SOURCES];

      const audioUrl = `${sourceConfig.baseUrl}/${recitation.id}/${ayahId}.${sourceConfig.format}`;

      batch.push({ ayahId, audioUrl });
    }

    console.log(`   Processing ${batch.length} ayahs...`);

    // Process in batches of 100
    const batchSize = 100;

    for (let i = 0; i < batch.length; i += batchSize) {
      const chunk = batch.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        chunk.map(async ({ ayahId, audioUrl }) => {
          // Try to fetch audio to verify it exists
          const response = await fetch(audioUrl, { method: 'HEAD' });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          // Get audio metadata
          const audioResponse = await fetch(audioUrl);
          const buffer = Buffer.from(await audioResponse.arrayBuffer());

          // Get duration (simplified - would use FFprobe in production)
          // For now, estimate based on file size (roughly 128kbps)
          const estimatedDuration = (buffer.length * 8) / 128000;

          // Create or update recitation ayah
          await db.recitationAyah.upsert({
            where: {
              recitationId_ayahId: {
                recitationId: recitation.id,
                ayahId,
              },
            },
            create: {
              recitationId: recitation.id,
              ayahId,
              audioUrl,
              durationMs: Math.round(estimatedDuration * 1000),
              format: 'mp3',
            },
            update: {
              audioUrl,
              durationMs: Math.round(estimatedDuration * 1000),
            },
          });

          return ayahId;
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          totalSynced++;
        } else {
          totalErrors++;
        }
      }

      const progress = Math.min(i + batchSize, batch.length);
      const percent = Math.round((progress / batch.length) * 100);
      const elapsed = globalThis.performance.now() - start;
      const speed = elapsed / progress;
      const remaining = (batch.length - progress) * speed;

      process.stdout.write(
        `\r   Progress: ${progress}/${batch.length} (${percent}%) | ${totalSynced} synced | ETA: ${formatTime(remaining)}`
      );
    }

    console.log('');
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Sync Complete');
  console.log('='.repeat(60));
  console.log(`✅ Synced: ${totalSynced}`);
  console.log(`⏭️ Skipped: ${totalSkipped}`);
  console.log(`❌ Errors: ${totalErrors}`);
  console.log('');
}

function formatTime(ms: number): string {
  if (ms < 1000) return '<1s';
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
