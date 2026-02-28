'use client';

import { useState, useCallback, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { GripVertical, X, Plus, Split, Maximize2, Minimize2, Save, Download, Undo2, Redo2, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EditorTabs, EditorTab } from './editor-tabs';
import { MonacoEditor } from './monaco-editor';
import { Breadcrumbs, BreadcrumbItem } from './breadcrumbs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface EditorFile {
  id: string;
  name: string;
  path: string;
  extension?: string;
  content: string;
  originalContent: string;
  isModified: boolean;
  language?: string;
  size?: number;
  lastModified?: string;
}

interface EditorGroupProps {
  files: EditorFile[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileClose: (fileId: string) => void;
  onFileContentChange: (fileId: string, content: string) => void;
  onFileSave?: (fileId: string) => void;
  onFileDownload?: (fileId: string) => void;
  saving?: boolean;
  onSplitEditor?: () => void;
  isSplit?: boolean;
  onCloseGroup?: () => void;
}

export function EditorGroup({
  files,
  activeFileId,
  onFileSelect,
  onFileClose,
  onFileContentChange,
  onFileSave,
  onFileDownload,
  saving = false,
  onSplitEditor,
  isSplit = false,
  onCloseGroup,
}: EditorGroupProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeFile = files.find(f => f.id === activeFileId) || null;

  // Convert files to tabs format
  const tabs: EditorTab[] = files.map(f => ({
    id: f.id,
    name: f.name,
    path: f.path,
    extension: f.extension,
    isModified: f.isModified,
    isActive: f.id === activeFileId,
  }));

  // Convert file path to breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = activeFile
    ? activeFile.path.split('/').map((part, index, array) => ({
        name: part,
        path: array.slice(0, index + 1).join('/'),
        type: index === array.length - 1 ? 'file' : 'folder' as const,
      }))
    : [];

  const handleEditorChange = useCallback((value: string) => {
    if (activeFileId) {
      onFileContentChange(activeFileId, value);
    }
  }, [activeFileId, onFileContentChange]);

  // Handle drop for tab reordering
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col h-full bg-background border-l first:border-l-0",
        isMaximized && "fixed inset-0 z-50"
      )}
    >
      {/* Tab bar with actions */}
      <div className="flex items-center justify-between bg-muted/30 border-b">
        <EditorTabs
          tabs={tabs}
          onTabClick={onFileSelect}
          onTabClose={onFileClose}
        />
        
        {/* Editor group actions */}
        <div className="flex items-center gap-0.5 px-1">
          {/* Save button */}
          {activeFile && (
            <Button
              variant={activeFile.isModified ? "default" : "ghost"}
              size="sm"
              className="h-7 gap-1"
              onClick={() => onFileSave?.(activeFile.id)}
              disabled={saving || !activeFile.isModified}
              title="Save (Ctrl+S)"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Save</span>
            </Button>
          )}
          
          {/* Download button */}
          {activeFile && onFileDownload && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onFileDownload(activeFile.id)}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                New File
              </DropdownMenuItem>
              <DropdownMenuItem>
                New Window
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                Open File...
              </DropdownMenuItem>
              <DropdownMenuItem>
                Open Folder...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {onSplitEditor && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onSplitEditor}
              title="Split Editor"
            >
              <Split className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          
          {isSplit && onCloseGroup && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onCloseGroup}
              title="Close Group"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Breadcrumbs */}
      {activeFile && <Breadcrumbs items={breadcrumbs} />}

      {/* Editor content */}
      <div className="flex-1 overflow-hidden">
        {activeFile ? (
          <MonacoEditor
            value={activeFile.content}
            onChange={handleEditorChange}
            language={activeFile.language}
            filePath={activeFile.path}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-background">
            <div className="text-center text-muted-foreground max-w-md">
              <div className="mb-4 text-6xl opacity-20">{'</>'}</div>
              <h3 className="text-lg font-medium mb-2">No file open</h3>
              <p className="text-sm">
                Select a file from the explorer to view or edit its contents.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded">Ctrl</kbd>
                  <span className="mx-1">+</span>
                  <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded">P</kbd>
                  <p className="mt-1 text-muted-foreground">Quick Open</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded">Ctrl</kbd>
                  <span className="mx-1">+</span>
                  <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded">S</kbd>
                  <p className="mt-1 text-muted-foreground">Save File</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Resize handle for split editors
export function EditorResizeHandle() {
  return (
    <PanelResizeHandle className="w-1 flex items-center justify-center bg-transparent hover:bg-primary/20 transition-colors group">
      <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </PanelResizeHandle>
  );
}

export default EditorGroup;
