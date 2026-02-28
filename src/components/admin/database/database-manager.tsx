'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Database, Table2, Code, Upload, Download, Save, Clock, BarChart3, FileJson,
  Play, Plus, Search, MoreHorizontal, Trash2, Edit, Copy, Check, AlertTriangle,
  RefreshCw, Eye, X, Loader2, ChevronLeft, ChevronRight, Star,
} from 'lucide-react';
import { useDatabaseStore } from '@/stores/database-store';

// ==================== Main Database Manager Component ====================
export function DatabaseManager() {
  const [activeTab, setActiveTab] = useState('dashboard');
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
              <p className="text-sm text-muted-foreground">Manage your database with advanced tools</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
        <div className="border-b px-6">
          <TabsList className="h-12">
            <TabsTrigger value="dashboard" className="gap-2"><BarChart3 className="h-4 w-4" /> Dashboard</TabsTrigger>
            <TabsTrigger value="tables" className="gap-2"><Table2 className="h-4 w-4" /> Tables</TabsTrigger>
            <TabsTrigger value="query" className="gap-2"><Code className="h-4 w-4" /> Query Editor</TabsTrigger>
            <TabsTrigger value="import-export" className="gap-2"><Download className="h-4 w-4" /> Import/Export</TabsTrigger>
            <TabsTrigger value="backup" className="gap-2"><Save className="h-4 w-4" /> Backup</TabsTrigger>
            <TabsTrigger value="audit" className="gap-2"><Clock className="h-4 w-4" /> Audit Logs</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="dashboard" className="h-full m-0"><DashboardTab metrics={metrics} tables={tables} /></TabsContent>
          <TabsContent value="tables" className="h-full m-0"><TablesTab tables={tables} isLoading={isLoadingTables} /></TabsContent>
          <TabsContent value="query" className="h-full m-0"><QueryEditorTab /></TabsContent>
          <TabsContent value="import-export" className="h-full m-0"><ImportExportTab tables={tables} /></TabsContent>
          <TabsContent value="backup" className="h-full m-0"><BackupTab /></TabsContent>
          <TabsContent value="audit" className="h-full m-0"><AuditLogsTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ==================== Dashboard Tab ====================
function DashboardTab({ metrics, tables }: { metrics: any; tables: any[] }) {
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

        <Card>
          <CardHeader><CardTitle>Tables Overview</CardTitle></CardHeader>
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
                {tables.slice(0, 10).map((table) => (
                  <TableRow key={table.name}>
                    <TableCell className="font-mono">{table.name}</TableCell>
                    <TableCell><Badge variant={table.type === 'table' ? 'default' : 'secondary'}>{table.type}</Badge></TableCell>
                    <TableCell>{table.rowCount?.toLocaleString()}</TableCell>
                    <TableCell>{table.sizeBytes ? (table.sizeBytes / 1024).toFixed(2) : 0} KB</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

// ==================== Tables Tab ====================
function TablesTab({ tables, isLoading }: { tables: any[]; isLoading: boolean }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [tableData, setTableData] = useState<any>({ data: [], columns: [], loading: false });

  const filteredTables = tables.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const fetchTableData = useCallback(async (tableName: string) => {
    setTableData(prev => ({ ...prev, loading: true }));
    try {
      const response = await fetch(`/api/admin/database/data/${tableName}?limit=50`);
      const result = await response.json();
      if (result.success) {
        setTableData({ data: result.data, columns: result.columns, loading: false });
      }
    } catch {
      toast.error('Failed to fetch table data');
      setTableData(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (selectedTable) fetchTableData(selectedTable.name);
  }, [selectedTable, fetchTableData]);

  return (
    <div className="h-full flex">
      <div className="w-80 border-r flex flex-col">
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
                <button key={table.name} className={`w-full text-left p-3 rounded-lg hover:bg-accent transition-colors ${selectedTable?.name === table.name ? 'bg-accent' : ''}`} onClick={() => setSelectedTable(table)}>
                  <div className="flex items-center gap-2"><Table2 className="h-4 w-4 text-muted-foreground" /><span className="font-mono text-sm">{table.name}</span></div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground"><span>{table.rowCount?.toLocaleString()} rows</span><span>•</span><span>{table.columns?.length} cols</span></div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
      <div className="flex-1 flex flex-col">
        {selectedTable ? (
          <>
            <div className="border-b p-4"><h2 className="text-lg font-semibold font-mono">{selectedTable.name}</h2><p className="text-sm text-muted-foreground">{selectedTable.rowCount?.toLocaleString()} rows • {selectedTable.columns?.length} columns</p></div>
            <ScrollArea className="flex-1">
              {tableData.loading ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="p-4">
                  <Table>
                    <TableHeader><TableRow>{tableData.columns.map((col: any) => (<TableHead key={col.name} className="font-mono whitespace-nowrap">{col.name}</TableHead>))}</TableRow></TableHeader>
                    <TableBody>
                      {tableData.data.map((row: any, i: number) => (
                        <TableRow key={i}>{tableData.columns.map((col: any) => (<TableCell key={col.name} className="font-mono text-sm max-w-xs truncate">{String(row[col.name] ?? 'NULL')}</TableCell>))}</TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </ScrollArea>
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

  const executeQuery = async () => {
    setExecuting(true);
    try {
      const response = await fetch('/api/admin/db/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
      const data = await response.json();
      setResult(data);
    } catch { toast.error('Query execution failed'); }
    finally { setExecuting(false); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <Textarea value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Enter SQL query..." className="font-mono min-h-[150px] resize-none" />
        <div className="mt-4 flex gap-2">
          <Button onClick={executeQuery} disabled={executing}>{executing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}Execute</Button>
          <Button variant="outline"><Save className="h-4 w-4 mr-2" />Save Query</Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        {result ? (
          <div className="p-4">
            {result.success ? (
              <>
                <div className="text-sm text-muted-foreground mb-4">{result.rowCount} rows • {result.executionTime?.toFixed(2)}ms</div>
                <Table>
                  <TableHeader><TableRow className="bg-muted/50">{result.columns?.map((col: any) => (<TableHead key={col.name} className="font-mono whitespace-nowrap">{col.name}</TableHead>))}</TableRow></TableHeader>
                  <TableBody>
                    {result.data?.slice(0, 100).map((row: any, i: number) => (
                      <TableRow key={i}>{result.columns?.map((col: any) => (<TableCell key={col.name} className="font-mono text-sm max-w-xs truncate">{String(row[col.name] ?? 'NULL')}</TableCell>))}</TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : (<div className="text-destructive"><AlertTriangle className="h-4 w-4 inline mr-2" />{result.error}</div>)}
          </div>
        ) : (<div className="h-full flex items-center justify-center text-muted-foreground"><div className="text-center"><Code className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Execute a query to see results</p></div></div>)}
      </ScrollArea>
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

  return (
    <ScrollArea className="h-full p-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Import Data</CardTitle><CardDescription>Import data from JSON</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Target Table</Label><select className="w-full mt-1 p-2 border rounded" value={importTable} onChange={(e) => setImportTable(e.target.value)}><option value="">Select table...</option>{tables.map((t) => (<option key={t.name} value={t.name}>{t.name}</option>))}</select></div>
            <div><Label>Data (JSON Array)</Label><Textarea value={importData} onChange={(e) => setImportData(e.target.value)} placeholder='[{"column": "value", ...}]' className="font-mono min-h-[200px]" /></div>
            <Button onClick={handleImport} disabled={processing} className="w-full">{processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}Import</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" />Export Data</CardTitle><CardDescription>Export table data</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Table</Label><select className="w-full mt-1 p-2 border rounded" value={exportTable} onChange={(e) => setExportTable(e.target.value)}><option value="">Select table...</option>{tables.map((t) => (<option key={t.name} value={t.name}>{t.name}</option>))}</select></div>
            <div><Label>Format</Label><div className="flex gap-2 mt-2">{['json', 'csv', 'sql'].map((fmt) => (<Button key={fmt} variant={exportFormat === fmt ? 'default' : 'outline'} size="sm" onClick={() => setExportFormat(fmt)}>{fmt.toUpperCase()}</Button>))}</div></div>
            <Button className="w-full"><Download className="h-4 w-4 mr-2" />Export</Button>
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
            {loading ? <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Size</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell className="font-medium">{backup.name}</TableCell>
                      <TableCell><Badge variant="outline">{backup.type}</Badge></TableCell>
                      <TableCell>{(backup.size / 1024).toFixed(2)} KB</TableCell>
                      <TableCell><Badge variant={backup.status === 'completed' ? 'default' : 'destructive'}>{backup.status}</Badge></TableCell>
                      <TableCell>{new Date(backup.createdAt).toLocaleString()}</TableCell>
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

  useEffect(() => {
    fetch('/api/admin/db/audit-logs?limit=100').then(r => r.json()).then(d => d.success && setLogs(d.logs)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4"><h2 className="text-lg font-semibold">Audit Logs</h2></div>
      <ScrollArea className="flex-1">
        {loading ? <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
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

export default DatabaseManager;
