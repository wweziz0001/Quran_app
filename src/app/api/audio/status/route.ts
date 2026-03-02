import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/audio/status
 * Get audio system status
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const audioFileId = searchParams.get('audioFileId');
  const recitationId = searchParams.get('recitationId');
  const action = searchParams.get('action') || 'status';

  // Get specific audio file status
  if (audioFileId) {
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
        recitationId: audioFile.recitationId,
        ayahId: audioFile.ayahId,
        status: audioFile.status,
        format: audioFile.format,
        fileSize: audioFile.fileSize,
        durationMs: audioFile.durationMs,
        bitrate: audioFile.bitrate,
        sampleRate: audioFile.sampleRate,
        channels: audioFile.channels,
        hlsPlaylistUrl: audioFile.hlsPlaylistUrl,
        hlsSegmentsUrl: audioFile.hlsSegmentsUrl,
        createdAt: audioFile.createdAt,
        processedAt: audioFile.processedAt,
      },
    });
  }

  // Get statistics for recitation
  if (recitationId) {
    const stats = await db.audioFile.groupBy({
      by: ['status'],
      where: { recitationId },
      _count: true,
    });

    const total = await db.audioFile.count({
      where: { recitationId },
    });

    const ready = stats.find((s) => s.status === 'ready')?._count || 0;
    const processing = stats.find((s) => s.status === 'processing')?._count || 0;
    const pending = stats.find((s) => s.status === 'pending')?._count || 0;
    const error = stats.find((s) => s.status === 'error')?._count || 0;

    return NextResponse.json({
      success: true,
      data: {
        recitationId,
        total,
        ready,
        processing,
        pending,
        error,
        progress: total > 0 ? Math.round((ready / total) * 100) : 0,
      },
    });
  }

  // Get overall system status
  if (action === 'system') {
    const totalFiles = await db.audioFile.count();
    const byStatus = await db.audioFile.groupBy({
      by: ['status'],
      _count: true,
    });

    const byFormat = await db.audioFile.groupBy({
      by: ['format'],
      _count: true,
      _sum: {
        fileSize: true,
      },
    });

    const totalSize = byFormat.reduce((acc, f) => acc + (f._sum.fileSize || 0), 0);

    // Check FFmpeg
    let ffmpegAvailable = false;
    try {
      const { isFFmpegAvailable } = await import('@/services/audio/hls-converter');
      ffmpegAvailable = await isFFmpegAvailable();
    } catch {
      // FFmpeg check failed
    }

    // Check cache stats
    let cacheStats = { totalEntries: 0 };
    try {
      const { getCacheStats } = await import('@/services/audio/cache');
      cacheStats = await getCacheStats();
    } catch {
      // Cache check failed
    }

    return NextResponse.json({
      success: true,
      data: {
        audioFiles: {
          total: totalFiles,
          byStatus: byStatus.reduce(
            (acc, s) => {
              acc[s.status] = s._count;
              return acc;
            },
            {} as Record<string, number>
          ),
          byFormat: byFormat.map((f) => ({
            format: f.format,
            count: f._count,
            totalSize: f._sum.fileSize || 0,
          })),
          totalSize,
        },
        services: {
          ffmpeg: ffmpegAvailable ? 'available' : 'unavailable',
          cache: cacheStats.totalEntries > 0 ? 'active' : 'empty',
        },
      },
    });
  }

  // Default: return list of recent processing jobs
  const recentJobs = await db.audioFile.findMany({
    where: {
      status: { in: ['processing', 'pending', 'error'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      recitationId: true,
      ayahId: true,
      status: true,
      format: true,
      createdAt: true,
      processedAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      recentJobs,
      total: recentJobs.length,
    },
  });
}

/**
 * DELETE /api/audio/status
 * Cancel processing or delete audio file
 */
export async function DELETE(request: NextRequest) {
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

  // Delete audio file
  await db.audioFile.delete({
    where: { id: audioFileId },
  });

  // TODO: Delete from storage

  return NextResponse.json({
    success: true,
    message: 'Audio file deleted',
  });
}
