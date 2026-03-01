'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Database, Table2, Code, Upload, Download, Save, Clock, BarChart3, FileJson,
  Play, Plus, Search, Trash2, Check, AlertTriangle,
  RefreshCw, X, Loader2, ChevronLeft, ChevronRight, Shield,
  Network, Activity, Key
} from 'lucide-react';
import { useDatabaseStore } from '@/stores/database-store';
import { SchemaVisualizer } from './schema-visualizer';
import { DataEditor } from './data-editor';
import { PerformanceMonitor } from './performance-monitor';
import {
  getPermissions, getRoleDisplayName, getPermissionDisplayName,
  PERMISSION_CATEGORIES, CATEGORY_NAMES, type UserRole, type DatabasePermission
} from '@/lib/db-permissions';

// ==================== Main Database Manager Component ====================
export function DatabaseManager() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const { actions, tables, connectionStatus, isLoadingTables, metrics } = useDatabaseStore();

  useEffect(() => {
    actions.checkConnection();
    actions.fetchTables();
    actions.fetchMetrics();
  }, [actions]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Database Management</h1>
              <p className="text-sm text-muted-foreground">Enterprise-grade database administration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Role Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-1" />
                  {getRoleDisplayName(userRole)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setUserRole('viewer')}>
                  {getRoleDisplayName('viewer')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setUserRole('editor')}>
                  {getRoleDisplayName('editor')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setUserRole('admin')}>
                  {getRoleDisplayName('admin')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'} className="gap-1">
              {connectionStatus === 'connected' ? <><Check className="h-3 w-3" /> Connected</> : <><X className="h-3 w-3" /> Disconnected</>}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => { actions.checkConnection(); actions.fetchTables(); actions.fetchMetrics(); }}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b px-6 overflow-x-auto">
          <TabsList className="h-12">
            <TabsTrigger value="dashboard" className="gap-2"><BarChart3 className="h-4 w-4" /> Dashboard</TabsTrigger>
            <TabsTrigger value="tables" className="gap-2"><Table2 className="h-4 w-4" /> Tables</TabsTrigger>
            <TabsTrigger value="query" className="gap-2"><Code className="h-4 w-4" /> Query Editor</TabsTrigger>
            <TabsTrigger value="schema" className="gap-2"><Network className="h-4 w-4" /> Schema</TabsTrigger>
            <TabsTrigger value="import-export" className="gap-2"><Download className="h-4 w-4" /> Import/Export</TabsTrigger>
            <TabsTrigger value="backup" className="gap-2"><Save className="h-4 w-4" /> Backup</TabsTrigger>
            <TabsTrigger value="monitor" className="gap-2"><Activity className="h-4 w-4" /> Monitor</TabsTrigger>
            <TabsTrigger value="audit" className="gap-2"><Clock className="h-4 w-4" /> Audit Logs</TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2"><Key className="h-4 w-4" /> Permissions</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value="dashboard" className="h-full m-0 overflow-auto"><DashboardTab metrics={metrics} tables={tables} setActiveTab={setActiveTab} /></TabsContent>
          <TabsContent value="tables" className="h-full m-0"><TablesTab tables={tables} isLoading={isLoadingTables} userRole={userRole} /></TabsContent>
          <TabsContent value="query" className="h-full m-0"><QueryEditorTab /></TabsContent>
          <TabsContent value="schema" className="h-full w-full m-0" style={{ minHeight: '600px' }}><SchemaVisualizer tables={tables} /></TabsContent>
          <TabsContent value="import-export" className="h-full m-0 overflow-auto"><ImportExportTab tables={tables} /></TabsContent>
          <TabsContent value="backup" className="h-full m-0 overflow-auto"><BackupTab /></TabsContent>
          <TabsContent value="monitor" className="h-full m-0"><PerformanceMonitor /></TabsContent>
          <TabsContent value="audit" className="h-full m-0"><AuditLogsTab /></TabsContent>
          <TabsContent value="permissions" className="h-full m-0 overflow-auto"><PermissionsTab userRole={userRole} setUserRole={setUserRole} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ==================== Dashboard Tab ====================
function DashboardTab({ metrics, tables, setActiveTab }: { metrics: any; tables: any[]; setActiveTab: (tab: string) => void }) {
  const [tablePage, setTablePage] = useState(1);
  const tablesPerPage = 10;
  const totalPages = Math.ceil(tables.length / tablesPerPage);
  const paginatedTables = tables.slice((tablePage - 1) * tablesPerPage, tablePage * tablesPerPage);

  return (
    <ScrollArea className="h-full p-6">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
              <Table2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalTables || tables.length}</div>
              <p className="text-xs text-muted-foreground">{tables.filter(t => t.type === 'table').length} tables, {tables.filter(t => t.type === 'view').length} views</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rows</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(metrics.totalRows || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Across all tables</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database Size</CardTitle>
              <FileJson className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalSize ? (metrics.totalSize / 1024 / 1024).toFixed(2) : '0'} MB</div>
              <p className="text-xs text-muted-foreground">Storage used</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Query Count</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.queryCount || 0}</div>
              <p className="text-xs text-muted-foreground">Avg: {metrics.avgQueryTime?.toFixed(2) || 0}ms</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tables Overview</CardTitle>
              <Badge variant="outline">{tables.length} total</Badge>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead>Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTables.map((table) => (
                    <TableRow key={table.name}>
                      <TableCell className="font-mono">{table.name}</TableCell>
                      <TableCell><Badge variant={table.type === 'table' ? 'default' : 'secondary'}>{table.type}</Badge></TableCell>
                      <TableCell>{table.rowCount?.toLocaleString()}</TableCell>
                      <TableCell>{table.sizeBytes ? (table.sizeBytes / 1024).toFixed(2) : 0} KB</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    Page {tablePage} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTablePage(p => Math.max(1, p - 1))}
                      disabled={tablePage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
                      disabled={tablePage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('query')}>
                <Code className="h-4 w-4 mr-2" /> New Query
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('import-export')}>
                <Upload className="h-4 w-4 mr-2" /> Import Data
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('import-export')}>
                <Download className="h-4 w-4 mr-2" /> Export Data
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('backup')}>
                <Save className="h-4 w-4 mr-2" /> Create Backup
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}

