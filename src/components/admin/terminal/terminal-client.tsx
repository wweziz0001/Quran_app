'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
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
  suggestion?: string;
  shouldConfirm: boolean;
}

interface CommandHistoryItem {
  id: string;
  command: string;
  timestamp: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export function TerminalClient({
  tabId,
  sessionId: existingSessionId,
  userId,
  cwd,
  onSessionCreated,
  onExit
}: TerminalClientProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [nlInput, setNlInput] = useState('');
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [currentCwd, setCurrentCwd] = useState(cwd || '~');
  const [error, setError] = useState<string | null>(null);

  // Risk patterns for command analysis
  const RISK_PATTERNS = [
    { pattern: /rm\s+(-[rf]+\s+)*\//, level: 'critical', message: 'Root filesystem deletion attempt' },
    { pattern: /rm\s+(-[rf]+\s+)*\*/, level: 'critical', message: 'Wildcard deletion detected' },
    { pattern: /rm\s+-rf/, level: 'high', message: 'Force recursive deletion' },
    { pattern: /sudo\s+/, level: 'high', message: 'Elevated privileges requested' },
    { pattern: /chmod\s+777/, level: 'medium', message: 'Insecure permissions (777)' },
    { pattern: />\s*\//, level: 'high', message: 'Root filesystem write' },
    { pattern: /mkfs/, level: 'critical', message: 'Filesystem format command' },
    { pattern: /dd\s+if=/, level: 'high', message: 'Disk operation command' },
  ];

  // Analyze command for risks
  const analyzeCommand = useCallback((cmd: string): AIAnalysis => {
    for (const { pattern, level, message } of RISK_PATTERNS) {
      if (pattern.test(cmd)) {
        return {
          riskLevel: level as AIAnalysis['riskLevel'],
          explanation: message,
          shouldConfirm: level === 'critical' || level === 'high'
        };
      }
    }
    return {
      riskLevel: 'low',
      explanation: 'Command appears safe',
      shouldConfirm: false
    };
  }, []);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    let mounted = true;

    // Initialize xterm
    const xterm = new Terminal({
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
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      allowTransparency: true
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);
    xterm.loadAddon(searchAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Welcome message
    xterm.writeln('\x1b[36m╔════════════════════════════════════════════════════════════╗\x1b[0m');
    xterm.writeln('\x1b[36m║\x1b[0m  \x1b[1;34mAI-Powered Terminal\x1b[0m                                \x1b[36m║\x1b[0m');
    xterm.writeln('\x1b[36m║\x1b[0m  \x1b[90mCreating session...\x1b[0m                                    \x1b[36m║\x1b[0m');
    xterm.writeln('\x1b[36m╚════════════════════════════════════════════════════════════╝\x1b[0m');
    xterm.writeln('');

    // Create session
    const createSession = async () => {
      try {
        const response = await fetch('/api/terminal?action=create');
        const data = await response.json();
        
        if (!mounted) return;

        if (data.success && data.sessionId) {
          sessionIdRef.current = data.sessionId;
          setSessionId(data.sessionId);
          setIsConnected(true);
          setIsConnecting(false);
          setCurrentCwd(data.cwd || '~');
          onSessionCreated?.(data.sessionId);

          xterm.writeln('\x1b[32m✓ Terminal session created\x1b[0m');
          xterm.writeln(`\x1b[36m  Session: ${data.sessionId.slice(0, 8)}...\x1b[0m`);
          xterm.writeln(`\x1b[36m  Working directory: ${data.cwd || '~'}\x1b[0m`);
          xterm.writeln('');
          xterm.write('\x1b[1;32m➜\x1b[0m \x1b[1;34m~\x1b[0m $ ');

          // Start SSE connection for output
          const eventSource = new EventSource(`/api/terminal?action=output&sessionId=${data.sessionId}`);
          eventSourceRef.current = eventSource;

          eventSource.onmessage = (event) => {
            try {
              const parsed = JSON.parse(event.data);
              if (parsed.output) {
                xterm.write(parsed.output);
              }
            } catch (e) {
              // Ignore parse errors
            }
          };

          eventSource.onerror = () => {
            // Reconnect logic could go here
          };

        } else {
          throw new Error(data.error || 'Failed to create session');
        }
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message);
        setIsConnecting(false);
        setIsConnected(false);
        xterm.writeln(`\x1b[31m✗ Error: ${err.message}\x1b[0m`);
      }
    };

    createSession();

    // Handle terminal input
    xterm.onData((data: string) => {
      const currentSessionId = sessionIdRef.current;
      if (!currentSessionId) return;

      // Analyze command on Enter
      if (data === '\r') {
        const lines = xterm.buffer.active.getLine(xterm.buffer.active.cursorY)?.translateToString() || '';
        const cmdMatch = lines.match(/\$\s+(.+)$/);
        if (cmdMatch) {
          const cmd = cmdMatch[1].trim();
          if (cmd) {
            const analysis = analyzeCommand(cmd);
            setAiAnalysis(analysis);
            
            // Add to history
            setHistory(prev => [...prev, {
              id: crypto.randomUUID(),
              command: cmd,
              timestamp: new Date().toISOString(),
              riskLevel: analysis.riskLevel
            }]);

            if (analysis.shouldConfirm) {
              setPendingCommand(cmd);
              setShowConfirm(true);
              return; // Don't send yet
            }
          }
        }
      }

      // Send input to terminal
      fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId, input: data })
      }).catch(console.error);
    });

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const currentSessionId = sessionIdRef.current;
        if (currentSessionId) {
          fetch('/api/terminal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              sessionId: currentSessionId, 
              cols: xtermRef.current.cols, 
              rows: xtermRef.current.rows 
            })
          }).catch(console.error);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);

    return () => {
      mounted = false;
      eventSourceRef.current?.close();
      xterm.dispose();
    };
  }, [analyzeCommand, onSessionCreated]);

  // Handle command confirmation
  const handleConfirmExecute = useCallback(() => {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId || !pendingCommand) return;
    
    fetch('/api/terminal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: currentSessionId, input: pendingCommand + '\r' })
    }).catch(console.error);
    
    setShowConfirm(false);
    setPendingCommand(null);
    setAiAnalysis(null);
  }, [pendingCommand]);

  // Cancel execution
  const handleCancelExecute = useCallback(() => {
    setShowConfirm(false);
    setPendingCommand(null);
    setAiAnalysis(null);
  }, []);

  // Natural language to command (simplified)
  const handleNlToCommand = useCallback(async () => {
    if (!nlInput.trim()) return;
    setIsAiLoading(true);
    
    // Simple command mappings
    const mappings: Record<string, string> = {
      'list files': 'ls -la',
      'show files': 'ls -la',
      'current directory': 'pwd',
      'where am i': 'pwd',
      'clear': 'clear',
      'disk usage': 'df -h',
      'memory': 'free -h',
      'processes': 'ps aux',
      'network': 'netstat -tulpn',
    };

    const cmd = mappings[nlInput.toLowerCase()] || `echo "Command not recognized: ${nlInput}"`;
    
    if (xtermRef.current) {
      xtermRef.current.write(cmd);
    }
    
    setIsAiLoading(false);
    setNlInput('');
  }, [nlInput]);

  // Get risk level badge
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
    <div className="flex h-full bg-[#0d1117]">
      {/* Main Terminal Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : isConnecting ? "bg-yellow-500 animate-pulse" : "bg-red-500"
            )} />
            <span className="text-xs text-gray-400 font-mono">
              {isConnecting ? 'Creating session...' : isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {sessionId && (
              <span className="text-xs text-gray-500 font-mono truncate max-w-[200px]">
                {sessionId.slice(0, 8)}
              </span>
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

        {/* Terminal Container */}
        <div 
          ref={terminalRef} 
          className="flex-1 p-2 overflow-hidden"
          style={{ minHeight: '300px' }}
        />

        {/* Confirmation Dialog */}
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
                <Button
                  variant="destructive"
                  onClick={handleConfirmExecute}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Execute
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelExecute}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Assistant Panel */}
      {aiPanelOpen && (
        <div className="w-80 border-l border-[#30363d] flex flex-col bg-[#161b22]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-white">AI Assistant</span>
            </div>
          </div>

          {/* Natural Language Input */}
          <div className="p-3 border-b border-[#30363d]">
            <p className="text-xs text-gray-500 mb-2">Describe what you want to do:</p>
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
                {isAiLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* AI Analysis */}
          {aiAnalysis && (
            <div className="p-3 border-b border-[#30363d]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Command Analysis</span>
                {getRiskBadge(aiAnalysis.riskLevel)}
              </div>
              <p className="text-sm text-gray-300">{aiAnalysis.explanation}</p>
            </div>
          )}

          {/* Command History */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-3">
                <h4 className="text-xs text-gray-500 mb-2">Recent Commands</h4>
                <div className="space-y-1">
                  {history.slice(-20).reverse().map((item) => (
                    <div 
                      key={item.id}
                      className="text-xs p-2 rounded bg-[#0d1117] hover:bg-[#1c2128] cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-gray-300 truncate max-w-[200px]">
                          {item.command}
                        </span>
                        {item.riskLevel && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            {item.riskLevel}
                          </Badge>
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
