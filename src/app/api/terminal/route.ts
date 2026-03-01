/**
 * Terminal API using Server-Sent Events
 * This avoids WebSocket gateway issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

// Store active sessions in memory
const sessions = new Map<string, {
  shell: ReturnType<typeof spawn>;
  createdAt: Date;
  output: string[];
}>();

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const sessionId = url.searchParams.get('sessionId');

  try {
    // Create new session
    if (action === 'create') {
      const id = crypto.randomUUID();
      const shell = process.env.SHELL || '/bin/bash';
      const cwd = process.env.HOME || '/tmp';
      
      const pty = spawn(shell, ['--login'], {
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          LANG: 'en_US.UTF-8',
          HOME: cwd,
        },
        cwd,
      });

      sessions.set(id, {
        shell: pty,
        createdAt: new Date(),
        output: [] as string[],
      });

      // Collect output
      pty.stdout?.on('data', (data: Buffer) => {
        const session = sessions.get(id);
        if (session) {
          session.output.push(data.toString());
        }
      });

      pty.stderr?.on('data', (data: Buffer) => {
        const session = sessions.get(id);
        if (session) {
          session.output.push(data.toString());
        }
      });

      pty.on('exit', (code: number) => {
        const session = sessions.get(id);
        if (session) {
          session.output.push(`\r\n\x1b[33mProcess exited with code ${code}\x1b[0m\r\n`);
        }
      });

      // Cleanup after 30 minutes
      setTimeout(() => {
        const session = sessions.get(id);
        if (session) {
          session.shell.kill();
          sessions.delete(id);
        }
      }, 1800000);

      return NextResponse.json({
        success: true,
        sessionId: id,
        cwd,
        message: 'Session created'
      });
    }

    // Get output (SSE stream)
    if (action === 'output' && sessionId) {
      const session = sessions.get(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      const encoder = new TextEncoder();
      let lastIndex = 0;
      
      const stream = new ReadableStream({
        start(controller) {
          const interval = setInterval(() => {
            const session = sessions.get(sessionId);
            if (!session) {
              clearInterval(interval);
              try { controller.close(); } catch (e) {}
              return;
            }

            const newOutput = session.output.slice(lastIndex);
            if (newOutput.length > 0) {
              lastIndex = session.output.length;
              try {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ output: newOutput.join('') })}\n\n`)
                );
              } catch (e) {
                clearInterval(interval);
              }
            }
          }, 50);

          // Keep connection alive for 5 minutes
          setTimeout(() => {
            clearInterval(interval);
            try { controller.close(); } catch (e) {}
          }, 300000);
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // Check session status
    if (action === 'status' && sessionId) {
      const session = sessions.get(sessionId);
      return NextResponse.json({
        exists: !!session,
        outputLength: session?.output.length || 0,
      });
    }

    // List sessions
    if (action === 'list') {
      const list = Array.from(sessions.entries()).map(([id, s]) => ({
        id,
        createdAt: s.createdAt,
        outputLength: s.output.length,
      }));
      return NextResponse.json({ sessions: list });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('[Terminal API] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, input, cols, rows } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Handle input
    if (input !== undefined) {
      session.shell.stdin?.write(input);
      return NextResponse.json({ success: true });
    }

    // Note: resize is not supported with basic spawn, would need node-pty
    if (cols && rows) {
      return NextResponse.json({ success: true, note: 'Resize not fully supported' });
    }

    return NextResponse.json({ error: 'Missing input or resize params' }, { status: 400 });
  } catch (error: any) {
    console.error('[Terminal API] POST Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  const session = sessions.get(sessionId);
  if (session) {
    session.shell.kill();
    sessions.delete(sessionId);
  }

  return NextResponse.json({ success: true });
}
