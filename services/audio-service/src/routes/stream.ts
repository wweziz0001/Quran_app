import { Hono } from 'hono';
import { db } from '../../shared/db';
import {
  getPresignedUrl,
  fileExists,
  getFileInfo,
  readFile,
  generatePresignedUrl,
  validatePresignedUrl,
  getCachedPlaylist,
  cachePlaylist,
  getCachedAudioMetadata,
  checkRateLimit,
  getStreamingConfig,
} from '../services';

const app = new Hono();

// GET /stream/:recitationId/:ayahId - Stream audio
app.get('/:recitationId/:ayahId', async (c) => {
  const { recitationId, ayahId } = c.req.param();
  const clientIp = c.req.header('x-forwarded-for') || 'unknown';

  // Check rate limit
  const rateLimit = checkRateLimit(clientIp, 100, 60000);
  if (!rateLimit.allowed) {
    return c.json({ 
      success: false, 
      error: 'Rate limit exceeded',
      resetAt: rateLimit.resetAt 
    }, 429);
  }

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

  // Check if audio file exists in storage
  const audioKey = `${recitationId}/${ayahId}.mp3`;
  const exists = await fileExists(audioKey);

  let streamUrl: string;
  if (exists) {
    // Generate pre-signed URL for secure streaming
    streamUrl = await getPresignedUrl(audioKey, 3600);
  } else {
    // Fallback to external URL
    streamUrl = recitationAyah.audioUrl || 
      `${process.env.AUDIO_BASE_URL}/${recitationId}/${ayahId}.mp3`;
  }

  // Get cached metadata
  const cachedMetadata = await getCachedAudioMetadata(recitationId, parseInt(ayahId));

  return c.json({
    success: true,
    data: {
      url: streamUrl,
      startTime: recitationAyah.startTime,
      endTime: recitationAyah.endTime,
      duration: recitationAyah.durationMs,
      reciter: recitationAyah.Recitation?.Reciter?.nameEnglish,
      metadata: cachedMetadata,
    },
    rateLimit: {
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt,
    },
  });
});

// GET /stream/hls/:recitationId/:ayahId - HLS playlist
app.get('/hls/:recitationId/:ayahId', async (c) => {
  const { recitationId, ayahId } = c.req.param();
  const clientIp = c.req.header('x-forwarded-for') || 'unknown';

  // Check rate limit
  const rateLimit = checkRateLimit(clientIp, 50, 60000);
  if (!rateLimit.allowed) {
    return c.json({ 
      success: false, 
      error: 'Rate limit exceeded' 
    }, 429);
  }

  // Check cache first
  const cachedPlaylist = await getCachedPlaylist(recitationId, parseInt(ayahId));
  if (cachedPlaylist) {
    return c.json({
      success: true,
      data: {
        hlsPlaylist: cachedPlaylist,
        cached: true,
      },
    });
  }

  // Check if HLS exists in database
  const audioFile = await db.audioFile.findFirst({
    where: {
      recitationId,
      ayahId: parseInt(ayahId),
      format: 'hls',
      status: 'ready',
    },
  });

  if (!audioFile?.hlsPlaylistUrl) {
    // Check if we have the source audio to convert
    const sourceKey = `${recitationId}/${ayahId}.mp3`;
    const sourceExists = await fileExists(sourceKey);

    return c.json({ 
      success: false, 
      error: 'HLS not available for this recitation',
      fallback: `/stream/${recitationId}/${ayahId}`,
      canConvert: sourceExists,
    }, 404);
  }

  // Cache the playlist URL
  await cachePlaylist(recitationId, parseInt(ayahId), audioFile.hlsPlaylistUrl);

  return c.json({
    success: true,
    data: {
      hlsPlaylist: audioFile.hlsPlaylistUrl,
      segments: audioFile.hlsSegmentsUrl,
    },
  });
});

// GET /stream/secure/:token - Secure streaming with pre-signed token
app.get('/secure/:token', async (c) => {
  const token = c.req.param('token');
  const clientIp = c.req.header('x-forwarded-for');

  // Validate the pre-signed token
  const validation = validatePresignedUrl(token, clientIp);
  
  if (!validation.valid) {
    return c.json({ 
      success: false, 
      error: validation.error || 'Invalid token' 
    }, 403);
  }

  const key = validation.key!;

  // Check if file exists
  const exists = await fileExists(key);
  if (!exists) {
    return c.json({ 
      success: false, 
      error: 'Audio file not found' 
    }, 404);
  }

  // Get file info
  const fileInfo = await getFileInfo(key);
  if (!fileInfo) {
    return c.json({ 
      success: false, 
      error: 'Could not get file info' 
    }, 500);
  }

  // Read file content
  const fileBuffer = await readFile(key);

  // Set appropriate headers
  c.header('Content-Type', fileInfo.contentType);
  c.header('Content-Length', fileInfo.size.toString());
  c.header('Cache-Control', 'public, max-age=3600');
  c.header('Accept-Ranges', 'bytes');

  return c.body(fileBuffer);
});

// GET /stream/config - Get streaming configuration
app.get('/config', (c) => {
  const config = getStreamingConfig();
  return c.json({
    success: true,
    data: config,
  });
});

// POST /stream/batch-urls - Generate batch pre-signed URLs
app.post('/batch-urls', async (c) => {
  const body = await c.req.json();
  const { keys, expiresIn = 3600 } = body;

  if (!Array.isArray(keys) || keys.length === 0) {
    return c.json({ 
      success: false, 
      error: 'Keys array is required' 
    }, 400);
  }

  // Limit batch size
  if (keys.length > 100) {
    return c.json({ 
      success: false, 
      error: 'Maximum 100 keys per batch' 
    }, 400);
  }

  const urls: Record<string, string> = {};
  for (const key of keys) {
    urls[key] = generatePresignedUrl({ key, expiresIn });
  }

  return c.json({
    success: true,
    data: urls,
    expiresIn,
  });
});

export default app;