// ==================== Tables Tab ====================
function TablesTab({ tables, isLoading, userRole }: { tables: any[]; isLoading: boolean; userRole: UserRole }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [tableData, setTableData] = useState<any>({ data: [], columns: [], loading: false });
  const [viewMode, setViewMode] = useState<'browse' | 'edit'>('browse');

  const filteredTables = tables.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const permissions = getPermissions(userRole);

  useEffect(() => {
    const loadTableData = async () => {
      if (!selectedTable) return;
      setTableData(prev => ({ ...prev, loading: true }));
      try {
        const response = await fetch(`/api/admin/database/data/${selectedTable.name}?limit=50`);
        const result = await response.json();
        if (result.success) {
          const columns = result.fields || result.columns || [];
          setTableData({ data: result.data || [], columns, loading: false });
        } else {
          setTableData({ data: [], columns: [], loading: false });
        }
      } catch {
        toast.error('Failed to fetch table data');
        setTableData({ data: [], columns: [], loading: false });
      }
    };
    loadTableData();
  }, [selectedTable]);

  return (
    <div className="h-full flex">
      <div className="w-80 border-r flex flex-col shrink-0">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tables..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="p-2">
              {filteredTables.map((table) => (
                <button 
                  key={table.name} 
                  className={`w-full text-left p-3 rounded-lg hover:bg-accent transition-colors ${selectedTable?.name === table.name ? 'bg-accent' : ''}`} 
                  onClick={() => setSelectedTable(table)}
                >
                  <div className="flex items-center gap-2"><Table2 className="h-4 w-4 text-muted-foreground" /><span className="font-mono text-sm">{table.name}</span></div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground"><span>{table.rowCount?.toLocaleString()} rows</span><span>•</span><span>{table.columns?.length || 0} cols</span></div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        {selectedTable ? (
          <>
            <div className="border-b p-4 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-semibold font-mono">{selectedTable.name}</h2>
                <p className="text-sm text-muted-foreground">{selectedTable.rowCount?.toLocaleString()} rows • {selectedTable.columns?.length || 0} columns</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant={viewMode === 'browse' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('browse')}>
                  Browse
                </Button>
                {permissions.canUpdateData && (
                  <Button variant={viewMode === 'edit' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('edit')}>
                    Edit
                  </Button>
                )}
              </div>
            </div>
            {viewMode === 'edit' && permissions.canUpdateData ? (
              <DataEditor tableName={selectedTable.name} columns={tableData.columns || []} />
            ) : (
              <ScrollArea className="flex-1">
                {tableData.loading ? (
                  <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : tableData.data.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center"><Table2 className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No data found</p></div>
                  </div>
                ) : (
                  <div className="p-4">
                    <Table>
                      <TableHeader><TableRow>{(tableData.columns || []).map((col: any) => (<TableHead key={col.name} className="font-mono whitespace-nowrap">{col.name}</TableHead>))}</TableRow></TableHeader>
                      <TableBody>
                        {(tableData.data || []).map((row: any, i: number) => (
                          <TableRow key={i}>{(tableData.columns || []).map((col: any) => (<TableCell key={col.name} className="font-mono text-sm max-w-xs truncate">{String(row[col.name] ?? 'NULL')}</TableCell>))}</TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </ScrollArea>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground"><div className="text-center"><Table2 className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Select a table to view its data</p></div></div>
        )}
      </div>
    </div>
  );
}

// ==================== Query Editor Tab ====================
function QueryEditorTab() {
  const [query, setQuery] = useState('SELECT * FROM Surah LIMIT 10;');
  const [result, setResult] = useState<any>(null);
  const [executing, setExecuting] = useState(false);
  const [queryHistory, setQueryHistory] = useState<{query: string; time: Date}[]>([]);

  const executeQuery = async () => {
    if (!query.trim()) {
      toast.error('Please enter a query');
      return;
    }
    setExecuting(true);
    try {
      const response = await fetch('/api/admin/db/query', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ query }) 
      });
      const data = await response.json();
      setResult(data);
      setQueryHistory(prev => [{query, time: new Date()}, ...prev.slice(0, 19)]);
      
      // Log to audit
      await fetch('/api/admin/db/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'QUERY',
          resourceType: 'database',
          resourceName: 'query',
          query,
          status: data.success ? 'success' : 'failed',
        }),
      });
    } catch { 
      toast.error('Query execution failed'); 
    }
    finally { setExecuting(false); }
  };

  const loadFromHistory = (q: string) => {
    setQuery(q);
  };

  const formatQuery = () => {
    let formatted = query
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/SELECT/gi, 'SELECT\n  ')
      .replace(/FROM/gi, '\nFROM')
      .replace(/WHERE/gi, '\nWHERE')
      .replace(/ORDER BY/gi, '\nORDER BY')
      .replace(/GROUP BY/gi, '\nGROUP BY')
      .replace(/JOIN/gi, '\nJOIN');
    setQuery(formatted);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Query Input */}
      <div className="border-b p-4 shrink-0">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter SQL query..."
          className="w-full min-h-[150px] p-3 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="mt-4 flex gap-2">
          <Button onClick={executeQuery} disabled={executing}>
            {executing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Execute
          </Button>
          <Button variant="outline" onClick={formatQuery}>
            Format
          </Button>
          <Button variant="outline" onClick={() => {setQuery(''); setResult(null);}}>
            Clear
          </Button>
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        {result ? (
          <div className="p-4">
            {result.success ? (
              <>
                <div className="text-sm text-muted-foreground mb-4 flex items-center gap-4">
                  <Badge>{result.rowCount} rows</Badge>
                  <Badge variant="outline">{result.executionTime?.toFixed(2)}ms</Badge>
                  {result.warning && <Badge variant="secondary">Warning: {result.warning}</Badge>}
                </div>
                {result.data && result.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          {result.columns?.map((col: any) => (
                            <TableHead key={col.name} className="font-mono whitespace-nowrap">{col.name}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.data.slice(0, 500).map((row: any, i: number) => (
                          <TableRow key={i}>
                            {result.columns?.map((col: any) => (
                              <TableCell key={col.name} className="font-mono text-sm max-w-xs truncate">
                                {row[col.name] === null ? <span className="text-muted-foreground italic">NULL</span> : String(row[col.name])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">No results</div>
                )}
              </>
            ) : (
              <div className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {result.error}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Execute a query to see results</p>
              <p className="text-xs mt-1">Press Ctrl+Enter to execute</p>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Query History */}
      {queryHistory.length > 0 && (
        <div className="border-t p-2 bg-muted/30 shrink-0">
          <div className="text-xs text-muted-foreground mb-2">Recent Queries:</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {queryHistory.slice(0, 5).map((h, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-xs font-mono shrink-0"
                onClick={() => loadFromHistory(h.query)}
              >
                {h.query.substring(0, 30)}...
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== Import/Export Tab ====================
function ImportExportTab({ tables }: { tables: any[] }) {
  const [importTable, setImportTable] = useState('');
  const [importData, setImportData] = useState('');
  const [exportTable, setExportTable] = useState('');
  const [exportFormat, setExportFormat] = useState('json');
  const [processing, setProcessing] = useState(false);

  const handleImport = async () => {
    if (!importTable || !importData) { toast.error('Please select a table and provide data'); return; }
    setProcessing(true);
    try {
      const response = await fetch('/api/admin/database/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: importTable, data: importData, format: 'json' }) });
      const result = await response.json();
      if (result.success) { toast.success(`Imported ${result.imported} rows`); setImportData(''); }
      else { toast.error(result.error || 'Import failed'); }
    } catch { toast.error('Import failed'); }
    finally { setProcessing(false); }
  };

  const handleExport = async () => {
    if (!exportTable) { toast.error('Please select a table to export'); return; }
    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/database/data/${exportTable}?limit=10000`);
      const result = await response.json();
      if (result.success) {
        let content: string;
        let filename: string;
        let mimeType: string;

        if (exportFormat === 'json') {
          content = JSON.stringify(result.data, null, 2);
          filename = `${exportTable}.json`;
          mimeType = 'application/json';
        } else if (exportFormat === 'csv') {
          const headers = result.fields?.map((f: any) => f.name).join(',') || '';
          const rows = result.data.map((row: any) =>
            Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
          ).join('\n');
          content = headers + '\n' + rows;
          filename = `${exportTable}.csv`;
          mimeType = 'text/csv';
        } else {
          const inserts = result.data.map((row: any) => {
            const cols = Object.keys(row).join(', ');
            const vals = Object.values(row).map(v =>
              v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`
            ).join(', ');
            return `INSERT INTO ${exportTable} (${cols}) VALUES (${vals});`;
          }).join('\n');
          content = inserts;
          filename = `${exportTable}.sql`;
          mimeType = 'text/plain';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${result.data.length} rows`);
      } else {
        toast.error(result.error || 'Export failed');
      }
    } catch { toast.error('Export failed'); }
    finally { setProcessing(false); }
  };

  return (
    <ScrollArea className="h-full p-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Import Data</CardTitle><CardDescription>Import data from JSON</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Target Table</Label><select className="w-full mt-1 p-2 border rounded" value={importTable} onChange={(e) => setImportTable(e.target.value)}><option value="">Select table...</option>{tables.map((t) => (<option key={t.name} value={t.name}>{t.name}</option>))}</select></div>
            <div><Label>Data (JSON Array)</Label><textarea className="w-full mt-1 p-2 border rounded font-mono min-h-[200px]" value={importData} onChange={(e) => setImportData(e.target.value)} placeholder='[{"column": "value", ...}]' /></div>
            <Button onClick={handleImport} disabled={processing} className="w-full">{processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}Import</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" />Export Data</CardTitle><CardDescription>Export table data</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Table</Label><select className="w-full mt-1 p-2 border rounded" value={exportTable} onChange={(e) => setExportTable(e.target.value)}><option value="">Select table...</option>{tables.map((t) => (<option key={t.name} value={t.name}>{t.name}</option>))}</select></div>
            <div><Label>Format</Label><div className="flex gap-2 mt-2">{['json', 'csv', 'sql'].map((fmt) => (<Button key={fmt} variant={exportFormat === fmt ? 'default' : 'outline'} size="sm" onClick={() => setExportFormat(fmt)}>{fmt.toUpperCase()}</Button>))}</div></div>
            <Button onClick={handleExport} disabled={processing} className="w-full">{processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}Export</Button>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

// ==================== Backup Tab ====================
function BackupTab() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [backupName, setBackupName] = useState('');

  useEffect(() => {
    fetch('/api/admin/db/backup').then(r => r.json()).then(d => d.success && setBackups(d.backups)).finally(() => setLoading(false));
  }, []);

  const createBackup = async () => {
    if (!backupName) { toast.error('Please enter a backup name'); return; }
    try {
      const response = await fetch('/api/admin/db/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: backupName, type: 'full' }) });
      const result = await response.json();
      if (result.success) { toast.success('Backup created'); setBackupName(''); setBackups([result.backup, ...backups]); }
      else { toast.error(result.error || 'Backup failed'); }
    } catch { toast.error('Backup failed'); }
  };

  const restoreBackup = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to restore backup "${name}"? This will replace the current database.`)) return;
    try {
      const response = await fetch(`/api/admin/db/backup/${id}/restore`, { method: 'POST' });
      const result = await response.json();
      if (result.success) { toast.success('Backup restored successfully'); }
      else { toast.error(result.error || 'Restore failed'); }
    } catch { toast.error('Restore failed'); }
  };

  return (
    <ScrollArea className="h-full p-6">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Create New Backup</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input placeholder="Backup name..." value={backupName} onChange={(e) => setBackupName(e.target.value)} className="flex-1" />
              <Button onClick={createBackup}><Save className="h-4 w-4 mr-2" />Create Backup</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Existing Backups</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div> : backups.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No backups yet</div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Size</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell className="font-medium">{backup.name}</TableCell>
                      <TableCell><Badge variant="outline">{backup.type}</Badge></TableCell>
                      <TableCell>{(backup.size / 1024).toFixed(2)} KB</TableCell>
                      <TableCell><Badge variant={backup.status === 'completed' ? 'default' : 'destructive'}>{backup.status}</Badge></TableCell>
                      <TableCell>{new Date(backup.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => restoreBackup(backup.id, backup.name)}>
                          Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

// ==================== Audit Logs Tab ====================
function AuditLogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/db/audit-logs?limit=100');
      const d = await response.json();
      if (d.success) setLogs(d.logs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4 flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold">Audit Logs</h2>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No audit logs yet</div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>Action</TableHead><TableHead>Resource</TableHead><TableHead>Status</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell><Badge>{log.action}</Badge></TableCell>
                  <TableCell><div className="text-sm">{log.resourceType}</div><div className="text-xs text-muted-foreground">{log.resourceName}</div></TableCell>
                  <TableCell><Badge variant={log.status === 'success' ? 'default' : 'destructive'}>{log.status}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate font-mono text-xs">{log.query || log.details || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </div>
  );
}

// ==================== Permissions Tab ====================
function PermissionsTab({ userRole, setUserRole }: { userRole: UserRole; setUserRole: (role: UserRole) => void }) {
  const permissions = getPermissions(userRole);
  const [customPermissions, setCustomPermissions] = useState<DatabasePermission | null>(null);

  const handlePermissionChange = (perm: keyof DatabasePermission, value: boolean) => {
    if (!customPermissions) return;
    setCustomPermissions({ ...customPermissions, [perm]: value });
  };

  const applyCustomPermissions = () => {
    toast.success('Custom permissions applied for this session');
  };

  return (
    <ScrollArea className="h-full p-6">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Management
            </CardTitle>
            <CardDescription>
              Switch between roles or customize permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-6">
              {(['viewer', 'editor', 'admin'] as UserRole[]).map((role) => (
                <Button
                  key={role}
                  variant={userRole === role ? 'default' : 'outline'}
                  onClick={() => {
                    setUserRole(role);
                    setCustomPermissions(null);
                  }}
                >
                  {getRoleDisplayName(role)}
                </Button>
              ))}
            </div>

            <div className="space-y-6">
              {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => (
                <div key={category}>
                  <h3 className="font-semibold mb-3 text-lg">{CATEGORY_NAMES[category as keyof typeof CATEGORY_NAMES]}</h3>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {perms.map((perm) => {
                      const currentValue = customPermissions ? customPermissions[perm] : permissions[perm];
                      return (
                        <div
                          key={perm}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            currentValue ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                          }`}
                        >
                          <span className="text-sm">{getPermissionDisplayName(perm)}</span>
                          <Switch
                            checked={currentValue}
                            onCheckedChange={(checked) => handlePermissionChange(perm, checked)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t">
              <Button onClick={applyCustomPermissions}>
                Apply Custom Permissions
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Descriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Badge>مشاهد (Viewer)</Badge>
                <p className="text-sm text-muted-foreground">Can view tables and data, execute SELECT queries only</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Badge variant="secondary">محرر (Editor)</Badge>
                <p className="text-sm text-muted-foreground">Can view, insert, update, delete data, import/export, and view audit logs</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Badge variant="default">مدير (Admin)</Badge>
                <p className="text-sm text-muted-foreground">Full access to all features including backup, restore, and schema changes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

export default DatabaseManager;
