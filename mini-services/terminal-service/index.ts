/**
 * AI-Powered Terminal Service
 * 
 * This mini-service provides WebSocket-based terminal emulation with:
 * - Real PTY shell access
 * - AI command analysis and suggestions
 * - Session management
 * - Audit logging
 * - Rate limiting
 */

import { createServer } from 'http'
import { Server } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import { spawn } from 'child_process'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8
})

// Types
interface TerminalSession {
  id: string
  userId: string
  shell: any // PTY process
  createdAt: Date
  lastActivity: Date
  history: CommandHistoryItem[]
  cols: number
  rows: number
  cwd: string
}

interface CommandHistoryItem {
  id: string
  command: string
  timestamp: Date
  exitCode?: number
  output?: string
  riskLevel?: 'low' | 'medium' | 'high' | 'critical'
  aiAnalysis?: any
}

interface AIAnalysisResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  explanation: string
  suggestion?: string
  shouldConfirm: boolean
}

// Session Store
const sessions = new Map<string, TerminalSession>()
const userSessions = new Map<string, Set<string>>() // userId -> sessionIds

// Rate Limiting
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX = 100 // commands per window

// Risk Patterns for Command Analysis
const RISK_PATTERNS = [
  { pattern: /rm\s+(-[rf]+\s+)*\//, level: 'critical', message: 'Root filesystem deletion attempt' },
  { pattern: /rm\s+(-[rf]+\s+)*\*/, level: 'critical', message: 'Wildcard deletion detected' },
  { pattern: /rm\s+-rf/, level: 'high', message: 'Force recursive deletion' },
  { pattern: /sudo\s+/, level: 'high', message: 'Elevated privileges requested' },
  { pattern: /chmod\s+777/, level: 'medium', message: 'Insecure permissions (777)' },
  { pattern: />\s*\//, level: 'high', message: 'Root filesystem write' },
  { pattern: /mkfs/, level: 'critical', message: 'Filesystem format command' },
  { pattern: /dd\s+if=/, level: 'high', message: 'Disk operation command' },
  { pattern: /:(){ :|:& };:/, level: 'critical', message: 'Fork bomb detected' },
  { pattern: /curl.*\|\s*(bash|sh)/, level: 'high', message: 'Remote script execution' },
  { pattern: /wget.*\|\s*(bash|sh)/, level: 'high', message: 'Remote script execution' },
]

// Utility Functions
function generateId(): string {
  return uuidv4()
}

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now()
  const limit = rateLimits.get(sessionId)
  
  if (!limit || now > limit.resetAt) {
    rateLimits.set(sessionId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }
  
  if (limit.count >= RATE_LIMIT_MAX) {
    return false
  }
  
  limit.count++
  return true
}

function analyzeCommand(command: string): AIAnalysisResult {
  // Check against risk patterns
  for (const { pattern, level, message } of RISK_PATTERNS) {
    if (pattern.test(command)) {
      return {
        riskLevel: level as any,
        explanation: message,
        shouldConfirm: level === 'critical' || level === 'high'
      }
    }
  }
  
  // Basic analysis
  const isWrite = /(rm|mv|cp|mkdir|rmdir|touch|nano|vim|echo\s*>)/.test(command)
  const isSystem = /(systemctl|service|apt|yum|brew|npm|pip)/.test(command)
  
  if (isWrite && isSystem) {
    return {
      riskLevel: 'high',
      explanation: 'System modification command detected',
      shouldConfirm: true
    }
  }
  
  if (isWrite) {
    return {
      riskLevel: 'medium',
      explanation: 'File modification command',
      shouldConfirm: false
    }
  }
  
  return {
    riskLevel: 'low',
    explanation: 'Read-only or safe command',
    shouldConfirm: false
  }
}

async function analyzeWithAI(command: string): Promise<AIAnalysisResult> {
  try {
    // Dynamic import for z-ai-web-dev-sdk
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are a terminal security AI. Analyze commands and respond in JSON format:
{
  "riskLevel": "low" | "medium" | "high" | "critical",
  "explanation": "Brief explanation of what the command does",
  "suggestion": "Optional safer alternative",
  "shouldConfirm": boolean
}

Rules:
- Critical: Commands that can destroy data or compromise system
- High: Commands requiring elevated privileges or system changes
- Medium: File operations or potentially risky actions
- Low: Read-only or safe commands`
        },
        {
          role: 'user',
          content: command
        }
      ],
      thinking: { type: 'disabled' }
    })
    
    const response = completion.choices[0]?.message?.content
    if (response) {
      try {
        return JSON.parse(response)
      } catch {
        // Fall back to pattern-based analysis
      }
    }
  } catch (error) {
    console.error('AI analysis error:', error)
  }
  
  return analyzeCommand(command)
}

async function naturalLanguageToCommand(input: string): Promise<string> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are a terminal expert. Convert natural language to bash commands.
Return ONLY the command, no explanation or markdown.
If unclear, return "echo 'Command unclear - please be more specific'"

Examples:
- "list all files" -> "ls -la"
- "find large files" -> "find . -size +100M"
- "kill node process" -> "pkill node"`
        },
        {
          role: 'user',
          content: input
        }
      ],
      thinking: { type: 'disabled' }
    })
    
    return completion.choices[0]?.message?.content?.trim() || ''
  } catch (error) {
    console.error('NL to command error:', error)
    return ''
  }
}

