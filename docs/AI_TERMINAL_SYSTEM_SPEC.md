# AI-Powered Terminal System - Technical Blueprint

> **Version**: 1.4.0  
> **Status**: Production-Ready Architecture  
> **Author**: System Architect

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ADMIN DASHBOARD (Next.js)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    TERMINAL EMULATOR (xterm.js)                      │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │    │
│  │  │   Tab 1     │ │   Tab 2     │ │   Tab 3     │ │    + Add    │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                    Terminal Display Area                      │   │    │
│  │  │  user@quran-app:~$ █                                         │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    AI ASSISTANT PANEL                                 │    │
│  │  💡 Suggestion: Use `ls -la` to see all files including hidden       │    │
│  │  ⚠️  Risk: Command `rm -rf` detected - Confirm execution?           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ WebSocket (Socket.io)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TERMINAL SERVICE (Mini-Service :3004)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Session    │  │   PTY       │  │   Command   │  │    AI       │        │
│  │  Manager    │  │   Handler   │  │   Parser    │  │  Analyzer   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Audit     │  │   Rate      │  │   File      │  │   Process   │        │
│  │   Logger    │  │   Limiter   │  │   Manager   │  │   Monitor   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ PTY (node-pty)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HOST SYSTEM / CONTAINER                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Shell (bash/zsh/sh)                               │   │
│  │  File System │ Processes │ Environment │ Network │ Docker           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack Decisions

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend Terminal** | xterm.js + xterm-addon-fit | Industry standard, full ANSI support, performant |
| **WebSocket Protocol** | Socket.io | Built-in reconnection, rooms, event system |
| **Backend Shell** | node-pty | True PTY emulation, full shell compatibility |
| **AI Integration** | z-ai-web-dev-sdk (LLM) | Already integrated, powerful NLU capabilities |
| **Session Storage** | In-memory + SQLite | Fast access with persistence option |
| **Audit Logging** | SQLite via Prisma | Transactional, queryable, existing infrastructure |

---

## 2. Terminal Capabilities Specification

### 2.1 Core Shell Features

```typescript
interface TerminalCapabilities {
  // Shell Support
  shell: {
    types: ['bash', 'zsh', 'sh'];
    default: 'bash';
    arguments: string[];
  };

  // Command Features
  commands: {
    history: {
      enabled: true;
      maxSize: 1000;
      persistence: true;
      search: true; // Ctrl+R
    };
    autocomplete: {
      enabled: true;
      files: true;
      commands: true;
      history: true;
    };
    pipes: true;       // |, >, >>, <
    chaining: true;    // &&, ||, ;
    background: true;  // &, nohup
  };

  // File Operations
  filesystem: {
    navigation: true;     // cd, pwd, ls
    editing: true;        // nano, vim support
    upload: true;         // rz/sz protocol
    download: true;       // Download files via browser
    permissions: true;    // chmod, chown
  };

  // Process Management
  processes: {
    list: true;           // ps, top
    kill: true;           // kill, pkill
    background: true;     // bg, fg, jobs
    monitoring: true;     // htop-like view
  };

  // Environment
  environment: {
    variables: true;      // export, unset
    path: true;           // PATH management
    aliases: true;        // alias, unalias
    functions: true;      // shell functions
  };

  // Network
  network: {
    curl: true;
    wget: true;
    ssh: false;           // Disabled for security (Phase 2)
    scp: false;           // Disabled for security (Phase 2)
  };
}
```

### 2.2 Advanced Terminal Features

```typescript
interface AdvancedTerminalFeatures {
  // Multi-Session Support
  sessions: {
    tabs: true;           // Multiple terminal tabs
    splitPane: true;      // Horizontal/vertical split
    persistence: true;    // Reconnect to sessions
    naming: true;         // Name your sessions
  };

  // Display Features
  display: {
    ansiColors: true;     // Full 256 color support
    trueColor: true;      // 24-bit color
    unicode: true;        // UTF-8 support
    mouse: true;          // Mouse events
    links: true;          // Clickable URLs
  };

  // Copy/Paste
  clipboard: {
    copy: true;           // Ctrl+Shift+C
    paste: true;          // Ctrl+Shift+V
    bracketedPaste: true; // Safe paste handling
  };

  // Search
  search: {
    enabled: true;        // Ctrl+Shift+F
    regex: true;          // Regex support
    caseSensitive: true;  // Case toggle
  };

  // Customization
  theming: {
    presets: ['dark', 'light', 'dracula', 'monokai', 'solarized'];
    custom: true;         // Custom color schemes
    fontSize: true;       // Adjustable font size
    fontFamily: true;     // Monospace fonts
  };
}
```

