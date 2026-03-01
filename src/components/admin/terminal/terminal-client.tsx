'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, CheckCircle, Info, XCircle, 
  Loader2, Sparkles, Send, X, Maximize2, Minimize2
} from 'lucide-react';
import 'xterm/css/xterm.css';

interface TerminalClientProps {
  tabId: string;
  sessionId?: string;
  userId: string;
  cwd?: string;
  onSessionCreated?: (sessionId: string) => void;
  onExit?: (code: number) => void;
}

interface AIAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  shouldConfirm: boolean;
}

interface CommandHistoryItem {
  id: string;
  command: string;
  timestamp: string;
  riskLevel?: string;
}

// Risk patterns
const RISK_PATTERNS = [
  { pattern: /rm\s+(-[rf]+\s+)*\//, level: 'critical', message: 'Root filesystem deletion' },
  { pattern: /rm\s+(-[rf]+\s+)*\*/, level: 'critical', message: 'Wildcard deletion' },
  { pattern: /rm\s+-rf/, level: 'high', message: 'Force recursive deletion' },
  { pattern: /sudo\s+/, level: 'high', message: 'Elevated privileges' },
  { pattern: /chmod\s+777/, level: 'medium', message: 'Insecure permissions' },
  { pattern: /mkfs/, level: 'critical', message: 'Filesystem format' },
  { pattern: /dd\s+if=/, level: 'high', message: 'Disk operation' },
];

function analyzeCommand(cmd: string): AIAnalysis {
  for (const { pattern, level, message } of RISK_PATTERNS) {
    if (pattern.test(cmd)) {
      return {
        riskLevel: level as AIAnalysis['riskLevel'],
        explanation: message,
        shouldConfirm: level === 'critical' || level === 'high'
      };
    }
  }
  return { riskLevel: 'low', explanation: 'Command appears safe', shouldConfirm: false };
}

export function TerminalClient({
  tabId,
  userId,
  cwd,
  onSessionCreated,
}: TerminalClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const initializedRef = useRef(false);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentCwd, setCurrentCwd] = useState(cwd || '~');
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [nlInput, setNlInput] = useState('');
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Initialize terminal once
  useEffect(() => {
    if (initializedRef.current) return;
    
    const container = containerRef.current;
    if (!container) return;

    // Check container dimensions
    const rect = container.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) {
      return; // Container too small, will retry
    }

    initializedRef.current = true;
    
    // Create terminal
    const term = new Terminal({
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        cursorAccent: '#0d1117',
        selectionBackground: '#264f78',
        black: '#484f58',
        red: '#f97583',
        green: '#85e89d',
        yellow: '#ffea7f',
        blue: '#79b8ff',
        magenta: '#b392f0',
        cyan: '#56d4dd',
        white: '#e1e4e8',
        brightBlack: '#6a737d',
        brightRed: '#f97583',
        brightGreen: '#85e89d',
        brightYellow: '#ffea7f',
        brightBlue: '#79b8ff',
        brightMagenta: '#b392f0',
        brightCyan: '#56d4dd',
        brightWhite: '#fafbfc'
      },
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 14,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 3000,
      cols: 80,
      rows: 24
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    
    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // Fit after a short delay
    setTimeout(() => {
      try {
        if (term.element) {
          fitAddon.fit();
        }
      } catch (e) {
        // Ignore fit errors
      }
    }, 100);

    // Welcome message
    term.writeln('\x1b[36m╔════════════════════════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[36m║\x1b[0m  \x1b[1;34mAI-Powered Terminal\x1b[0m                                \x1b[36m║\x1b[0m');
    term.writeln('\x1b[36m║\x1b[0m  \x1b[90mCreating session...\x1b[0m                                    \x1b[36m║\x1b[0m');
    term.writeln('\x1b[36m╚════════════════════════════════════════════════════════════╝\x1b[0m');
    term.writeln('');

    // Create session
    fetch('/api/terminal?action=create')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.sessionId) {
          sessionIdRef.current = data.sessionId;
          setSessionId(data.sessionId);
          setIsConnected(true);
          setIsConnecting(false);
          setCurrentCwd(data.cwd || '~');
          onSessionCreated?.(data.sessionId);

          term.writeln('\x1b[32m✓ Session created\x1b[0m');
          term.writeln(`\x1b[36m  ID: ${data.sessionId.slice(0, 8)}...\x1b[0m`);
          term.writeln('');
          term.write('\x1b[1;32m➜\x1b[0m \x1b[1;34m~\x1b[0m $ ');

          // SSE for output
          const es = new EventSource(`/api/terminal?action=output&sessionId=${data.sessionId}`);
          eventSourceRef.current = es;
          
          es.onmessage = (event) => {
            try {
              const parsed = JSON.parse(event.data);
              if (parsed.output) {
                term.write(parsed.output);
              }
            } catch (e) {}
          };
        } else {
          throw new Error(data.error || 'Failed to create session');
        }
      })
      .catch(err => {
        setIsConnecting(false);
        term.writeln(`\x1b[31m✗ Error: ${err.message}\x1b[0m`);
      });

    // Handle input
    term.onData((data) => {
      const sid = sessionIdRef.current;
      if (!sid) return;

      // Check for dangerous commands
      if (data === '\r') {
        const line = term.buffer.active.getLine(term.buffer.active.cursorY)?.translateToString() || '';
        const match = line.match(/\$\s+(.+)$/);
        if (match) {
          const cmd = match[1].trim();
          if (cmd) {
            const analysis = analyzeCommand(cmd);
            setAiAnalysis(analysis);
            setHistory(prev => [...prev, {
              id: Date.now().toString(),
              command: cmd,
              timestamp: new Date().toISOString(),
              riskLevel: analysis.riskLevel
            }]);
            
            if (analysis.shouldConfirm) {
              setPendingCommand(cmd);
              setShowConfirm(true);
              return;
            }
          }
        }
      }

      fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, input: data })
      }).catch(() => {});
    });

    // Resize handler
    const handleResize = () => {
      try {
        if (fitAddonRef.current && terminalRef.current?.element) {
          fitAddonRef.current.fit();
        }
      } catch (e) {}
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      eventSourceRef.current?.close();
      terminalRef.current?.dispose();
      terminalRef.current = null;
      initializedRef.current = false;
    };
  }, []); // Empty deps - only run once

  // Execute confirmed command
  const handleConfirmExecute = useCallback(() => {
    const sid = sessionIdRef.current;
    if (!sid || !pendingCommand) return;
    
    fetch('/api/terminal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, input: pendingCommand + '\r' })
    }).catch(() => {});
    
    setShowConfirm(false);
    setPendingCommand(null);
    setAiAnalysis(null);
  }, [pendingCommand]);

  // Cancel
  const handleCancel = useCallback(() => {
    setShowConfirm(false);
    setPendingCommand(null);
    setAiAnalysis(null);
  }, []);

  // NL to command
  const handleNlToCommand = useCallback(() => {
    if (!nlInput.trim() || !terminalRef.current) return;
    setIsAiLoading(true);
    
    const mappings: Record<string, string> = {
      'list files': 'ls -la',
      'show files': 'ls -la',
      'current directory': 'pwd',
      'clear': 'clear',
      'disk usage': 'df -h',
      'memory': 'free -h',
      'processes': 'ps aux',
    };

    const cmd = mappings[nlInput.toLowerCase()] || `echo "Unknown: ${nlInput}"`;
    terminalRef.current.write(cmd);
    
    setIsAiLoading(false);
    setNlInput('');
  }, [nlInput]);

  const getRiskBadge = (level: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      low: { color: 'bg-gray-500', icon: <Info className="h-3 w-3" /> },
      medium: { color: 'bg-yellow-500', icon: <AlertTriangle className="h-3 w-3" /> },
      high: { color: 'bg-orange-500', icon: <AlertTriangle className="h-3 w-3" /> },
      critical: { color: 'bg-red-500', icon: <XCircle className="h-3 w-3" /> }
    };
    const c = config[level] || config.low;
    return (
      <Badge className={cn(c.color, 'text-white gap-1')}>
        {c.icon}
        {level.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="flex h-full bg-[#0d1117] relative">
      {/* Terminal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : isConnecting ? "bg-yellow-500 animate-pulse" : "bg-red-500"
            )} />
            <span className="text-xs text-gray-400 font-mono">
              {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {sessionId && (
              <span className="text-xs text-gray-500 font-mono">{sessionId.slice(0, 8)}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono">{currentCwd}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:text-white"
              onClick={() => setAiPanelOpen(!aiPanelOpen)}
            >
              {aiPanelOpen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Terminal container */}
        <div 
          ref={containerRef} 
          className="flex-1 p-2 overflow-hidden"
          style={{ minHeight: '200px' }}
        />

        {/* Confirm dialog */}
        {showConfirm && aiAnalysis && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 max-w-md mx-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span className="text-white font-medium">Confirm Command</span>
              </div>
              <div className="bg-[#0d1117] rounded p-3 mb-3 font-mono text-sm text-red-400">
                {pendingCommand}
              </div>
              <p className="text-gray-400 text-sm mb-4">{aiAnalysis.explanation}</p>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleConfirmExecute} className="flex-1">
                  <CheckCircle className="h-4 w-4 mr-2" /> Execute
                </Button>
                <Button variant="outline" onClick={handleCancel} className="flex-1">
                  <X className="h-4 w-4 mr-2" /> Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Panel */}
      {aiPanelOpen && (
        <div className="w-80 border-l border-[#30363d] flex flex-col bg-[#161b22]">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#30363d]">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-white">AI Assistant</span>
          </div>

          <div className="p-3 border-b border-[#30363d]">
            <p className="text-xs text-gray-500 mb-2">Describe what you want:</p>
            <div className="flex gap-2">
              <Input
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNlToCommand()}
                placeholder="e.g., list files"
                className="bg-[#0d1117] border-[#30363d] text-white text-sm"
              />
              <Button
                size="icon"
                onClick={handleNlToCommand}
                disabled={!nlInput.trim() || isAiLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {aiAnalysis && (
            <div className="p-3 border-b border-[#30363d]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Analysis</span>
                {getRiskBadge(aiAnalysis.riskLevel)}
              </div>
              <p className="text-sm text-gray-300">{aiAnalysis.explanation}</p>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-3">
                <h4 className="text-xs text-gray-500 mb-2">Recent</h4>
                <div className="space-y-1">
                  {history.slice(-10).reverse().map((item) => (
                    <div key={item.id} className="text-xs p-2 rounded bg-[#0d1117] hover:bg-[#1c2128] cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-gray-300 truncate max-w-[200px]">{item.command}</span>
                        {item.riskLevel && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1">{item.riskLevel}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
