'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Play, Save, Clock, Copy, Trash2, Star, StarOff, Plus, X,
  AlertTriangle, Check, Loader2, FileJson, ChevronDown
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useDatabaseStore, SavedQuery, QueryResult } from '@/stores/database-store';

interface SQLEditorProps {
  onExecute?: (query: string) => void;
}

export function SQLEditor({ onExecute }: SQLEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  
  const {
    tabs, activeTabId, savedQueries, queryHistory, isExecuting,
    actions: {
      createTab, closeTab, setActiveTab, updateTabQuery, executeQuery,
      fetchSavedQueries, saveQuery, deleteSavedQuery, toggleFavorite, clearHistory
    }
  } = useDatabaseStore();

  const [showHistory, setShowHistory] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Load saved queries on mount
  useEffect(() => {
    fetchSavedQueries();
  }, [fetchSavedQueries]);

  // Get active tab
  const activeTab = tabs.find(t => t.id === activeTabId);

  // Handle editor mount
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure SQL language
    monaco.languages.register({ id: 'sql' });
    
    // Set SQL keywords for autocomplete
    const sqlKeywords = [
      'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER',
      'TABLE', 'INDEX', 'VIEW', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON',
      'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL', 'AS', 'ORDER', 'BY',
      'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT', 'COUNT',
      'SUM', 'AVG', 'MIN', 'MAX', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
      'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'CHECK', 'DEFAULT',
      'ASC', 'DESC', 'INT', 'VARCHAR', 'TEXT', 'BOOLEAN', 'DATE', 'DATETIME',
      'INTEGER', 'BIGINT', 'SMALLINT', 'DECIMAL', 'NUMERIC', 'REAL', 'DOUBLE',
      'BLOB', 'CLOB', 'NVARCHAR', 'CHAR', 'NCHAR', 'WITH', 'RECURSIVE', 'TEMPORARY',
      'IF', 'EXISTS', 'CASCADE', 'RESTRICT', 'TRUNCATE', 'EXPLAIN', 'ANALYZE'
    ];

    // Register completion provider
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const suggestions: monaco.languages.CompletionItem[] = [
          ...sqlKeywords.map(keyword => ({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range,
            detail: 'SQL Keyword'
          })),
        ];

        return { suggestions };
      }
    });

    // Set editor options
    editor.updateOptions({
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      roundedSelection: true,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      wordWrap: 'on',
      folding: true,
      lineDecorationsWidth: 10,
      padding: { top: 10 }
    });

    // Focus editor
    editor.focus();
  };

  // Handle editor change
  const handleEditorChange: OnChange = (value) => {
    if (activeTabId && value !== undefined) {
      updateTabQuery(activeTabId, value);
    }
  };

  // Save query
  const handleSaveQuery = async () => {
    if (!activeTab?.query) return;
    
    const name = prompt('Enter query name:');
    if (!name) return;
    
    await saveQuery(name, activeTab.query);
    toast.success('Query saved');
  };

  // Execute current query
  const handleExecute = async () => {
    const query = activeTab?.query?.trim();
    if (!query) {
      toast.error('Please enter a query');
      return;
    }

    const result = await executeQuery(query, activeTabId || undefined);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Query executed: ${result.rowCount} rows`);
    }
    onExecute?.(query);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (activeTab?.query) {
          handleSaveQuery();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab?.query]);

  // Create new tab
  const handleNewTab = () => {
    createTab();
  };

  // Load saved query
  const handleLoadQuery = (query: SavedQuery) => {
    if (activeTabId) {
      updateTabQuery(activeTabId, query.query);
    }
    setShowSaved(false);
  };

  // Copy query to clipboard
  const handleCopy = async () => {
    if (activeTab?.query) {
      await navigator.clipboard.writeText(activeTab.query);
      toast.success('Query copied to clipboard');
    }
  };

  // Format query (basic formatting)
  const handleFormat = () => {
    if (!editorRef.current || !activeTab?.query) return;
    
    // Basic SQL formatting
    let formatted = activeTab.query
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s*=\s*/g, ' = ')
      .replace(/SELECT/gi, 'SELECT\n  ')
      .replace(/FROM/gi, '\nFROM')
      .replace(/WHERE/gi, '\nWHERE')
      .replace(/ORDER BY/gi, '\nORDER BY')
      .replace(/GROUP BY/gi, '\nGROUP BY')
      .replace(/HAVING/gi, '\nHAVING')
      .replace(/LEFT JOIN/gi, '\nLEFT JOIN')
      .replace(/RIGHT JOIN/gi, '\nRIGHT JOIN')
      .replace(/INNER JOIN/gi, '\nINNER JOIN')
      .replace(/JOIN/gi, '\nJOIN')
      .replace(/AND/gi, '\n  AND')
      .replace(/OR/gi, '\n  OR');

    updateTabQuery(activeTabId!, formatted);
  };

  // Load query from history
  const handleLoadFromHistory = (query: string) => {
    if (activeTabId) {
      updateTabQuery(activeTabId, query);
    }
    setShowHistory(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="border-b bg-muted/30 flex items-center justify-between px-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-2 px-3 py-2 border-r cursor-pointer transition-colors ${
                activeTabId === tab.id
                  ? 'bg-background border-b-2 border-b-primary'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="text-sm truncate max-w-[150px]">{tab.name}</span>
              {tab.query && !tab.isSaved && <span className="w-2 h-2 rounded-full bg-primary" />}
              <button
                className="hover:bg-muted rounded p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            className="p-2 hover:bg-muted rounded"
            onClick={handleNewTab}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b p-2 flex items-center gap-2 bg-card">
        <Button size="sm" onClick={handleExecute} disabled={isExecuting}>
          {isExecuting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
          Execute
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Save className="h-4 w-4 mr-1" /> Save <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleSaveQuery}>Save Query</DropdownMenuItem>
            <DropdownMenuItem onClick={handleFormat}>Format Query</DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopy}>Copy to Clipboard</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        <DropdownMenu open={showSaved} onOpenChange={setShowSaved}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Star className="h-4 w-4 mr-1" /> Saved ({savedQueries.length})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <ScrollArea className="max-h-64">
              {savedQueries.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No saved queries
                </div>
              ) : (
                savedQueries.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer"
                    onClick={() => handleLoadQuery(q)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{q.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{q.query}</div>
                    </div>
                    <button
                      className="p-1 hover:bg-muted-foreground/10 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(q.id);
                      }}
                    >
                      {q.isFavorite ? (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu open={showHistory} onOpenChange={setShowHistory}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Clock className="h-4 w-4 mr-1" /> History ({queryHistory.length})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <ScrollArea className="max-h-64">
              {queryHistory.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No query history
                </div>
              ) : (
                <>
                  {queryHistory.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer"
                      onClick={() => handleLoadFromHistory(h.query)}
                    >
                      <Badge variant={h.status === 'success' ? 'default' : 'destructive'} className="shrink-0">
                        {h.status}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate">{h.query}</div>
                        <div className="text-xs text-muted-foreground">
                          {h.executionTime.toFixed(2)}ms
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="border-t p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => { clearHistory(); setShowHistory(false); }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Clear History
                    </Button>
                  </div>
                </>
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Editor + Results */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Monaco Editor */}
        <div className="h-1/2 border-b">
          <Editor
            height="100%"
            defaultLanguage="sql"
            theme="vs-dark"
            value={activeTab?.query || ''}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>

        {/* Results Panel */}
        <div className="h-1/2 flex flex-col">
          {activeTab?.result ? (
            <>
              {/* Result Header */}
              <div className="border-b p-2 flex items-center gap-4 bg-muted/30">
                <Badge variant="outline">
                  {activeTab.result.rowCount} rows
                </Badge>
                <Badge variant="outline">
                  {activeTab.result.executionTime.toFixed(2)}ms
                </Badge>
                {activeTab.result.warning && (
                  <Badge variant="secondary" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> Warning
                  </Badge>
                )}
                {activeTab.result.affectedRows && (
                  <Badge variant="default">
                    {activeTab.result.affectedRows} affected
                  </Badge>
                )}
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const data = activeTab.result?.data || [];
                    const json = JSON.stringify(data, null, 2);
                    navigator.clipboard.writeText(json);
                    toast.success('Results copied as JSON');
                  }}
                >
                  <FileJson className="h-4 w-4 mr-1" /> Copy JSON
                </Button>
              </div>

              {/* Result Table */}
              <ScrollArea className="flex-1">
                {activeTab.result.error ? (
                  <div className="p-4 text-destructive">
                    <AlertTriangle className="h-4 w-4 inline mr-2" />
                    {activeTab.result.error}
                  </div>
                ) : activeTab.result.data.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No results
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        {activeTab.result.columns.map((col) => (
                          <TableHead key={col.name} className="font-mono whitespace-nowrap">
                            {col.name}
                            <span className="ml-1 text-xs text-muted-foreground">({col.type})</span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeTab.result.data.slice(0, 500).map((row, i) => (
                        <TableRow key={i}>
                          {activeTab.result!.columns.map((col) => (
                            <TableCell key={col.name} className="font-mono text-sm max-w-xs truncate">
                              {row[col.name] === null ? (
                                <span className="text-muted-foreground italic">NULL</span>
                              ) : (
                                String(row[col.name])
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {activeTab.result.data.length > 500 && (
                  <div className="p-2 text-center text-muted-foreground text-sm border-t">
                    Showing 500 of {activeTab.result.rowCount} rows
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Execute a query to see results</p>
                <p className="text-xs mt-1">Press Ctrl/Cmd + Enter to execute</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SQLEditor;