---

## 3. AI Integration Layer

### 3.1 AI Capabilities Architecture

```typescript
interface AITerminalAssistant {
  // Natural Language to Command
  nlToCommand: {
    enabled: true;
    examples: [
      { input: "show me all files bigger than 100MB", command: "find . -size +100M" },
      { input: "kill the node process", command: "pkill node" },
      { input: "find all js files modified today", command: "find . -name '*.js' -mtime 0" }
    ];
  };

  // Command Explanation
  commandExplanation: {
    enabled: true;
    detail: 'brief' | 'detailed' | 'educational';
    examples: [
      { command: "chmod 755 script.sh", explanation: "Sets read, write, execute for owner; read and execute for group and others" }
    ];
  };

  // Risk Detection
  riskDetection: {
    enabled: true;
    levels: ['low', 'medium', 'high', 'critical'];
    patterns: [
      { pattern: /rm\s+-rf/, level: 'critical', message: "Recursive force deletion detected" },
      { pattern: /sudo/, level: 'high', message: "Elevated privileges requested" },
      { pattern: />\s*\//, level: 'high', message: "Root filesystem write detected" },
      { pattern: /chmod\s+777/, level: 'medium', message: "Insecure permissions" }
    ];
    action: 'warn' | 'confirm' | 'block';
  };

  // Auto-Suggestions
  autoSuggestions: {
    enabled: true;
    types: ['command', 'file', 'history', 'context'];
    debounce: 300; // ms
  };

  // Debugging Assistance
  debugging: {
    enabled: true;
    errorAnalysis: true;
    suggestFixes: true;
    logAnalysis: true;
  };

  // Context Memory
  contextMemory: {
    enabled: true;
    maxMessages: 20;
    persistence: 'session' | 'persistent';
  };
}
```

### 3.2 AI Service Implementation

```typescript
// Backend AI Analysis Service
class TerminalAI {
  private conversationHistory: Message[] = [];
  
  async analyzeCommand(command: string): Promise<CommandAnalysis> {
    const zai = await ZAI.create();
    
    const analysis = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: this.getSystemPrompt() },
        { role: 'user', content: `Analyze this command: ${command}` }
      ],
      thinking: { type: 'disabled' }
    });
    
    return this.parseAnalysis(analysis);
  }

  async naturalLanguageToCommand(input: string): Promise<string> {
    const zai = await ZAI.create();
    
    const result = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: `You are a terminal expert. Convert natural language to shell commands.
          Return ONLY the command, no explanation. If unclear, return "echo 'Command unclear'"` },
        { role: 'user', content: input }
      ],
      thinking: { type: 'disabled' }
    });
    
    return result.choices[0]?.message?.content || '';
  }

  private getSystemPrompt(): string {
    return `You are a terminal security and assistance AI. Analyze commands for:
    1. Risk level (low/medium/high/critical)
    2. What the command does
    3. Potential dangers
    4. Safer alternatives if available
    Respond in JSON format.`;
  }
}
```

---

## 4. Security & Permissions Model

### 4.1 Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: Authentication                                        │
│  ├── Admin session required                                     │
│  ├── JWT token validation                                       │
│  └── IP whitelist (optional)                                    │
│                                                                 │
│  Layer 2: Authorization                                         │
│  ├── Role-based access (admin/superadmin)                       │
│  ├── Command whitelist/blacklist                                │
│  └── Resource quotas                                            │
│                                                                 │
│  Layer 3: Execution Isolation                                   │
│  ├── Containerized shell (Docker) - Recommended                 │
│  ├── Restricted shell (rbash) - Alternative                     │
│  └── Chroot environment - Legacy option                         │
│                                                                 │
│  Layer 4: Monitoring & Audit                                    │
│  ├── Full command logging                                       │
│  ├── Real-time monitoring                                       │
│  ├── Alert triggers                                             │
│  └── Session recording                                          │
│                                                                 │
│  Layer 5: Rate Limiting                                         │
│  ├── Commands per second limit                                  │
│  ├── Session timeout                                            │
│  └── Concurrent session limit                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Permission Levels

