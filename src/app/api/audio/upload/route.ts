import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * POST /api/audio/upload
 * Upload audio file
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const recitationId = formData.get('recitationId') as string | null;
    const ayahId = formData.get('ayahId') as string | null;
    const processNow = formData.get('processNow') === 'true';

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      );
    }

    if (!recitationId || !ayahId) {
      return NextResponse.json(
        {
          success: false,
          error: 'recitationId and ayahId are required',
        },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/aac', 'audio/wav', 'audio/ogg'];
    const allowedExtensions = ['.mp3', '.aac', '.wav', '.ogg', '.m4a'];

    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Allowed: MP3, AAC, WAV, OGG',
        },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: 'File size exceeds 50MB limit',
        },
        { status: 400 }
      );
    }

    // Save file temporarily
    const tempDir = join(process.cwd(), 'temp', 'audio');
    await mkdir(tempDir, { recursive: true });

    const timestamp = Date.now();
    const tempFileName = `${recitationId}_${ayahId}_${timestamp}${fileExtension}`;
    const tempPath = join(tempDir, tempFileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(tempPath, buffer);

    // Create audio file record
    const audioFileId = `${recitationId}_${ayahId}_${timestamp}`;

    const audioFile = await db.audioFile.create({
      data: {
        id: audioFileId,
        recitationId,
        ayahId: parseInt(ayahId),
        format: 'mp3',
        fileSize: file.size,
        status: 'pending',
      },
    });

    // Process in background if requested
    if (processNow) {
      // Start async processing
      processAudioAsync(tempPath, audioFileId, recitationId, parseInt(ayahId)).catch(
        (error) => {
          console.error('[Audio Upload] Background processing failed:', error);
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: audioFile.id,
        status: audioFile.status,
        fileName: file.name,
        fileSize: file.size,
        message: processNow
          ? 'Audio uploaded and processing started'
          : 'Audio uploaded successfully. Call /api/audio/process to start processing.',
      },
    });
  } catch (error) {
    console.error('[Audio Upload] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * Background audio processing
 */
async function processAudioAsync(
  tempPath: string,
  audioFileId: string,
  recitationId: string,
  ayahId: number
): Promise<void> {
  try {
    // Update status to processing
    await db.audioFile.update({
      where: { id: audioFileId },
      data: { status: 'processing' },
    });

    // Import HLS converter
    const { convertToHLS } = await import('@/services/audio/hls-converter');
    const { uploadFile } = await import('@/services/audio/storage');
    const { getAudioMetadata } = await import('@/services/audio/hls-converter');

    // Get audio metadata
    const metadata = await getAudioMetadata(tempPath);

    // Convert to HLS
    const outputDir = tempPath.replace(/\.[^.]+$/, '_hls');
    const result = await convertToHLS({
      inputPath: tempPath,
      outputDir,
      segmentDuration: 10,
      bitrates: [64, 128, 192],
    });

    // Upload to storage
    const key = `audio/hls/${recitationId}/${ayahId}`;
    await uploadFile(result.playlistUrl, `${key}/master.m3u8`, 'application/vnd.apple.mpegurl');

    // Update record
    await db.audioFile.update({
      where: { id: audioFileId },
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

    // Clean up temp files
    const { unlink, rm } = await import('fs/promises');
    await unlink(tempPath).catch(() => {});
    await rm(outputDir, { recursive: true }).catch(() => {});

    console.log(`[Audio Upload] Processed successfully: ${audioFileId}`);
  } catch (error) {
    console.error(`[Audio Upload] Processing failed for ${audioFileId}:`, error);

    await db.audioFile.update({
      where: { id: audioFileId },
      data: {
        status: 'error',
      },
    });
  }
}
