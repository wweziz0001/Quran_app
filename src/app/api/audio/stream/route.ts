import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCachedUrl, cacheUrl } from '@/services/audio/cache';
import { getPresignedUrl } from '@/services/audio/storage';

/**
 * GET /api/audio/stream
 * Stream audio file
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const recitationId = searchParams.get('recitationId');
  const ayahId = searchParams.get('ayahId');
  const format = searchParams.get('format') || 'hls';
  const quality = searchParams.get('quality') || '128';

  if (!recitationId || !ayahId) {
    return NextResponse.json(
      {
        success: false,
        error: 'recitationId and ayahId are required',
      },
      { status: 400 }
    );
  }

  try {
    // Check for HLS audio file
    const audioFile = await db.audioFile.findFirst({
      where: {
        recitationId,
        ayahId: parseInt(ayahId),
        format: format === 'hls' ? 'hls' : 'mp3',
        status: 'ready',
      },
    });

    if (format === 'hls' && audioFile?.hlsPlaylistUrl) {
      // Check cache first
      const cacheKey = `${recitationId}:${ayahId}:hls:${quality}`;
      const cachedUrl = await getCachedUrl(cacheKey);

      if (cachedUrl) {
        return NextResponse.json({
          success: true,
          data: {
            type: 'hls',
            playlistUrl: cachedUrl,
            segmentsUrl: audioFile.hlsSegmentsUrl,
            duration: audioFile.durationMs,
            bitrate: audioFile.bitrate,
            cached: true,
          },
        });
      }

      // Generate pre-signed URL
      const streamUrl = await getPresignedUrl(audioFile.hlsPlaylistUrl, 3600);

      // Cache the URL
      await cacheUrl(cacheKey, streamUrl, 3600);

      return NextResponse.json({
        success: true,
        data: {
          type: 'hls',
          playlistUrl: streamUrl,
          segmentsUrl: audioFile.hlsSegmentsUrl,
          duration: audioFile.durationMs,
          bitrate: audioFile.bitrate,
        },
      });
    }

    // Fallback to direct audio URL
    const recitationAyah = await db.recitationAyah.findFirst({
      where: {
        recitationId,
        ayahId: parseInt(ayahId),
      },
      include: {
        Recitation: {
          include: { Reciter: true },
        },
      },
    });

    if (!recitationAyah) {
      return NextResponse.json(
        {
          success: false,
          error: 'Audio not found',
        },
        { status: 404 }
      );
    }

    // Get audio URL
    const audioBaseUrl = process.env.AUDIO_BASE_URL || 'https://cdn.islamic.network/audio';
    const audioUrl =
      recitationAyah.audioUrl ||
      `${audioBaseUrl}/${recitationId}/${ayahId}.mp3`;

    return NextResponse.json({
      success: true,
      data: {
        type: 'direct',
        audioUrl,
        startTime: recitationAyah.startTime,
        endTime: recitationAyah.endTime,
        duration: recitationAyah.durationMs,
        reciter: recitationAyah.Recitation.Reciter.nameEnglish,
        reciterArabic: recitationAyah.Recitation.Reciter.nameArabic,
      },
    });
  } catch (error) {
    console.error('[Audio Stream] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get stream URL',
      },
      { status: 500 }
    );
  }
}