```typescript
interface PermissionConfig {
  // Full Access Mode (Development/Trusted)
  fullAccess: {
    commands: '*';              // All commands allowed
    filesystem: '/';            // Full filesystem access
    sudo: true;                 // Sudo allowed
    networking: true;           // Network commands allowed
    riskLevel: 'high';          // Requires explicit consent
  };

  // Standard Mode (Production Default)
  standard: {
    commands: {
      allowed: ['ls', 'cd', 'cat', 'grep', 'find', 'ps', 'top', 'nano', 'vim', 'mkdir', 'rm', 'cp', 'mv'],
      blocked: ['rm -rf /*', 'mkfs', 'dd if=/dev/zero', 'chmod 777 /']
    };
    filesystem: '/app';         // Restricted to app directory
    sudo: false;                // No sudo
    networking: false;          // No network commands
    riskLevel: 'medium';
  };

  // Restricted Mode (Least Privilege)
  restricted: {
    commands: ['ls', 'cd', 'cat', 'pwd', 'echo'];
    filesystem: '/app/data';
    sudo: false;
    networking: false;
    riskLevel: 'low';
  };
}
```

### 4.3 Audit Logging Schema

```prisma
model TerminalSession {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  startTime   DateTime @default(now())
  endTime     DateTime?
  ipAddress   String
  userAgent   String
  commands    TerminalCommand[]
  
  @@index([userId])
  @@index([startTime])
}

model TerminalCommand {
  id          String   @id @default(uuid())
  sessionId   String
  session     TerminalSession @relation(fields: [sessionId], references: [id])
  timestamp   DateTime @default(now())
  command     String
  exitCode    Int?
  output      String?  // First 1000 chars
  riskLevel   String?  // low/medium/high/critical
  aiAnalysis  Json?    // AI analysis result
  approved    Boolean  @default(true)
  approvedBy  String?  // If confirmation required
  
  @@index([sessionId])
  @@index([timestamp])
}
```

### 4.4 Damage Containment

```typescript
interface DamageContainment {
  // Command Rollback
  rollback: {
    enabled: true;
    fileTracking: true;        // Track file changes
    snapshotBefore: ['rm', 'mv', 'chmod', 'chown'];
    maxRollbackTime: 3600;     // 1 hour in seconds
  };

  // Emergency Stop
  emergencyStop: {
    enabled: true;
    trigger: 'manual' | 'auto';
    autoTriggers: [
      'cpu_usage > 95%',
      'memory_usage > 90%',
      'disk_usage > 95%',
      'network_flood_detected'
    ];
    action: 'kill_session' | 'kill_process' | 'freeze_session';
  };

  // Resource Limits
  resourceLimits: {
    maxCpuPercent: 50;
    maxMemoryMB: 512;
    maxFileSizeMB: 100;
    maxProcesses: 10;
    maxOpenFiles: 100;
  };
}
```

---

## 5. UX/UI Structure

