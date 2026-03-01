'use client';

import { useState, useCallback, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, X, Terminal as TerminalIcon, 
  Settings, Clock, Activity, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Dynamic import with no SSR for the terminal
const TerminalClient = dynamic(
  () => import('./terminal-client').then(mod => ({ default: mod.TerminalClient })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-[#0d1117]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="text-gray-400 text-sm">Loading terminal...</span>
        </div>
      </div>
    )
  }
);

interface TerminalTab {
  id: string;
  name: string;
  sessionId?: string;
  createdAt: Date;
  status: 'connecting' | 'connected' | 'disconnected';
}

// Custom hook to check if we're on client
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function TerminalSection() {
  const isClient = useIsClient();
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: '1', name: 'Terminal 1', createdAt: new Date(), status: 'connecting' }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [sessions, setSessions] = useState<Map<string, string>>(new Map());

  const activeTab = tabs.find(t => t.id === activeTabId);

  const addTab = useCallback(() => {
    const newId = (parseInt(tabs[tabs.length - 1]?.id || '0') + 1).toString();
    const newTab: TerminalTab = {
      id: newId,
      name: `Terminal ${newId}`,
      createdAt: new Date(),
      status: 'connecting'
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  }, [tabs]);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      if (prev.length === 1) return prev;
      const newTabs = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      }
      return newTabs;
    });
  }, [activeTabId]);

  const handleSessionCreated = useCallback((tabId: string, sessionId: string) => {
    setSessions(prev => new Map(prev).set(tabId, sessionId));
    setTabs(prev => prev.map(t => 
      t.id === tabId 
        ? { ...t, sessionId, status: 'connected' as const }
        : t
    ));
  }, []);

  const handleExit = useCallback((tabId: string, code: number) => {
    setTabs(prev => prev.map(t =>
      t.id === tabId
        ? { ...t, status: 'disconnected' as const }
        : t
    ));
  }, []);

  if (!isClient) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-muted-foreground text-sm">Initializing terminal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <TerminalIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">AI Terminal</h2>
            <p className="text-sm text-muted-foreground">
              AI-powered terminal with natural language support
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Activity className="h-3 w-3" />
            {tabs.length} session{tabs.length > 1 ? 's' : ''}
          </Badge>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-2 py-2 bg-muted/30 border-b overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-t-lg cursor-pointer transition-colors min-w-[120px]",
              activeTabId === tab.id
                ? "bg-background border border-b-0 border-border"
                : "hover:bg-background/50"
            )}
            onClick={() => setActiveTabId(tab.id)}
          >
            <div className={cn(
              "w-2 h-2 rounded-full",
              tab.status === 'connected' && "bg-green-500",
              tab.status === 'connecting' && "bg-yellow-500 animate-pulse",
              tab.status === 'disconnected' && "bg-red-500"
            )} />
            <span className="text-sm font-medium truncate flex-1">{tab.name}</span>
            {tabs.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 opacity-60 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={addTab}
          title="New Terminal"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 relative min-h-0">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              "absolute inset-0",
              activeTabId === tab.id ? "block" : "hidden"
            )}
          >
            <TerminalClient
              key={tab.id}
              tabId={tab.id}
              sessionId={sessions.get(tab.id)}
              userId="admin-user"
              onSessionCreated={(sId) => handleSessionCreated(tab.id, sId)}
              onExit={(code) => handleExit(tab.id, code)}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-card text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date().toLocaleTimeString()}
          </span>
          <span>bash</span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">Ctrl+Shift+T</kbd>
          <span>New Tab</span>
        </div>
      </div>
    </div>
  );
}
