'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight, ChevronDown, RefreshCw, Plus, Trash2,
  FolderPlus, FilePlus, Download, Search, X,
  Loader2, Replace, CaseSensitive, Regex, Check, 
  WholeWord, Copy, Scissors, Clipboard, FileEdit, FolderOpen, File
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileIcon } from './file-icons';
import { ContextMenu, ContextMenuItem } from './context-menu';

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  extension?: string;
  size?: number;
  children?: FileNode[];
}

interface SideBarProps {
  activePanel: 'explorer' | 'search' | 'git' | 'debug' | 'extensions';
  fileTree: FileNode[];
  loading?: boolean;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  openFilePaths: Set<string>;
  onFileSelect: (node: FileNode) => void;
  onFileDownload: (node: FileNode) => void;
  onFileDelete: (node: FileNode) => void;
  onExpandToggle: (path: string) => void;
  onNewFile: (parentPath: string, type: 'file' | 'directory') => void;
  onRefresh: () => void;
  onRename?: (node: FileNode, newName: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// File tree item component
function FileTreeItem({ 
  node, 
  depth = 0, 
  selectedPath, 
  openFilePaths,
  onSelect, 
  onExpand,
  expandedPaths,
  onDownload,
  onDelete,
  onNewFile,
  onRename,
  selectedIds,
  onSelectedIdsChange,
  lastSelectedRef,
  isRenaming,
  onRenameComplete,
  contextMenu,
  onContextMenu,
}: { 
  node: FileNode;
  depth?: number;
  selectedPath: string | null;
  openFilePaths: Set<string>;
  onSelect: (node: FileNode) => void;
  onExpand: (path: string) => void;
  expandedPaths: Set<string>;
  onDownload: (node: FileNode) => void;
  onDelete: (node: FileNode) => void;
  onNewFile: (parentPath: string, type: 'file' | 'directory') => void;
  onRename?: (node: FileNode, newName: string) => void;
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  lastSelectedRef: React.MutableRefObject<string | null>;
  isRenaming: string | null;
  onRenameComplete: (id: string | null) => void;
  contextMenu: { x: number; y: number; node: FileNode } | null;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
}) {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const isOpen = openFilePaths.has(node.path);
  const isInSelectedSet = selectedIds.has(node.path);
  const isCurrentlyRenaming = isRenaming === node.path;
  
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Handle rename mode activation - focus and select
  useEffect(() => {
    if (isCurrentlyRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      const dotIndex = node.name.lastIndexOf('.');
      const selectEnd = dotIndex > 0 ? dotIndex : node.name.length;
      renameInputRef.current.setSelectionRange(0, selectEnd);
    }
  }, [isCurrentlyRenaming, node.name]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Multi-select with Ctrl/Cmd or Shift
    if (e.ctrlKey || e.metaKey) {
      onSelectedIdsChange(prev => {
        const next = new Set(prev);
        if (next.has(node.path)) {
          next.delete(node.path);
        } else {
          next.add(node.path);
        }
        return next;
      });
      lastSelectedRef.current = node.path;
    } else if (e.shiftKey && lastSelectedRef.current) {
      // Shift+click - select range (simplified - just add to selection)
      onSelectedIdsChange(prev => new Set([...prev, node.path]));
      lastSelectedRef.current = node.path;
    } else {
      // Normal click - single selection
      onSelectedIdsChange(new Set([node.path]));
      lastSelectedRef.current = node.path;
      
      if (node.type === 'directory') {
        onExpand(node.path);
      } else {
        onSelect(node);
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'file') {
      onSelect(node);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, node);
  };

  const handleRenameSubmit = () => {
    const newName = renameInputRef.current?.value.trim();
    if (newName && newName !== node.name && onRename) {
      onRename(node, newName);
    }
    onRenameComplete(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      onRenameComplete(null);
    }
  };

  const sortedChildren = node.children
    ? [...node.children].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
    : [];

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1 px-2 cursor-pointer rounded-md text-sm group transition-colors",
          isSelected && "bg-primary/10 border border-primary/30",
          isInSelectedSet && !isSelected && "bg-accent/50",
          isOpen && !isSelected && !isInSelectedSet && "bg-accent/30",
          !isSelected && !isInSelectedSet && !isOpen && "hover:bg-accent/50"
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Chevron for folders */}
        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {node.type === 'directory' && (
            <ChevronRight
              className={cn(
                "h-3 w-3 text-muted-foreground transition-transform duration-150",
                isExpanded && "rotate-90"
              )}
            />
          )}
        </div>

        {/* Icon */}
        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          <FileIcon
            name={node.name}
            extension={node.extension}
            isFolder={node.type === 'directory'}
            isOpen={isExpanded}
            size={16}
          />
        </div>

        {/* Name or rename input */}
        {isCurrentlyRenaming ? (
          <input
            ref={renameInputRef}
            defaultValue={node.name}
            onBlur={handleRenameSubmit}
            onKeyDown={handleKeyDown}
            className="flex-1 h-5 px-1 text-xs bg-background border border-primary rounded outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate flex-1">{node.name}</span>
        )}

        {/* Size */}
        {node.type === 'file' && node.size !== undefined && (
          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {formatSize(node.size)}
          </span>
        )}

        {/* Action buttons */}
        {!isCurrentlyRenaming && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {node.type === 'directory' && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNewFile(node.path, 'file');
                  }}
                  title="New File"
                >
                  <FilePlus className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNewFile(node.path, 'directory');
                  }}
                  title="New Folder"
                >
                  <FolderPlus className="h-3 w-3" />
                </Button>
              </>
            )}
            {node.type === 'file' && (
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(node);
                }}
                title="Download"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node);
              }}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      
      {/* Children */}
      {node.type === 'directory' && isExpanded && (
        <div>
          {sortedChildren.map((child, i) => (
            <FileTreeItem
              key={`${child.path}-${i}`}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              openFilePaths={openFilePaths}
              onSelect={onSelect}
              onExpand={onExpand}
              expandedPaths={expandedPaths}
              onDownload={onDownload}
              onDelete={onDelete}
              onNewFile={onNewFile}
              onRename={onRename}
              selectedIds={selectedIds}
              onSelectedIdsChange={onSelectedIdsChange}
              lastSelectedRef={lastSelectedRef}
              isRenaming={isRenaming}
              onRenameComplete={onRenameComplete}
              contextMenu={contextMenu}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Explorer Panel
function ExplorerPanel({
  fileTree,
  loading,
  selectedPath,
  openFilePaths,
  expandedPaths,
  onFileSelect,
  onExpandToggle,
  onFileDownload,
  onFileDelete,
  onNewFile,
  onRefresh,
  onRename,
  searchQuery,
  onSearchChange,
}: {
  fileTree: FileNode[];
  loading?: boolean;
  selectedPath: string | null;
  openFilePaths: Set<string>;
  expandedPaths: Set<string>;
  onFileSelect: (node: FileNode) => void;
  onExpandToggle: (path: string) => void;
  onFileDownload: (node: FileNode) => void;
  onFileDelete: (node: FileNode) => void;
  onNewFile: (parentPath: string, type: 'file' | 'directory') => void;
  onRefresh: () => void;
  onRename?: (node: FileNode, newName: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}) {
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedRef = useRef<string | null>(null);
  
  // Rename state
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null);

  // Filter file tree based on search
  const filterTree = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query) return nodes;
    
    return nodes.reduce((acc: FileNode[], node) => {
      if (node.name.toLowerCase().includes(query.toLowerCase())) {
        acc.push(node);
      } else if (node.children) {
        const filteredChildren = filterTree(node.children, query);
        if (filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren });
        }
      }
      return acc;
    }, []);
  };

  const filteredTree = useMemo(
    () => searchQuery ? filterTree(fileTree, searchQuery) : fileTree,
    [fileTree, searchQuery]
  );

  // Sort root items
  const sortedTree = useMemo(
    () => [...filteredTree].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    }),
    [filteredTree]
  );

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  // Get context menu items
  const getContextMenuItems = useCallback((node: FileNode): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    if (node.type === 'directory') {
      items.push(
        { label: 'New File', icon: <FilePlus className="h-3.5 w-3.5" />, action: () => onNewFile(node.path, 'file') },
        { label: 'New Folder', icon: <FolderPlus className="h-3.5 w-3.5" />, action: () => onNewFile(node.path, 'directory') },
        { label: '', divider: true, action: () => {} }
      );
    }

    if (node.type === 'file') {
      items.push(
        { label: 'Open', icon: <FolderOpen className="h-3.5 w-3.5" />, action: () => onFileSelect(node) },
        { label: '', divider: true, action: () => {} }
      );
    }

    items.push(
      { label: 'Rename', icon: <FileEdit className="h-3.5 w-3.5" />, shortcut: 'F2', action: () => setIsRenaming(node.path) },
      { label: 'Copy Path', icon: <Copy className="h-3.5 w-3.5" />, action: () => navigator.clipboard.writeText(node.path) },
      { label: '', divider: true, action: () => {} },
      { label: 'Delete', icon: <Trash2 className="h-3.5 w-3.5" />, danger: true, action: () => onFileDelete(node) }
    );

    return items;
  }, [onFileSelect, onFileDelete, onNewFile]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' && selectedIds.size === 1) {
        e.preventDefault();
        const selectedPath = Array.from(selectedIds)[0];
        setIsRenaming(selectedPath);
      }
      if (e.key === 'Delete' && selectedIds.size > 0) {
        e.preventDefault();
        // Find first selected node and delete it
        const path = Array.from(selectedIds)[0];
        const findNode = (nodes: FileNode[], targetPath: string): FileNode | null => {
          for (const node of nodes) {
            if (node.path === targetPath) return node;
            if (node.children) {
              const found = findNode(node.children, targetPath);
              if (found) return found;
            }
          }
          return null;
        };
        const node = findNode(fileTree, path);
        if (node) onFileDelete(node);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, fileTree, onFileDelete]);

  return (
    <div className="flex flex-col h-full">
      {/* Project header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b">
        <div className="flex items-center gap-1">
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Explorer
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => onNewFile('', 'file')}
            title="New File"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => onNewFile('', 'directory')}
            title="New Folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => {
              setSelectedIds(new Set());
              setIsRenaming(null);
            }}
            title="Collapse Selection"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={onRefresh}
            title="Refresh"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
          {searchQuery && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5"
              onClick={() => onSearchChange('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* File tree */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" />
            Loading...
          </div>
        ) : sortedTree.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No files found
          </div>
        ) : (
          <div className="py-1">
            {sortedTree.map((node, i) => (
              <FileTreeItem
                key={`${node.path}-${i}`}
                node={node}
                selectedPath={selectedPath}
                openFilePaths={openFilePaths}
                onSelect={onFileSelect}
                onExpand={onExpandToggle}
                expandedPaths={expandedPaths}
                onDownload={onFileDownload}
                onDelete={onFileDelete}
                onNewFile={onNewFile}
                onRename={onRename}
                selectedIds={selectedIds}
                onSelectedIdsChange={setSelectedIds}
                lastSelectedRef={lastSelectedRef}
                isRenaming={isRenaming}
                onRenameComplete={setIsRenaming}
                contextMenu={contextMenu}
                onContextMenu={handleContextMenu}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.node)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

// Search Panel
function SearchPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [results, setResults] = useState<{file: string; matches: {line: number; text: string}[]}[]>([]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-1.5 border-b">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Search
        </span>
        <Badge variant="secondary" className="text-[10px]">
          {results.reduce((acc, r) => acc + r.matches.length, 0)} results
        </Badge>
      </div>

      <div className="p-2 space-y-2">
        {/* Search input */}
        <div className="relative">
          <Input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pr-24 text-xs"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <Button
              size="icon"
              variant={caseSensitive ? "secondary" : "ghost"}
              className="h-5 w-5"
              onClick={() => setCaseSensitive(!caseSensitive)}
              title="Match Case"
            >
              <CaseSensitive className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant={wholeWord ? "secondary" : "ghost"}
              className="h-5 w-5"
              onClick={() => setWholeWord(!wholeWord)}
              title="Match Whole Word"
            >
              <WholeWord className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant={useRegex ? "secondary" : "ghost"}
              className="h-5 w-5"
              onClick={() => setUseRegex(!useRegex)}
              title="Use Regular Expression"
            >
              <Regex className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Replace input */}
        {showReplace && (
          <div className="relative">
            <Input
              placeholder="Replace"
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              className="h-7 text-xs"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                title="Replace"
              >
                <Replace className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                title="Replace All"
              >
                <Check className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Toggle replace */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-6 text-xs"
          onClick={() => setShowReplace(!showReplace)}
        >
          {showReplace ? 'Hide' : 'Show'} Replace
        </Button>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        {results.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {searchQuery ? 'No results found' : 'Enter a search term'}
          </div>
        ) : (
          <div className="py-1">
            {results.map((result, i) => (
              <Collapsible key={i}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1 hover:bg-accent/50 text-sm">
                  <ChevronRight className="h-3 w-3" />
                  <FileIcon name={result.file} extension={`.${result.file.split('.').pop()}`} size={14} />
                  <span className="truncate">{result.file}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {result.matches.length}
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {result.matches.map((match, j) => (
                    <div
                      key={j}
                      className="flex items-center gap-2 px-6 py-0.5 hover:bg-accent/30 text-xs cursor-pointer"
                    >
                      <span className="text-muted-foreground w-8 text-right">{match.line}</span>
                      <span className="truncate font-mono">{match.text}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export function SideBar({
  activePanel,
  fileTree,
  loading,
  selectedPath,
  expandedPaths,
  openFilePaths,
  onFileSelect,
  onFileDownload,
  onFileDelete,
  onExpandToggle,
  onNewFile,
  onRefresh,
  onRename,
  searchQuery,
  onSearchChange,
}: SideBarProps) {
  return (
    <div className="h-full bg-background flex flex-col">
      {activePanel === 'explorer' && (
        <ExplorerPanel
          fileTree={fileTree}
          loading={loading}
          selectedPath={selectedPath}
          openFilePaths={openFilePaths}
          expandedPaths={expandedPaths}
          onFileSelect={onFileSelect}
          onExpandToggle={onExpandToggle}
          onFileDownload={onFileDownload}
          onFileDelete={onFileDelete}
          onNewFile={onNewFile}
          onRefresh={onRefresh}
          onRename={onRename}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />
      )}
      {activePanel === 'search' && <SearchPanel />}
      {activePanel === 'git' && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Source Control
        </div>
      )}
      {activePanel === 'debug' && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Run and Debug
        </div>
      )}
      {activePanel === 'extensions' && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Extensions
        </div>
      )}
    </div>
  );
}

export default SideBar;
