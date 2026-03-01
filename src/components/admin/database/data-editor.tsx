'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Plus, Trash2, Edit, Search, ChevronLeft, ChevronRight, MoreHorizontal,
  Save, X, Loader2, Check, AlertTriangle, Copy, Download
} from 'lucide-react';

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
}

interface DataEditorProps {
  tableName: string;
  columns: ColumnInfo[];
}

interface CellEdit {
  rowId: string | number;
  column: string;
  value: unknown;
}

export function DataEditor({ tableName, columns }: DataEditorProps) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('');
  
  // Selection
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());
  
  // Editing
  const [editingCell, setEditingCell] = useState<CellEdit | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRow, setNewRow] = useState<Record<string, unknown>>({});
  
  // Bulk operations
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Get primary key column
  const primaryKey = columns.find(c => c.primaryKey)?.name;

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      });
      
      if (searchTerm && searchColumn) {
        params.append('search', searchTerm);
        params.append('searchColumn', searchColumn);
      }

      const response = await fetch(`/api/admin/database/data/${tableName}?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data || []);
        setTotalCount(result.total || result.data?.length || 0);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [tableName, page, pageSize, searchTerm, searchColumn]);

  useEffect(() => {
    if (tableName) {
      fetchData();
    }
  }, [fetchData, tableName]);

  // Get row ID
  const getRowId = (row: Record<string, unknown>): string | number => {
    if (primaryKey && row[primaryKey] !== undefined) {
      return row[primaryKey] as string | number;
    }
    return JSON.stringify(row);
  };

  // Start editing cell
  const startEditing = (rowId: string | number, column: string, value: unknown) => {
    setEditingCell({ rowId, column, value });
    setEditValue(value === null ? '' : String(value));
  };

  // Save cell edit
  const saveEdit = async () => {
    if (!editingCell || !primaryKey) return;
    
    const row = data.find(r => getRowId(r) === editingCell.rowId);
    if (!row) return;

    try {
      const response = await fetch(`/api/admin/database/data/${tableName}/${editingCell.rowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          column: editingCell.column,
          value: editValue === '' ? null : editValue,
          primaryKey,
          primaryKeyValue: row[primaryKey],
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        toast.success('Row updated');
        fetchData();
      } else {
        toast.error(result.error || 'Failed to update');
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setEditingCell(null);
    }
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Delete row
  const deleteRow = async (rowId: string | number) => {
    if (!primaryKey) {
      toast.error('Cannot delete: no primary key');
      return;
    }

    if (!confirm('Are you sure you want to delete this row?')) return;

    try {
      const response = await fetch(`/api/admin/database/data/${tableName}/${rowId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryKey }),
      });
      
      const result = await response.json();
      if (result.success) {
        toast.success('Row deleted');
        fetchData();
      } else {
        toast.error(result.error || 'Failed to delete');
      }
    } catch (err) {
      toast.error(String(err));
    }
  };

  // Bulk delete
  const bulkDelete = async () => {
    if (!primaryKey || selectedRows.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedRows.size} rows?`)) return;

    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedRows);
      const response = await fetch(`/api/admin/database/data/${tableName}/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryKey, ids }),
      });
      
      const result = await response.json();
      if (result.success) {
        toast.success(`${result.deleted} rows deleted`);
        setSelectedRows(new Set());
        fetchData();
      } else {
        toast.error(result.error || 'Failed to delete');
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Add new row
  const handleAddRow = async () => {
    try {
      const response = await fetch(`/api/admin/database/data/${tableName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRow),
      });
      
      const result = await response.json();
      if (result.success) {
        toast.success('Row added');
        setIsAddDialogOpen(false);
        setNewRow({});
        fetchData();
      } else {
        toast.error(result.error || 'Failed to add row');
      }
    } catch (err) {
      toast.error(String(err));
    }
  };

  // Copy row as JSON
  const copyRow = async (row: Record<string, unknown>) => {
    await navigator.clipboard.writeText(JSON.stringify(row, null, 2));
    toast.success('Row copied to clipboard');
  };

  // Toggle row selection
  const toggleRowSelection = (rowId: string | number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    setSelectedRows(newSelected);
  };

  // Select all
  const toggleSelectAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.map(r => getRowId(r))));
    }
  };

  // Export current view
  const handleExport = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableName}_page${page}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b p-2 flex items-center gap-2 bg-card flex-wrap">
        {/* Search */}
        <div className="flex items-center gap-1">
          <select
            className="text-sm border rounded px-2 py-1"
            value={searchColumn}
            onChange={(e) => setSearchColumn(e.target.value)}
          >
            <option value="">All columns</option>
            {columns.map((col) => (
              <option key={col.name} value={col.name}>{col.name}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-2 top-1.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 w-48"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            />
          </div>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        {selectedRows.size > 0 && (
          <Badge variant="secondary" className="mr-2">
            {selectedRows.size} selected
          </Badge>
        )}
        
        {selectedRows.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={bulkDelete}
            disabled={isBulkDeleting}
          >
            {isBulkDeleting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1" />
            )}
            Delete Selected
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Row
        </Button>
        
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-destructive">
            <AlertTriangle className="h-4 w-4 mr-2" /> {error}
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No data found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {primaryKey && (
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === data.length}
                      onChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead key={col.name} className="font-mono whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {col.primaryKey && <Badge variant="outline" className="text-xs">PK</Badge>}
                      {col.name}
                      <span className="text-xs text-muted-foreground">({col.type})</span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const rowId = getRowId(row);
                return (
                  <TableRow
                    key={rowId}
                    className={selectedRows.has(rowId) ? 'bg-primary/10' : ''}
                  >
                    {primaryKey && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(rowId)}
                          onChange={() => toggleRowSelection(rowId)}
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => {
                      const isEditing = editingCell?.rowId === rowId && editingCell?.column === col.name;
                      const value = row[col.name];
                      
                      return (
                        <TableCell
                          key={col.name}
                          className="font-mono text-sm max-w-xs truncate cursor-pointer hover:bg-muted/50"
                          onDoubleClick={() => startEditing(rowId, col.name, value)}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-7 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit();
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                              />
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                                <Check className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ) : value === null ? (
                            <span className="text-muted-foreground italic">NULL</span>
                          ) : (
                            String(value)
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => copyRow(row)}>
                            <Copy className="h-4 w-4 mr-2" /> Copy JSON
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            const rowId = getRowId(row);
                            columns.forEach((col) => {
                              if (col.name !== primaryKey) {
                                startEditing(rowId, col.name, row[col.name]);
                              }
                            });
                          }}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteRow(rowId)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ScrollArea>

      {/* Pagination */}
      <div className="border-t p-2 flex items-center justify-between bg-muted/30">
        <div className="text-sm text-muted-foreground">
          {totalCount.toLocaleString()} rows total
        </div>
        <div className="flex items-center gap-2">
          <select
            className="text-sm border rounded px-2 py-1"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
            <option value="500">500 / page</option>
          </select>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">
              {page} / {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Add Row Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Row to {tableName}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {columns.map((col) => {
              if (col.primaryKey && col.type.includes('INTEGER')) {
                return null; // Skip auto-increment primary keys
              }
              return (
                <div key={col.name} className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-mono">
                    {col.name}
                    {col.nullable && <span className="text-muted-foreground ml-1">(nullable)</span>}
                  </Label>
                  <Input
                    className="col-span-3"
                    placeholder={col.type}
                    value={String(newRow[col.name] || '')}
                    onChange={(e) => setNewRow({
                      ...newRow,
                      [col.name]: e.target.value === '' ? null : e.target.value,
                    })}
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRow}>
              <Save className="h-4 w-4 mr-1" /> Add Row
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DataEditor;
