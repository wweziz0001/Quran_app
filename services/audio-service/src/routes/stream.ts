import { Hono } from 'hono';
import { db } from '../../shared/db';

const app = new Hono();

// GET /stream/:recitationId/:ayahId - Stream audio
app.get('/:recitationId/:ayahId', async (c) => {
  const { recitationId, ayahId } = c.req.param();

  const recitationAyah = await db.recitationAyah.findFirst({
    where: {
      recitationId,
      ayahId: parseInt(ayahId),
    },
    include: {
      Recitation: { include: { Reciter: true } },
    },
  });

  if (!recitationAyah) {
    return c.json({ success: false, error: 'Audio not found' }, 404);
  }

  // Return streaming URL
  const streamUrl = recitationAyah.audioUrl || 
    `${process.env.AUDIO_BASE_URL}/${recitationId}/${ayahId}.mp3`;

  return c.json({
    success: true,
    data: {
      url: streamUrl,
      startTime: recitationAyah.startTime,
      endTime: recitationAyah.endTime,
      duration: recitationAyah.durationMs,
      reciter: recitationAyah.Recitation?.Reciter?.nameEnglish,
    },
  });
});

// GET /stream/hls/:recitationId/:ayahId - HLS playlist
app.get('/hls/:recitationId/:ayahId', async (c) => {
  const { recitationId, ayahId } = c.req.param();

  // Check if HLS exists
  const audioFile = await db.audioFile.findFirst({
    where: {
      recitationId,
      ayahId: parseInt(ayahId),
      format: 'hls',
      status: 'ready',
    },
  });

  if (!audioFile?.hlsPlaylistUrl) {
    return c.json({ 
      success: false, 
      error: 'HLS not available for this recitation',
      fallback: `/stream/${recitationId}/${ayahId}`,
    }, 404);
  }

  return c.json({
    success: true,
    data: {
      hlsPlaylist: audioFile.hlsPlaylistUrl,
      segments: audioFile.hlsSegmentsUrl,
    },
  });
});

export default app;