### 5.1 Component Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  TERMINAL PAGE                                                            │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  HEADER BAR                                                         │  │
│  │  ┌─────────┐ ┌────────────────────────────────┐ ┌────────────────┐ │  │
│  │  │ Status  │ │ Session: main-server  ⏱️ 2:34:15 │ │ ⚙️ Settings ⚡ │ │  │
│  │  │ 🟢 Live │ │                                │ │                │ │  │
│  │  └─────────┘ └────────────────────────────────┘ └────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────┬─────────┐  │
│  │  MAIN TERMINAL AREA                                      │ AI PANEL │  │
│  │  ┌────────────────────────────────────────────────────┐  │         │  │
│  │  │ TAB BAR                                            │  │ 💡 AI   │  │
│  │  │ [Terminal 1 ×] [Terminal 2 ×] [Server ×] [+]       │  │ Assist  │  │
│  │  └────────────────────────────────────────────────────┘  │         │  │
│  │  ┌────────────────────────────────────────────────────┐  │ ─────── │  │
│  │  │                                                    │  │         │  │
│  │  │  $ ls -la                                          │  │ Ask AI: │  │
│  │  │  total 48                                          │  │ ┌─────┐ │  │
│  │  │  drwxr-xr-x  5 user user 4096 Jan 15 src          │  │ │     │ │  │
│  │  │  drwxr-xr-x  3 user user 4096 Jan 15 public       │  │ │     │ │  │
│  │  │                                                    │  │ └─────┘ │  │
│  │  │  $ █                                              │  │         │  │
│  │  │                                                    │  │ ─────── │  │
│  │  │                                                    │  │ Recent: │  │
│  │  │                                                    │  │ • find  │  │
│  │  │                                                    │  │ • grep  │  │
│  │  │                                                    │  │ • ps    │  │
│  │  └────────────────────────────────────────────────────┘  │         │  │
│  │                                                          └─────────┘  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  FOOTER BAR                                                         │  │
│  │  bash | ~/project/quran-app | user@quran-server | 50x24 | UTF-8   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+T` | New Tab |
| `Ctrl+Shift+W` | Close Tab |
| `Ctrl+Tab` | Next Tab |
| `Ctrl+Shift+Tab` | Previous Tab |
| `Ctrl+Shift+S` | Split Pane |
| `Ctrl+Shift+F` | Search |
| `Ctrl+Shift+C` | Copy |
| `Ctrl+Shift+V` | Paste |
| `Ctrl+Shift+L` | Clear Terminal |
| `Ctrl+R` | History Search |
| `F11` | Fullscreen |
| `Ctrl+Shift+A` | Toggle AI Panel |

### 5.3 Visual Indicators

```typescript
interface VisualIndicators {
  // Status Indicators
  status: {
    connected: { icon: '🟢', color: 'green', text: 'Connected' };
    reconnecting: { icon: '🟡', color: 'yellow', text: 'Reconnecting...' };
    disconnected: { icon: '🔴', color: 'red', text: 'Disconnected' };
    error: { icon: '⚠️', color: 'orange', text: 'Error' };
  };

  // Command Status
  commandStatus: {
    success: { icon: '✓', color: 'green' };
    error: { icon: '✗', color: 'red' };
    running: { icon: '⏳', color: 'blue' };
    warning: { icon: '⚠', color: 'yellow' };
  };

  // Risk Levels
  riskIndicators: {
    low: { color: 'gray', icon: 'ℹ️' };
    medium: { color: 'yellow', icon: '⚠️' };
    high: { color: 'orange', icon: '🔶' };
    critical: { color: 'red', icon: '🚨' };
  };
}
```

---

## 6. Scalability & Performance

### 6.1 Concurrent Session Management

```typescript
interface SessionManagement {
  // Per-User Limits
  perUser: {
    maxSessions: 5;
    maxTabsPerSession: 10;
    maxHistoryPerSession: 1000;
  };

  // Global Limits
  global: {
    maxTotalSessions: 100;
    maxConcurrentConnections: 500;
  };

  // Resource Allocation
  resources: {
    cpuPerSession: 0.5;        // CPU cores
    memoryPerSession: 256;     // MB
    diskQuotaPerUser: 1024;    // MB
  };

  // Load Balancing
  loadBalancing: {
    strategy: 'least-connections';
    healthCheckInterval: 30000; // ms
    sessionAffinity: true;
  };
}
```

### 6.2 Performance Optimization

```typescript
interface PerformanceConfig {
  // Terminal Rendering
  rendering: {
    bufferSize: 10000;         // Lines to keep in buffer
    scrollback: 5000;          // Lines in scrollback
    fastScrollModifier: 'shift';
    gpuAcceleration: true;
  };

  // WebSocket
  websocket: {
    pingInterval: 25000;       // ms
    pingTimeout: 60000;        // ms
    maxHttpBufferSize: 1e8;    // 100MB
    perMessageDeflate: true;
  };

