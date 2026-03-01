/**
 * Upload Service - Chunked File Upload
 * Port: 3032
 * 
 * This service handles large file uploads by splitting them into chunks.
 * It supports:
 * - Starting an upload session
 * - Uploading chunks
 * - Completing the upload
 * - Progress tracking
 */

import { serve } from "bun";
import { mkdirSync, existsSync, writeFileSync, appendFileSync, statSync, unlinkSync, readdirSync, rmSync, readFileSync } from "fs";
import { join, dirname } from "path";

const PORT = 3032;
const UPLOAD_DIR = join(process.cwd(), 'temp', 'uploads');
const PUBLIC_DIR = join(process.cwd(), 'public', 'upload');

// Ensure directories exist
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Store upload sessions
const uploadSessions: Map<string, {
  fileName: string;
  totalSize: number;
  chunksReceived: number[];
  totalChunks: number;
  createdAt: Date;
  lastActivity: Date;
}> = new Map();

// Clean up old sessions every 30 minutes
setInterval(() => {
  const now = new Date();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  
  for (const [sessionId, session] of uploadSessions.entries()) {
    if (now.getTime() - session.lastActivity.getTime() > maxAge) {
      const sessionDir = join(UPLOAD_DIR, sessionId);
      if (existsSync(sessionDir)) {
        rmSync(sessionDir, { recursive: true, force: true });
      }
      uploadSessions.delete(sessionId);
      console.log(`[Cleanup] Removed expired session: ${sessionId}`);
    }
  }
}, 30 * 60 * 1000);

