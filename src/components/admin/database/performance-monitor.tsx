'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Activity, Database, Clock, AlertTriangle, RefreshCw, Loader2,
  TrendingUp, TrendingDown, Minus, BarChart3, Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface PerformanceMetrics {
  database: {
    size: number;
    tableCount: number;
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
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/db/metrics');
      const result = await response.json();
      if (result.success) {
        setMetrics(result.metrics);
      }
    } catch (error) {
      toast.error('Failed to fetch metrics');
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
              <div className="text-2xl font-bold">{formatBytes(metrics.database.size)}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.database.tableCount} tables, {metrics.database.indexCount} indexes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Query Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(metrics.queries.averageTime)}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.queries.totalExecuted} queries executed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Slow Queries</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.queries.slowQueries.length}</div>
              <p className="text-xs text-muted-foreground">
                Queries {'>'} 100ms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Page Cache</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.database.pageCount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {formatBytes(metrics.database.pageCount * metrics.database.pageSize)} total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Slow Queries */}
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
              <Badge variant="secondary">{metrics.queries.slowQueries.length} queries</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {metrics.queries.slowQueries.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Zap className="h-8 w-8 mx-auto mb-2 text-green-500" />
                No slow queries detected!
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
                    {metrics.queries.slowQueries.map((q, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs max-w-md truncate">
                          {q.query}
                        </TableCell>
                        <TableCell>
                          <Badge variant={q.executionTime > 500 ? 'destructive' : 'secondary'}>
                            {formatTime(q.executionTime)}
                          </Badge>
                        </TableCell>
                        <TableCell>{q.rowCount.toLocaleString()}</TableCell>
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

        {/* Table Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Table Statistics
            </CardTitle>
            <CardDescription>Performance metrics per table</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Indexes</TableHead>
                    <TableHead>Read/Write</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.tables.map((table) => (
                    <TableRow key={table.name}>
                      <TableCell className="font-mono">{table.name}</TableCell>
                      <TableCell>{table.rowCount.toLocaleString()}</TableCell>
                      <TableCell>{formatBytes(table.sizeBytes)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{table.indexCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">{table.readCount.toLocaleString()}</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-blue-600">{table.writeCount.toLocaleString()}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Database Health */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Database Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Page Size</span>
                  <Badge>{formatBytes(metrics.database.pageSize)}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Pages</span>
                  <Badge>{metrics.database.pageCount.toLocaleString()}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Index Count</span>
                  <Badge>{metrics.database.indexCount}</Badge>
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
                {metrics.queries.slowQueries.length > 0 && (
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <span>Review slow queries for optimization opportunities</span>
                  </li>
                )}
                {metrics.tables.filter(t => t.indexCount === 0 && t.rowCount > 1000).length > 0 && (
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <span>Consider adding indexes to large tables without indexes</span>
                  </li>
                )}
                {metrics.database.size > 100 * 1024 * 1024 && (
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <span>Database is large. Consider archiving old data</span>
                  </li>
                )}
                {metrics.queries.slowQueries.length === 0 && (
                  <li className="flex items-start gap-2">
                    <Activity className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Database performance is optimal!</span>
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
