'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Archive, Loader2, GripVertical, Settings, Upload, X, FileIcon, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

// Import our new editor components
import { ActivityBar } from '@/components/editor/activity-bar';
import { SideBar, FileNode } from '@/components/editor/side-bar';
import { EditorGroup, EditorFile, EditorResizeHandle } from '@/components/editor/editor-group';
import { StatusBar } from '@/components/editor/status-bar';
import { getLanguageFromPath } from '@/components/editor/monaco-editor';

// Types
interface FileContent {
  type: 'file';
  content: string;
  extension: string;
  size: number;
  lastModified: string;
}

// Resize handle component
function ResizeHandle() {
  return (
    <PanelResizeHandle className="w-1 flex items-center justify-center bg-transparent hover:bg-primary/20 transition-colors group">
      <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </PanelResizeHandle>
  );
}

export function FilesSection() {
  // State
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [openFiles, setOpenFiles] = useState<EditorFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['src', 'src/app', 'src/components']));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileParent, setNewFileParent] = useState('');
  const [newFileType, setNewFileType] = useState<'file' | 'directory'>('file');
  const [newFileName, setNewFileName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<FileNode | null>(null);
  const [version, setVersion] = useState<string>('1.0.0');
  
  // Upload state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadPath, setUploadPath] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI State
  const [activePanel, setActivePanel] = useState<'explorer' | 'search' | 'git' | 'debug' | 'extensions'>('explorer');
  const [isSplit, setIsSplit] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  const activeFile = openFiles.find(f => f.id === activeFileId) || null;

  // Load version
  useEffect(() => {
    fetch('/api/version')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setVersion(data.version);
        }
      })
      .catch(() => {
        // Use default version
      });
  }, []);

  // Load file tree
  const loadFileTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/files?action=tree');
      const data = await res.json();
      if (data.success) {
        setFileTree(data.data);
      }
    } catch (e) {
      console.error('Failed to load file tree:', e);
      toast.error('Failed to load file tree');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeFile?.isModified) {
          saveFile();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (activeFile) {
          closeFile(activeFile.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile]);

  // Load file content
  const loadFile = async (node: FileNode) => {
    if (node.type === 'directory') return;
    
    // Check if file is already open
    const existingFile = openFiles.find(f => f.path === node.path);
    if (existingFile) {
      setActiveFileId(existingFile.id);
      return;
    }
    
    try {
      const res = await fetch(`/api/files?action=read&path=${encodeURIComponent(node.path)}`);
      const data = await res.json();
      
      if (data.success) {
        const fileId = `file-${Date.now()}`;
        const newOpenFile: EditorFile = {
          id: fileId,
          name: node.name,
          path: node.path,
          extension: node.extension,
          content: data.data.content,
          originalContent: data.data.content,
          isModified: false,
          language: getLanguageFromPath(node.path),
          size: data.data.size,
          lastModified: data.data.lastModified,
        };
        setOpenFiles(prev => [...prev, newOpenFile]);
        setActiveFileId(fileId);
      } else {
        toast.error(data.error);
      }
    } catch (e) {
      console.error('Failed to load file:', e);
      toast.error('Failed to load file');
    }
  };

  // Save file
  const saveFile = async () => {
    if (!activeFile) return;
    
    setSaving(true);
    
    try {
      const res = await fetch('/api/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: activeFile.path,
          content: activeFile.content,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setOpenFiles(prev => prev.map(f => 
          f.id === activeFile.id 
            ? { ...f, originalContent: f.content, isModified: false }
            : f
        ));
        toast.success('File saved successfully!');
      } else {
        toast.error(data.error);
      }
    } catch (e) {
      console.error('Failed to save file:', e);
      toast.error('Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  // Close file
  const closeFile = (fileId: string) => {
    const file = openFiles.find(f => f.id === fileId);
    
    if (file?.isModified) {
      if (!confirm('This file has unsaved changes. Close anyway?')) {
        return;
      }
    }
    
    setOpenFiles(prev => prev.filter(f => f.id !== fileId));
    
    if (activeFileId === fileId) {
      const remainingFiles = openFiles.filter(f => f.id !== fileId);
      setActiveFileId(remainingFiles.length > 0 ? remainingFiles[remainingFiles.length - 1].id : null);
    }
  };

  // Handle content change
  const handleContentChange = (fileId: string, content: string) => {
    setOpenFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, content, isModified: content !== f.originalContent }
        : f
    ));
  };

  // Save file by ID
  const saveFileById = async (fileId: string) => {
    const file = openFiles.find(f => f.id === fileId);
    if (!file) return;
    
    setSaving(true);
    
    try {
      const res = await fetch('/api/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: file.path,
          content: file.content,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setOpenFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, originalContent: f.content, isModified: false }
            : f
        ));
        toast.success('File saved successfully!');
      } else {
        toast.error(data.error);
      }
    } catch (e) {
      console.error('Failed to save file:', e);
      toast.error('Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  // Download file by ID
  const downloadFileById = async (fileId: string) => {
    const file = openFiles.find(f => f.id === fileId);
    if (!file) return;
    
    try {
      const res = await fetch(`/api/download?file=${encodeURIComponent(file.path)}`);
      
      if (!res.ok) throw new Error('Download failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Downloaded ${file.name}`);
    } catch (e) {
      console.error('Failed to download file:', e);
      toast.error('Failed to download file');
    }
  };

  // Download single file
  const downloadFile = async (node: FileNode) => {
    if (node.type === 'directory') return;
    
    try {
      const res = await fetch(`/api/download?file=${encodeURIComponent(node.path)}`);
      
      if (!res.ok) throw new Error('Download failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = node.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Downloaded ${node.name}`);
    } catch (e) {
      console.error('Failed to download file:', e);
      toast.error('Failed to download file');
    }
  };

  // Download entire project
  const downloadProject = async () => {
    setDownloadingAll(true);
    
    try {
      const res = await fetch('/api/download?all=true');
      
      if (!res.ok) throw new Error('Download failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = 'project.tar.gz';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Project downloaded successfully!');
    } catch (e) {
      console.error('Failed to download project:', e);
      toast.error('Failed to download project');
    } finally {
      setDownloadingAll(false);
    }
  };

  // Create new file/folder
  const createNew = async () => {
    if (!newFileName) {
      toast.error('Please enter a name');
      return;
    }
    
    const newPath = newFileParent ? `${newFileParent}/${newFileName}` : newFileName;
    
    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: newPath,
          type: newFileType,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        loadFileTree();
        setShowNewFileDialog(false);
        setNewFileName('');
        toast.success(`${newFileType === 'file' ? 'File' : 'Folder'} created successfully!`);
      } else {
        toast.error(data.error);
      }
    } catch (e) {
      console.error('Failed to create:', e);
      toast.error('Failed to create');
    }
  };

  // Rename file/folder
  const handleRename = async (node: FileNode, newName: string) => {
    if (!newName || newName === node.name) return;
    
    const oldPath = node.path;
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;
    
    try {
      const res = await fetch('/api/files', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPath,
          newPath,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        loadFileTree();
        
        // Update open files if this file was open
        setOpenFiles(prev => prev.map(f => 
          f.path === oldPath 
            ? { ...f, name: newName, path: newPath }
            : f
        ));
        
        toast.success('Renamed successfully!');
      } else {
        toast.error(data.error || 'Failed to rename');
      }
    } catch (e) {
      console.error('Failed to rename:', e);
      toast.error('Failed to rename');
    }
  };

  // Open upload dialog
  const openUploadDialog = (targetPath: string) => {
    setUploadPath(targetPath);
    setUploadFiles([]);
    setUploadProgress({});
    setShowUploadDialog(true);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadFiles(prev => [...prev, ...files]);
    setUploadProgress({});
    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  // Remove file from upload list
  const removeUploadFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload files
  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploading(true);
    setUploadProgress({});

    let successCount = 0;
    let failCount = 0;

    for (const file of uploadFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', uploadPath || '/');

        const res = await fetch('/api/files', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (data.success) {
          successCount++;
          setUploadProgress(prev => ({ ...prev, [file.name]: true }));
        } else {
          failCount++;
          setUploadProgress(prev => ({ ...prev, [file.name]: false }));
          console.error(`Failed to upload ${file.name}:`, data.error);
        }
      } catch (e) {
        failCount++;
        setUploadProgress(prev => ({ ...prev, [file.name]: false }));
        console.error(`Failed to upload ${file.name}:`, e);
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(`Uploaded ${successCount} file(s) successfully`);
      loadFileTree();
    }
    
    if (failCount > 0) {
      toast.error(`Failed to upload ${failCount} file(s)`);
    }

    if (successCount === uploadFiles.length) {
      setShowUploadDialog(false);
      setUploadFiles([]);
    }
  };

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setUploadFiles(prev => [...prev, ...files]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Delete file
  const deleteFile = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(deleteTarget.path)}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        loadFileTree();

        // Close if open
        const openFile = openFiles.find(f => f.path === deleteTarget.path);
        if (openFile) {
          closeFile(openFile.id);
        }

        toast.success('Deleted successfully!');
        setDeleteDialogOpen(false);
      } else {
        toast.error(data.error);
      }
    } catch (e) {
      console.error('Failed to delete:', e);
      toast.error('Failed to delete');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Toggle expand
  const toggleExpand = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Open new file dialog
  const openNewFileDialog = (parentPath: string, type: 'file' | 'directory') => {
    setNewFileParent(parentPath);
    setNewFileType(type);
    setNewFileName('');
    setShowNewFileDialog(true);
  };

  // Get open file paths
  const openFilePaths = useMemo(
    () => new Set(openFiles.map(f => f.path)),
    [openFiles]
  );

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file extension
  const getFileExtension = (filename: string): string => {
    return filename.substring(filename.lastIndexOf('.')) || '';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Action buttons - Fixed position to stay visible */}
      <div className="absolute top-2 right-2 z-50 flex gap-2">
        <Button 
          onClick={() => openUploadDialog('public/uploads')} 
          className="gap-2 shadow-lg"
          size="sm"
          variant="default"
        >
          <Upload className="h-4 w-4" />
          Upload
        </Button>
        <Button 
          onClick={downloadProject} 
          disabled={downloadingAll}
          className="gap-2 shadow-lg"
          size="sm"
          variant="outline"
        >
          {downloadingAll ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
          {downloadingAll ? 'Preparing...' : `Download v${version}`}
        </Button>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar
          activeItem={activePanel}
          onItemClick={(id) => setActivePanel(id as typeof activePanel)}
          onSettingsClick={() => toast.info('Settings coming soon!')}
        />

        {/* Main Panel Group */}
        <PanelGroup direction="horizontal" className="flex-1">
          {/* Side Bar */}
          <Panel defaultSize={20} minSize={15} maxSize={40}>
            <SideBar
              activePanel={activePanel}
              fileTree={fileTree}
              loading={loading}
              selectedPath={activeFile?.path || null}
              expandedPaths={expandedPaths}
              openFilePaths={openFilePaths}
              onFileSelect={loadFile}
              onFileDownload={downloadFile}
              onFileDelete={setDeleteTarget}
              onExpandToggle={toggleExpand}
              onNewFile={openNewFileDialog}
              onRefresh={loadFileTree}
              onRename={handleRename}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </Panel>

          <ResizeHandle />

          {/* Editor Area */}
          <Panel defaultSize={80} minSize={30}>
            <div className="h-full flex flex-col">
              {/* Editor Group */}
              <div className="flex-1 overflow-hidden">
                {isSplit ? (
                  <PanelGroup direction="horizontal">
                    <Panel defaultSize={50}>
                      <EditorGroup
                        files={openFiles}
                        activeFileId={activeFileId}
                        onFileSelect={setActiveFileId}
                        onFileClose={closeFile}
                        onFileContentChange={handleContentChange}
                        onFileSave={saveFileById}
                        onFileDownload={downloadFileById}
                        saving={saving}
                        isSplit={isSplit}
                        onCloseGroup={() => setIsSplit(false)}
                      />
                    </Panel>
                    <EditorResizeHandle />
                    <Panel defaultSize={50}>
                      <EditorGroup
                        files={openFiles}
                        activeFileId={activeFileId}
                        onFileSelect={setActiveFileId}
                        onFileClose={closeFile}
                        onFileContentChange={handleContentChange}
                        onFileSave={saveFileById}
                        onFileDownload={downloadFileById}
                        saving={saving}
                        isSplit={isSplit}
                        onCloseGroup={() => setIsSplit(false)}
                      />
                    </Panel>
                  </PanelGroup>
                ) : (
                  <EditorGroup
                    files={openFiles}
                    activeFileId={activeFileId}
                    onFileSelect={setActiveFileId}
                    onFileClose={closeFile}
                    onFileContentChange={handleContentChange}
                    onFileSave={saveFileById}
                    onFileDownload={downloadFileById}
                    saving={saving}
                    onSplitEditor={() => setIsSplit(true)}
                  />
                )}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Status Bar */}
      <StatusBar
        branch="main"
        line={cursorPosition.line}
        column={cursorPosition.column}
        language={activeFile?.language || 'Plain Text'}
        fileSize={activeFile?.size ? formatSize(activeFile.size) : undefined}
        lastModified={activeFile?.lastModified}
        isConnected={true}
        isReadOnly={false}
      />

      {/* New File Dialog */}
      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New {newFileType === 'file' ? 'File' : 'Folder'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {newFileParent && (
              <div className="text-sm text-muted-foreground">
                Location: <code className="bg-muted px-1 rounded">{newFileParent}/</code>
              </div>
            )}
            <Input
              placeholder={newFileType === 'file' ? 'filename.ts' : 'folder-name'}
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && createNew()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFileDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createNew}>
              Create {newFileType === 'file' ? 'File' : 'Folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              Delete {deleteTarget?.type === 'directory' ? 'Folder' : 'File'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
              {deleteTarget?.type === 'directory' && (
                <span className="block mt-2 text-destructive">
                  This will delete all files inside this folder.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={deleteFile}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Files
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Upload path */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload to folder:</label>
              <Input
                value={uploadPath}
                onChange={(e) => setUploadPath(e.target.value)}
                placeholder="public/uploads"
              />
              <p className="text-xs text-muted-foreground">
                Files will be uploaded to this folder. Folder will be created if it doesn&apos;t exist.
              </p>
            </div>

            {/* Drop zone */}
            <div
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${uploadFiles.length > 0 ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              `}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                Click to select files or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                Max file size: 10MB per file
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Selected files list */}
            {uploadFiles.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Selected files ({uploadFiles.length}):</label>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {uploadFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          ({formatSize(file.size)})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {uploadProgress[file.name] === true && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {uploadProgress[file.name] === false && (
                          <span className="text-xs text-destructive">Failed</span>
                        )}
                        {!uploading && uploadProgress[file.name] === undefined && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeUploadFile(index);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || uploadFiles.length === 0}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {uploadFiles.length > 0 ? `(${uploadFiles.length})` : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FilesSection;