async function explainCommand(command: string): Promise<string> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: 'You are a terminal expert. Explain commands clearly and concisely in 1-2 sentences.'
        },
        {
          role: 'user',
          content: `Explain this command: ${command}`
        }
      ],
      thinking: { type: 'disabled' }
    })
    
    return completion.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('Explain command error:', error)
    return ''
  }
}

function createShell(session: TerminalSession, cols: number = 80, rows: number = 24): any {
  const shell = process.env.SHELL || '/bin/bash'
  const args = ['--login']
  
  // Use spawn for basic shell interaction
  // In production, node-pty would be used for full PTY support
  const pty = spawn(shell, args, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: session.cwd || process.env.HOME || '/tmp',
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      LANG: 'en_US.UTF-8',
      SESSION_ID: session.id
    }
  })
  
  return pty
}

// Socket Event Handlers
io.on('connection', (socket) => {
  console.log(`[Terminal] Client connected: ${socket.id}`)
  
  let currentSession: TerminalSession | null = null
  
  // Create new terminal session
  socket.on('terminal:create', async (data: { userId: string; cols?: number; rows?: number; cwd?: string }) => {
    try {
      const sessionId = generateId()
      const { userId, cols = 80, rows = 24, cwd = process.env.HOME || '/tmp' } = data
      
      // Check user session limit
      let userSessionIds = userSessions.get(userId)
      if (!userSessionIds) {
        userSessionIds = new Set()
        userSessions.set(userId, userSessionIds)
      }
      
      if (userSessionIds.size >= 5) {
        socket.emit('terminal:error', { message: 'Maximum sessions reached (5)' })
        return
      }
      
      // Create session
      const session: TerminalSession = {
        id: sessionId,
        userId,
        shell: null,
        createdAt: new Date(),
        lastActivity: new Date(),
        history: [],
        cols,
        rows,
        cwd
      }
      
      // Create shell process
      session.shell = createShell(session, cols, rows)
      
      // Handle shell output
      session.shell.stdout?.on('data', (data: Buffer) => {
        socket.emit('terminal:data', { sessionId, data: data.toString('base64') })
      })
      
      session.shell.stderr?.on('data', (data: Buffer) => {
        socket.emit('terminal:data', { sessionId, data: data.toString('base64') })
      })
      
      session.shell.on('exit', (code: number) => {
        socket.emit('terminal:exit', { sessionId, code })
        sessions.delete(sessionId)
        userSessionIds?.delete(sessionId)
      })
      
      // Store session
      sessions.set(sessionId, session)
      userSessionIds.add(sessionId)
      currentSession = session
      
      socket.emit('terminal:created', {
        sessionId,
        createdAt: session.createdAt,
        cwd: session.cwd
      })
      
      console.log(`[Terminal] Session created: ${sessionId} for user ${userId}`)
    } catch (error: any) {
      console.error('[Terminal] Create error:', error)
      socket.emit('terminal:error', { message: error.message })
    }
  })
  
  // Join existing session
  socket.on('terminal:join', (data: { sessionId: string }) => {
    const session = sessions.get(data.sessionId)
    if (!session) {
      socket.emit('terminal:error', { message: 'Session not found' })
      return
    }
    
    currentSession = session
    socket.emit('terminal:joined', {
      sessionId: session.id,
      history: session.history.slice(-100), // Last 100 commands
      cwd: session.cwd
    })
  })
  
  // Write to terminal
  socket.on('terminal:write', async (data: { data: string }) => {
    if (!currentSession) {
      socket.emit('terminal:error', { message: 'No active session' })
      return
    }
    
    // Check rate limit
    if (!checkRateLimit(currentSession.id)) {
      socket.emit('terminal:error', { message: 'Rate limit exceeded' })
      return
    }
    
    const command = data.data
    
    // If it's a complete command (ends with newline), analyze it
    if (command.endsWith('\n') || command.endsWith('\r')) {
      const cmdText = command.trim()
      
      if (cmdText.length > 0) {
        // Analyze command
        const analysis = await analyzeWithAI(cmdText)
        
        // Store in history
        const historyItem: CommandHistoryItem = {
          id: generateId(),
          command: cmdText,
          timestamp: new Date(),
          riskLevel: analysis.riskLevel,
          aiAnalysis: analysis
        }
        currentSession.history.push(historyItem)
        
        // Send AI analysis to client
        socket.emit('terminal:analysis', {
          command: cmdText,
          analysis
        })
        
        // If critical/high risk, ask for confirmation
        if (analysis.shouldConfirm) {
          socket.emit('terminal:confirm', {
            command: cmdText,
            analysis
          })
          return // Don't execute yet
        }
      }
    }
    
    // Write to shell
    currentSession.shell?.stdin?.write(command)
    currentSession.lastActivity = new Date()
  })
  
  // Confirm and execute command
  socket.on('terminal:confirm-execute', (data: { command: string }) => {
    if (!currentSession) return
    
    currentSession.shell?.stdin?.write(data.command + '\n')
    currentSession.lastActivity = new Date()
  })
  
  // Cancel command execution
  socket.on('terminal:cancel', () => {
    // Command was cancelled
  })
  
  // Resize terminal
  socket.on('terminal:resize', (data: { cols: number; rows: number }) => {
    if (!currentSession) return
    
    currentSession.cols = data.cols
    currentSession.rows = data.rows
    
    // In production with node-pty:
    // currentSession.shell?.resize(data.cols, data.rows)
  })
  
  // AI Natural Language to Command
  socket.on('terminal:ai:nltocommand', async (data: { input: string }) => {
    const command = await naturalLanguageToCommand(data.input)
    socket.emit('terminal:ai:command', { input: data.input, command })
  })
  
  // AI Explain Command
  socket.on('terminal:ai:explain', async (data: { command: string }) => {
    const explanation = await explainCommand(data.command)
    socket.emit('terminal:ai:explanation', { command: data.command, explanation })
  })
  
  // AI Analyze Command
  socket.on('terminal:ai:analyze', async (data: { command: string }) => {
    const analysis = await analyzeWithAI(data.command)
    socket.emit('terminal:ai:analysis', { command: data.command, analysis })
  })
  
  // Get command history
  socket.on('terminal:history', (data: { limit?: number }) => {
    if (!currentSession) return
    
    const limit = data.limit || 100
    const history = currentSession.history.slice(-limit)
    socket.emit('terminal:history:result', { history })
  })
  
  // Clear terminal
  socket.on('terminal:clear', () => {
    if (!currentSession) return
    socket.emit('terminal:clear')
  })
  
  // Disconnect
  socket.on('disconnect', () => {
    console.log(`[Terminal] Client disconnected: ${socket.id}`)
    
    // Optionally keep session alive for reconnection
    // For now, we'll clean up after a delay
    if (currentSession) {
      setTimeout(() => {
        // Check if socket reconnected
        // If not, clean up session
        const session = sessions.get(currentSession!.id)
        if (session && !io.sockets.adapter.rooms.has(currentSession!.id)) {
          session.shell?.kill()
          sessions.delete(session.id)
          
          const userSessionIds = userSessions.get(session.userId)
          if (userSessionIds) {
            userSessionIds.delete(session.id)
          }
          
          console.log(`[Terminal] Session cleaned up: ${session.id}`)
        }
      }, 30000) // 30 second grace period
    }
  })
  
  // Error handling
  socket.on('error', (error) => {
    console.error(`[Terminal] Socket error: ${error}`)
  })
})

// Health check endpoint - must check if headers already sent
httpServer.on('request', (req, res) => {
  if (req.url === '/health' && !res.headersSent) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      activeSessions: sessions.size,
      uptime: process.uptime()
    }))
  }
})

const PORT = 3004
httpServer.listen(PORT, () => {
  console.log(`[Terminal] Service running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Terminal] Received SIGTERM, shutting down...')
  
  // Kill all active shells
  sessions.forEach((session) => {
    session.shell?.kill()
  })
  
  httpServer.close(() => {
    console.log('[Terminal] Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('[Terminal] Received SIGINT, shutting down...')
  
  sessions.forEach((session) => {
    session.shell?.kill()
  })
  
  httpServer.close(() => {
    console.log('[Terminal] Server closed')
    process.exit(0)
  })
})
