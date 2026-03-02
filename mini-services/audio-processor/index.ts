/**
 * Audio Processor Mini Service
 * Background service for processing audio files
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';

const app = new Hono();

// Enable CORS
app.use('/*', cors());

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'audio-processor',
    timestamp: new Date().toISOString(),
  });
});

// Get processing status
app.get('/status', async (c) => {
  const { getCacheStats } = await import('../../src/services/audio/cache');
  const stats = await getCacheStats();

  return c.json({
    success: true,
    data: {
      queue: jobsQueue.length,
      processing: currentJob ? 1 : 0,
      completed: completedJobs,
      cache: stats,
    },
  });
});

// Submit processing job
app.post('/process', async (c) => {
  const body = await c.req.json();
  const { recitationId, ayahId, inputPath, options } = body;

  if (!recitationId || !ayahId || !inputPath) {
    return c.json(
      {
        success: false,
        error: 'recitationId, ayahId, and inputPath are required',
      },
      400
    );
  }

  const jobId = `${recitationId}_${ayahId}_${Date.now()}`;

  const job = {
    id: jobId,
    recitationId,
    ayahId,
    inputPath,
    options: options || {},
    status: 'pending',
    progress: 0,
    createdAt: new Date(),
  };

  jobsQueue.push(job);

  return c.json({
    success: true,
    data: {
      jobId,
      position: jobsQueue.length,
    },
  });
});

// Batch submit
app.post('/batch', async (c) => {
  const body = await c.req.json();
  const { jobs } = body;

  if (!Array.isArray(jobs) || jobs.length === 0) {
    return c.json(
      {
        success: false,
        error: 'jobs array is required',
      },
      400
    );
  }

  const jobIds: string[] = [];

  for (const job of jobs) {
    const { recitationId, ayahId, inputPath, options } = job;
    const jobId = `${recitationId}_${ayahId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    jobsQueue.push({
      id: jobId,
      recitationId,
      ayahId,
      inputPath,
      options: options || {},
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
    });

    jobIds.push(jobId);
  }

  return c.json({
    success: true,
    data: {
      submitted: jobIds.length,
      jobIds,
      queueSize: jobsQueue.length,
    },
  });
});

// Get job status
app.get('/job/:id', (c) => {
  const jobId = c.req.param('id');

  // Check current job
  if (currentJob?.id === jobId) {
    return c.json({
      success: true,
      data: currentJob,
    });
  }

  // Check queue
  const queuedJob = jobsQueue.find((j) => j.id === jobId);
  if (queuedJob) {
    return c.json({
      success: true,
      data: {
        ...queuedJob,
        position: jobsQueue.indexOf(queuedJob) + 1,
      },
    });
  }

  // Check completed
  const completed = completedJobsMap.get(jobId);
  if (completed) {
    return c.json({
      success: true,
      data: completed,
    });
  }

  return c.json(
    {
      success: false,
      error: 'Job not found',
    },
    404
  );
});

// Cancel job
app.delete('/job/:id', (c) => {
  const jobId = c.req.param('id');

  // Remove from queue
  const index = jobsQueue.findIndex((j) => j.id === jobId);
  if (index !== -1) {
    jobsQueue.splice(index, 1);
    return c.json({
      success: true,
      message: 'Job cancelled',
    });
  }

  return c.json(
    {
      success: false,
      error: 'Job not found or already processing',
    },
    404
  );
});

// Processing queue
const jobsQueue: Array<{
  id: string;
  recitationId: string;
  ayahId: number;
  inputPath: string;
  options: Record<string, unknown>;
  status: string;
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}> = [];

let currentJob: (typeof jobsQueue)[0] | null = null;
let completedJobs = 0;
const completedJobsMap = new Map<string, (typeof jobsQueue)[0]>();

/**
 * Process jobs from queue
 */
async function processQueue(): Promise<void> {
  if (currentJob || jobsQueue.length === 0) {
    return;
  }

  currentJob = jobsQueue.shift()!;
  currentJob.status = 'processing';

  console.log(`[Processor] Starting job: ${currentJob.id}`);

  try {
    const { convertToHLS } = await import('../../src/services/audio/hls-converter');
    const { uploadFile } = await import('../../src/services/audio/storage');

    // Convert to HLS
    const outputDir = `/tmp/hls/${currentJob.id}`;
    const result = await convertToHLS({
      inputPath: currentJob.inputPath,
      outputDir,
      segmentDuration: 10,
      bitrates: [64, 128, 192],
    });

    // Upload to storage
    const key = `audio/hls/${currentJob.recitationId}/${currentJob.ayahId}`;
    await uploadFile(result.playlistUrl, `${key}/master.m3u8`, 'application/vnd.apple.mpegurl');

    currentJob.progress = 100;
    currentJob.status = 'completed';
    currentJob.completedAt = new Date();

    completedJobs++;
    completedJobsMap.set(currentJob.id, currentJob);

    console.log(`[Processor] Completed job: ${currentJob.id}`);
  } catch (error) {
    console.error(`[Processor] Failed job: ${currentJob.id}`, error);

    currentJob.status = 'error';
    currentJob.error = (error as Error).message;
    currentJob.completedAt = new Date();

    completedJobsMap.set(currentJob.id, currentJob);
  } finally {
    currentJob = null;

    // Process next job
    setTimeout(processQueue, 100);
  }
}

// Start queue processor
setInterval(processQueue, 5000);

// Start server
const PORT = 3009;

serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`[Audio Processor] Service started on port ${PORT}`);