serve({
  port: PORT,
  
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-File-Name, X-Total-Size, X-Upload-Session-Id, X-Chunk-Index, X-Total-Chunks, X-Upload-Id',
    };

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Start upload session
      if (path === '/upload/start' && req.method === 'POST') {
        const fileName = decodeURIComponent(req.headers.get('X-File-Name') || 'upload');
        const totalSize = parseInt(req.headers.get('X-Total-Size') || '0');
        const requestId = req.headers.get('X-Request-Id') || Math.random().toString(36).slice(2, 10);
        
        // Calculate total chunks (1MB per chunk)
        const chunkSize = 1024 * 1024; // 1MB
        const totalChunks = Math.ceil(totalSize / chunkSize);
        
        const sessionId = `${Date.now()}-${requestId}`;
        const sessionDir = join(UPLOAD_DIR, sessionId);
        
        // Create session directory
        mkdirSync(sessionDir, { recursive: true });
        
        // Store session info
        uploadSessions.set(sessionId, {
          fileName,
          totalSize,
          chunksReceived: [],
          totalChunks,
          createdAt: new Date(),
          lastActivity: new Date(),
        });
        
        console.log(`[${requestId}] [Upload Start] Session: ${sessionId}, File: ${fileName}, Size: ${totalSize}, Chunks: ${totalChunks}`);
        
        return Response.json({
          success: true,
          sessionId,
          totalChunks,
          chunkSize,
        }, { headers: corsHeaders });
      }
      
      // Upload chunk
      if (path === '/upload/chunk' && req.method === 'POST') {
        const sessionId = req.headers.get('X-Upload-Session-Id');
        const chunkIndex = parseInt(req.headers.get('X-Chunk-Index') || '0');
        const uploadId = req.headers.get('X-Upload-Id') || 'unknown';
        
        if (!sessionId || !uploadSessions.has(sessionId)) {
          return Response.json({
            success: false,
            error: 'Invalid session ID',
          }, { status: 400, headers: corsHeaders });
        }
        
        const session = uploadSessions.get(sessionId)!;
        session.lastActivity = new Date();
        
        // Save chunk
        const chunkPath = join(UPLOAD_DIR, sessionId, `chunk-${chunkIndex}`);
        const chunkData = await req.arrayBuffer();
        writeFileSync(chunkPath, Buffer.from(chunkData));
        
        // Mark chunk as received
        if (!session.chunksReceived.includes(chunkIndex)) {
          session.chunksReceived.push(chunkIndex);
        }
        
        console.log(`[${uploadId}] [Chunk ${chunkIndex}/${session.totalChunks}] Received ${chunkData.byteLength} bytes`);
        
        return Response.json({
          success: true,
          chunkIndex,
          chunksReceived: session.chunksReceived.length,
          totalChunks: session.totalChunks,
        }, { headers: corsHeaders });
      }
      
      // Complete upload
      if (path === '/upload/complete' && req.method === 'POST') {
        const sessionId = req.headers.get('X-Upload-Session-Id');
        const uploadId = req.headers.get('X-Upload-Id') || 'unknown';
        
        if (!sessionId || !uploadSessions.has(sessionId)) {
          return Response.json({
            success: false,
            error: 'Invalid session ID',
          }, { status: 400, headers: corsHeaders });
        }
        
        const session = uploadSessions.get(sessionId)!;
        const sessionDir = join(UPLOAD_DIR, sessionId);
        
        // Check if all chunks received
        if (session.chunksReceived.length !== session.totalChunks) {
          console.log(`[${uploadId}] [Complete] Missing chunks: ${session.totalChunks - session.chunksReceived.length}`);
          return Response.json({
            success: false,
            error: `Missing ${session.totalChunks - session.chunksReceived.length} chunks`,
            chunksReceived: session.chunksReceived.length,
            totalChunks: session.totalChunks,
          }, { status: 400, headers: corsHeaders });
        }
        
        // Combine chunks into final file
        const finalPath = join(PUBLIC_DIR, 'uploads', session.fileName);
        const finalDir = dirname(finalPath);
        
        if (!existsSync(finalDir)) {
          mkdirSync(finalDir, { recursive: true });
        }
        
        // Sort chunks and combine
        const sortedChunks = session.chunksReceived.sort((a, b) => a - b);
        
        for (const chunkIndex of sortedChunks) {
          const chunkPath = join(sessionDir, `chunk-${chunkIndex}`);
          const chunkData = readFileSync(chunkPath);
          
          if (chunkIndex === 0) {
            writeFileSync(finalPath, chunkData);
          } else {
            appendFileSync(finalPath, chunkData);
          }
        }
        
        // Clean up session
        rmSync(sessionDir, { recursive: true, force: true });
        uploadSessions.delete(sessionId);
        
        const finalStats = statSync(finalPath);
        
        console.log(`[${uploadId}] [Complete] File saved: ${finalPath} (${finalStats.size} bytes)`);
        
        return Response.json({
          success: true,
          filePath: `/upload/uploads/${session.fileName}`,
          fileName: session.fileName,
          fileSize: finalStats.size,
        }, { headers: corsHeaders });
      }
      
      // Get upload status
      if (path === '/upload/status' && req.method === 'GET') {
        const sessionId = url.searchParams.get('sessionId');
        
        if (!sessionId || !uploadSessions.has(sessionId)) {
          return Response.json({
            success: false,
            error: 'Invalid session ID',
          }, { status: 404, headers: corsHeaders });
        }
        
        const session = uploadSessions.get(sessionId)!;
        
        return Response.json({
          success: true,
          ...session,
          progress: (session.chunksReceived.length / session.totalChunks) * 100,
        }, { headers: corsHeaders });
      }
      
      // List active sessions
      if (path === '/upload/sessions' && req.method === 'GET') {
        const sessions = Array.from(uploadSessions.entries()).map(([id, session]) => ({
          id,
          fileName: session.fileName,
          progress: (session.chunksReceived.length / session.totalChunks) * 100,
          createdAt: session.createdAt,
        }));
        
        return Response.json({
          success: true,
          sessions,
          count: sessions.length,
        }, { headers: corsHeaders });
      }
      
      return Response.json({
        error: 'Not found',
        endpoints: [
          'POST /upload/start - Start upload session',
          'POST /upload/chunk - Upload chunk',
          'POST /upload/complete - Complete upload',
          'GET /upload/status?sessionId=xxx - Get upload status',
          'GET /upload/sessions - List active sessions',
        ],
      }, { status: 404, headers: corsHeaders });
      
    } catch (error) {
      console.error('Upload service error:', error);
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, { status: 500, headers: corsHeaders });
    }
  },
});

console.log(`🚀 Upload Service running on port ${PORT}`);
console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
console.log(`📁 Public directory: ${PUBLIC_DIR}`);