  // Caching
  caching: {
    commandHistory: true;
    directoryListing: 5000;    // Cache for 5 seconds
    autocompletion: true;
  };
}
```

---

## 7. Phased Roadmap

### Phase 1: MVP (Week 1-2)
**Goal**: Basic Interactive Shell

- [ ] xterm.js integration
- [ ] WebSocket connection (Socket.io)
- [ ] PTY spawn (node-pty)
- [ ] Basic command execution
- [ ] Session management
- [ ] Command history
- [ ] Basic audit logging

**Deliverables**:
- Working terminal with bash shell
- Real-time input/output
- Session persistence

### Phase 2: Advanced Features (Week 3-4)
**Goal**: Multi-session + AI Assist

- [ ] Multi-tab interface
- [ ] Split panes
- [ ] AI command suggestions
- [ ] Natural language to command
- [ ] Risk detection
- [ ] Enhanced audit logging
- [ ] File upload/download

**Deliverables**:
- Professional terminal experience
- AI-powered assistance
- Security features

### Phase 3: Enterprise (Week 5-6)
**Goal**: Isolation + Monitoring + Policy

- [ ] Docker container isolation
- [ ] Resource monitoring
- [ ] Policy engine
- [ ] Session recording
- [ ] Advanced permissions
- [ ] SSH capability
- [ ] Multi-server support

**Deliverables**:
- Enterprise-ready terminal
- Full security compliance
- Scalable architecture

---

## 8. Risk Assessment

### 8.1 Identified Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Command Injection | Critical | Input sanitization, AI risk detection, confirmation dialogs |
| Unauthorized Access | High | Authentication, IP whitelist, session tokens |
| Resource Exhaustion | High | Rate limiting, resource quotas, monitoring |
| Data Leakage | Medium | Audit logging, output filtering, no network in restricted mode |
| Session Hijacking | Medium | JWT tokens, secure WebSocket, session timeout |
| Privilege Escalation | Critical | No sudo in production, container isolation, monitored commands |

### 8.2 Security Best Practices

1. **Never run as root** - Use unprivileged user
2. **Containerize everything** - Docker isolation recommended
3. **Log everything** - Full audit trail
4. **Validate all input** - Client and server side
5. **Rate limit aggressively** - Prevent abuse
6. **Encrypt in transit** - WSS required in production
7. **Regular audits** - Review logs weekly
8. **Principle of least privilege** - Start restrictive, expand as needed

---

## 9. File Structure

```
src/
├── components/
│   └── admin/
│       └── terminal/
│           ├── terminal-section.tsx       # Main terminal page
│           ├── terminal-instance.tsx      # Single terminal instance
│           ├── terminal-tabs.tsx          # Tab management
│           ├── ai-assistant-panel.tsx     # AI side panel
│           ├── command-palette.tsx        # Quick command access
│           ├── terminal-settings.tsx      # Settings modal
│           └── session-manager.tsx        # Session management UI

mini-services/
└── terminal-service/
    ├── index.ts                           # Main server entry
    ├── package.json                       # Dependencies
    ├── lib/
    │   ├── pty-manager.ts                 # PTY process management
    │   ├── session-store.ts               # Session persistence
    │   ├── command-analyzer.ts            # AI command analysis
    │   ├── audit-logger.ts                # Command logging
    │   └── rate-limiter.ts                # Rate limiting
    └── types/
        └── terminal.types.ts              # TypeScript interfaces

prisma/
└── schema.prisma                          # Add TerminalSession & TerminalCommand

docs/
└── AI_TERMINAL_SYSTEM_SPEC.md             # This document
```

---

## 10. Dependencies

### Frontend
```json
{
  "xterm": "^5.3.0",
  "xterm-addon-fit": "^0.8.0",
  "xterm-addon-web-links": "^0.9.0",
  "xterm-addon-search": "^0.13.0",
  "xterm-addon-unicode11": "^0.6.0",
  "socket.io-client": "^4.7.0"
}
```

### Backend (Mini-Service)
```json
{
  "node-pty": "^1.0.0",
  "socket.io": "^4.7.0",
  "z-ai-web-dev-sdk": "^0.0.16",
  "uuid": "^11.1.0"
}
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-03-01  
**Next Review**: After Phase 1 completion
