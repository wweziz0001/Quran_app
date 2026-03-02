import { Hono } from 'hono';
import { db } from '../../shared/db';
import {
  createProcessingJob,
  getProcessingJob,
  processAudioFile,
  validateAudioFile,
  convertToHLS,
  isFFmpegAvailable,
  uploadFile,
  fileExists,
  getAudioMetadata,
  cacheAudioMetadata,
  invalidateCache,
} from '../services';

const app = new Hono();

// GET /recitations - List all recitations
app.get('/', async (c) => {
  const reciterId = c.req.query('reciterId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (reciterId) where.reciterId = reciterId;

  const [recitations, total] = await Promise.all([
    db.recitation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        Reciter: { select: { nameEnglish: true, nameArabic: true } },
        _count: { select: { RecitationAyah: true } },
      },
    }),
    db.recitation.count({ where }),
  ]);

  return c.json({
    success: true,
    data: recitations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// GET /recitations/:id - Get single recitation
app.get('/:id', async (c) => {
  const id = c.req.param('id');

  const recitation = await db.recitation.findUnique({
    where: { id },
    include: {
      Reciter: true,
      _count: { select: { RecitationAyah: true } },
    },
  });

  if (!recitation) {
    return c.json({ success: false, error: 'Recitation not found' }, 404);
  }

  return c.json({ success: true, data: recitation });
});

// GET /recitations/:id/ayahs - Get recitation ayahs
app.get('/:id/ayahs', async (c) => {
  const id = c.req.param('id');
  const surahId = c.req.query('surahId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { recitationId: id };
  if (surahId) {
    where.Ayah = { surahId: parseInt(surahId) };
  }

  const [ayahs, total] = await Promise.all([
    db.recitationAyah.findMany({
      where,
      orderBy: [{ Ayah: { surahId: 'asc' } }, { Ayah: { ayahNumber: 'asc' } }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        Ayah: {
          select: { surahId: true, ayahNumber: true, textArabic: true },
        },
      },
    }),
    db.recitationAyah.count({ where }),
  ]);

  return c.json({
    success: true,
    data: ayahs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// POST /recitations/:id/process - Process recitation audio
app.post('/:id/process', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { inputPath, options } = body;

  if (!inputPath) {
    return c.json({ success: false, error: 'inputPath is required' }, 400);
  }

  // Check FFmpeg availability
  const ffmpegAvailable = await isFFmpegAvailable();
  if (!ffmpegAvailable) {
    return c.json({ 
      success: false, 
      error: 'FFmpeg is not available on this server' 
    }, 503);
  }

  // Create processing job
  const job = createProcessingJob(id, inputPath);

  // Start processing asynchronously
  processAudioFile(inputPath, options)
    .then(async (outputPath) => {
      // Upload processed file to storage
      const storageKey = `${id}/processed.mp3`;
      await uploadFile(outputPath, storageKey, 'audio/mpeg');
      
      // Update job status
      const job = getProcessingJob(id);
      if (job) {
        // Invalidate cache for this recitation
        await invalidateCache(id);
      }
    })
    .catch((error) => {
      console.error(`[Processing] Job ${id} failed:`, error);
    });

  return c.json({
    success: true,
    data: {
      jobId: id,
      status: job.status,
      message: 'Processing started',
    },
  });
});

// GET /recitations/:id/process/status - Get processing status
app.get('/:id/process/status', async (c) => {
  const id = c.req.param('id');
  
  const job = getProcessingJob(id);
  
  if (!job) {
    return c.json({ 
      success: false, 
      error: 'Processing job not found' 
    }, 404);
  }

  return c.json({
    success: true,
    data: job,
  });
});

// POST /recitations/:id/convert-hls - Convert recitation to HLS
app.post('/:id/convert-hls', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { inputPath, outputDir, segmentDuration = 10, bitrates = [64, 128, 192, 256] } = body;

  if (!inputPath || !outputDir) {
    return c.json({ 
      success: false, 
      error: 'inputPath and outputDir are required' 
    }, 400);
  }

  // Check FFmpeg availability
  const ffmpegAvailable = await isFFmpegAvailable();
  if (!ffmpegAvailable) {
    return c.json({ 
      success: false, 
      error: 'FFmpeg is not available on this server' 
    }, 503);
  }

  try {
    const result = await convertToHLS({
      inputPath,
      outputDir,
      segmentDuration,
      bitrates,
    });

    // Update audio file records in database
    await db.audioFile.upsert({
      where: {
        recitationId_ayahId_format: {
          recitationId: id,
          ayahId: 0, // For full recitation
          format: 'hls',
        },
      },
      update: {
        hlsPlaylistUrl: result.playlistUrl,
        hlsSegmentsUrl: result.segments,
        status: 'ready',
      },
      create: {
        recitationId: id,
        ayahId: 0,
        format: 'hls',
        status: 'ready',
        hlsPlaylistUrl: result.playlistUrl,
        hlsSegmentsUrl: result.segments,
      },
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: (error as Error).message 
    }, 500);
  }
});

// POST /recitations/:id/validate - Validate audio file
app.post('/:id/validate', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { filePath } = body;

  if (!filePath) {
    return c.json({ 
      success: false, 
      error: 'filePath is required' 
    }, 400);
  }

  // Check if file exists
  const exists = await fileExists(filePath);
  if (!exists) {
    return c.json({ 
      success: false, 
      error: 'File not found' 
    }, 404);
  }

  // Validate audio file
  const validation = await validateAudioFile(filePath);

  // Cache metadata if valid
  if (validation.isValid && validation.metadata) {
    await cacheAudioMetadata(id, 0, {
      duration: validation.metadata.duration,
      bitrate: validation.metadata.bitrate,
      format: validation.metadata.format,
    });
  }

  return c.json({
    success: true,
    data: validation,
  });
});

// GET /recitations/:id/metadata - Get audio metadata
app.get('/:id/metadata', async (c) => {
  const id = c.req.param('id');
  const body = c.req.query();
  const filePath = body.filePath;

  if (!filePath) {
    return c.json({ 
      success: false, 
      error: 'filePath query parameter is required' 
    }, 400);
  }

  // Check if file exists
  const exists = await fileExists(filePath);
  if (!exists) {
    return c.json({ 
      success: false, 
      error: 'File not found' 
    }, 404);
  }

  // Get audio metadata
  const metadata = await getAudioMetadata(filePath);

  // Cache the metadata
  await cacheAudioMetadata(id, 0, {
    duration: metadata.duration,
    bitrate: metadata.bitrate,
    format: metadata.format,
  });

  return c.json({
    success: true,
    data: metadata,
  });
});

export default app;
