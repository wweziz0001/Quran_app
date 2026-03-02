import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/audio/process
 * Process audio file
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioFileId, options } = body;

    if (!audioFileId) {
      return NextResponse.json(
        {
          success: false,
          error: 'audioFileId is required',
        },
        { status: 400 }
      );
    }

    // Get audio file record
    const audioFile = await db.audioFile.findUnique({
      where: { id: audioFileId },
    });

    if (!audioFile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Audio file not found',
        },
        { status: 404 }
      );
    }

    if (audioFile.status === 'processing') {
      return NextResponse.json({
        success: false,
        error: 'Audio is already being processed',
        data: {
          id: audioFile.id,
          status: audioFile.status,
          progress: 0,
        },
      });
    }

    if (audioFile.status === 'ready') {
      return NextResponse.json({
        success: true,
        message: 'Audio is already processed',
        data: {
          id: audioFile.id,
          status: audioFile.status,
          hlsPlaylistUrl: audioFile.hlsPlaylistUrl,
        },
      });
    }

    // Start processing (in background)
    processAudio(audioFile, options).catch((error) => {
      console.error('[Audio Process] Background processing failed:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Processing started',
      data: {
        id: audioFile.id,
        status: 'processing',
      },
    });
  } catch (error) {
    console.error('[Audio Process] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start processing',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/audio/process
 * Get processing status
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const audioFileId = searchParams.get('audioFileId');

  if (!audioFileId) {
    return NextResponse.json(
      {
        success: false,
        error: 'audioFileId is required',
      },
      { status: 400 }
    );
  }

  const audioFile = await db.audioFile.findUnique({
    where: { id: audioFileId },
  });

  if (!audioFile) {
    return NextResponse.json(
      {
        success: false,
        error: 'Audio file not found',
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: audioFile.id,
      status: audioFile.status,
      format: audioFile.format,
      durationMs: audioFile.durationMs,
      bitrate: audioFile.bitrate,
      hlsPlaylistUrl: audioFile.hlsPlaylistUrl,
      processedAt: audioFile.processedAt,
    },
  });
}

/**
 * Process audio file
 */
async function processAudio(
  audioFile: {
    id: string;
    recitationId: string;
    ayahId: number;
  },
  options?: {
    segmentDuration?: number;
    bitrates?: number[];
    normalize?: boolean;
  }
): Promise<void> {
  const { segmentDuration = 10, bitrates = [64, 128, 192], normalize = true } = options || {};

  try {
    // Update status
    await db.audioFile.update({
      where: { id: audioFile.id },
      data: { status: 'processing' },
    });

    // Find temp file
    const { readdir } = await import('fs/promises');
    const { join } = await import('path');
    const tempDir = join(process.cwd(), 'temp', 'audio');

    const files = await readdir(tempDir);
    const tempFile = files.find(
      (f) => f.startsWith(`${audioFile.recitationId}_${audioFile.ayahId}`)
    );

    if (!tempFile) {
      throw new Error('Temp file not found');
    }

    const inputPath = join(tempDir, tempFile);

    // Import services
    const { convertToHLS } = await import('@/services/audio/hls-converter');
    const { uploadFile } = await import('@/services/audio/storage');
    const { getAudioMetadata } = await import('@/services/audio/hls-converter');

    // Get metadata
    const metadata = await getAudioMetadata(inputPath);

    // Convert to HLS
    const outputDir = join(tempDir, `${audioFile.id}_hls`);
    const result = await convertToHLS({
      inputPath,
      outputDir,
      segmentDuration,
      bitrates,
    });

    // Upload to storage
    const key = `audio/hls/${audioFile.recitationId}/${audioFile.ayahId}`;
    await uploadFile(result.playlistUrl, `${key}/master.m3u8`, 'application/vnd.apple.mpegurl');

    // Upload segments
    for (const segment of result.segments) {
      const segmentName = segment.split('/').pop() || '';
      await uploadFile(segment, `${key}/${segmentName}`, 'video/mp2t');
    }

    // Update record
    await db.audioFile.update({
      where: { id: audioFile.id },
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

    // Cleanup
    const { unlink, rm } = await import('fs/promises');
    await unlink(inputPath).catch(() => {});
    await rm(outputDir, { recursive: true }).catch(() => {});

    console.log(`[Audio Process] Completed: ${audioFile.id}`);
  } catch (error) {
    console.error(`[Audio Process] Failed for ${audioFile.id}:`, error);

    await db.audioFile.update({
      where: { id: audioFile.id },
      data: { status: 'error' },
    });
  }
}
