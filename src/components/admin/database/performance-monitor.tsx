'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Activity, Database, Clock, AlertTriangle, RefreshCw, Loader2,
  TrendingUp, BarChart3, Zap, Check, X
} from 'lucide-react';
import { toast } from 'sonner';

interface PerformanceMetrics {
  database: {
    size: number;
    tableCount: number;
    viewCount: number;
    indexCount: number;
    pageCount: number;
    pageSize: number;
  };
  queries: {
    totalExecuted: number;
    averageTime: number;
    slowQueries: SlowQuery[];
  };
  tables: TableMetrics[];
  connections: {
    active: number;
    idle: number;
  };
  totalTables: number;
  totalRows: number;
  totalSize: number;
  queryCount: number;
  avgQueryTime: number;
}

interface SlowQuery {
  query: string;
  executionTime: number;
  timestamp: string;
  rowCount: number;
}

interface TableMetrics {
  name: string;
  rowCount: number;
  sizeBytes: number;
  readCount: number;
  writeCount: number;
  indexCount: number;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/db/metrics');
      const result = await response.json();
      if (result.success) {
        setMetrics(result.metrics);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch metrics');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (refreshInterval) {
      const interval = setInterval(fetchMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1) return `${(ms * 1000).toFixed(2)}µs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading performance metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-destructive">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4" />
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={fetchMetrics} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No metrics available
      </div>
    );
  }

  const slowQueries = metrics.queries?.slowQueries || [];
  const tableMetrics = metrics.tables || [];

  return (
    <ScrollArea className="h-full p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Performance Monitor</h2>
            <p className="text-muted-foreground">Real-time database performance metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="text-sm border rounded px-2 py-1"
              value={refreshInterval || ''}
              onChange={(e) => setRefreshInterval(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">No auto-refresh</option>
              <option value="5000">5 seconds</option>
              <option value="10000">10 seconds</option>
              <option value="30000">30 seconds</option>
            </select>
            <Button variant="outline" size="sm" onClick={fetchMetrics}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database Size</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatBytes(metrics.database?.size || metrics.totalSize || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.database?.tableCount || metrics.totalTables || 0} tables
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rows</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(metrics.totalRows || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Across all tables</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Query Stats</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.queries?.totalExecuted || metrics.queryCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                Avg: {formatTime(metrics.queries?.averageTime || metrics.avgQueryTime || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Slow Queries</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${slowQueries.length > 0 ? 'text-yellow-500' : 'text-green-500'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{slowQueries.length}</div>
              <p className="text-xs text-muted-foreground">
                Queries {'>'} 100ms
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Slow Queries Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Slow Queries
                </CardTitle>
                <CardDescription>Queries that took longer than 100ms to execute</CardDescription>
              </div>
              <Badge variant="secondary">{slowQueries.length} queries</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {slowQueries.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Zap className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>No slow queries detected!</p>
              </div>
            ) : (
              <ScrollArea className="max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slowQueries.map((q, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs max-w-md truncate">
                          {q.query}
                        </TableCell>
                        <TableCell>
                          <Badge variant={q.executionTime > 500 ? 'destructive' : 'secondary'}>
                            {formatTime(q.executionTime)}
                          </Badge>
                        </TableCell>
                        <TableCell>{q.rowCount?.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(q.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Table Statistics Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Table Statistics
            </CardTitle>
            <CardDescription>Performance metrics per table</CardDescription>
          </CardHeader>
          <CardContent>
            {tableMetrics.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No table statistics available
              </div>
            ) : (
              <ScrollArea className="max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Indexes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableMetrics.map((table) => (
                      <TableRow key={table.name}>
                        <TableCell className="font-mono">{table.name}</TableCell>
                        <TableCell>{table.rowCount?.toLocaleString()}</TableCell>
                        <TableCell>{formatBytes(table.sizeBytes || 0)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{table.indexCount || 0}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Database Health and Performance Tips - Side by Side */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Database Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Page Size</span>
                  <Badge>{formatBytes(metrics.database?.pageSize || 4096)}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Pages</span>
                  <Badge>{(metrics.database?.pageCount || 0).toLocaleString()}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Index Count</span>
                  <Badge>{metrics.database?.indexCount || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">View Count</span>
                  <Badge>{metrics.database?.viewCount || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {slowQueries.length > 0 && (
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                    <span>Review slow queries for optimization opportunities</span>
                  </li>
                )}
                {tableMetrics.filter(t => t.indexCount === 0 && t.rowCount > 1000).length > 0 && (
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                    <span>Consider adding indexes to large tables without indexes</span>
                  </li>
                )}
                {(metrics.database?.size || metrics.totalSize || 0) > 100 * 1024 * 1024 && (
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                    <span>Database is large. Consider archiving old data</span>
                  </li>
                )}
                {slowQueries.length === 0 && (
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>Database performance is optimal!</span>
                  </li>
                )}
                {(metrics.queries?.totalExecuted || metrics.queryCount || 0) === 0 && (
                  <li className="flex items-start gap-2">
                    <Activity className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <span>Execute some queries to see performance metrics</span>
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}

export default PerformanceMonitor;
