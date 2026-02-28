'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableHeader,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  Database, 
  Key, 
  Pencil, 
  Trash2, 
  RefreshCw, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  TableIcon,
  Code,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  X,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Field {
  name: string;
  type: string;
  kind: string;
  isRequired: boolean;
  isUnique: boolean;
  isId: boolean;
  hasDefault: boolean;
  relationName: string | null;
}

interface TableInfo {
  name: string;
  displayName: string;
  tableName: string;
  count: number;
  fields: Field[];
}

interface Record {
  id: string;
  [key: string]: unknown;
}

interface QueryHistory {
  query: string;
  timestamp: string;
  success: boolean;
}

// Sample queries for quick access
const sampleQueries = [
  { name: 'جميع السور', query: 'SELECT * FROM surahs LIMIT 10;' },
  { name: 'عدد الآيات لكل سورة', query: 'SELECT surah_id, COUNT(*) as ayah_count FROM ayahs GROUP BY surah_id ORDER BY surah_id;' },
  { name: 'القراء النشطين', query: 'SELECT name_arabic, name_english, country FROM reciters WHERE is_active = 1;' },
  { name: 'آيات تحتوي سجدة', query: 'SELECT surah_id, number, text_arabic FROM ayahs WHERE sajdah = 1;' },
  { name: 'آيات الجزء الأول', query: 'SELECT number_in_quran, surah_id, number, text_arabic FROM ayahs WHERE juz_number = 1 LIMIT 20;' },
  { name: 'هيكل جدول الآيات', query: 'PRAGMA table_info(ayahs);' },
  { name: 'فهارس جدول السور', query: 'PRAGMA index_list(surahs);' },
  { name: 'إحصائيات القراء', query: 'SELECT r.name_arabic, COUNT(rec.id) as recitation_count FROM reciters r LEFT JOIN recitations rec ON r.id = rec.reciter_id GROUP BY r.id ORDER BY recitation_count DESC;' },
];

export function DatabaseBrowser() {
  // Table browser state
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [tableData, setTableData] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);
  const [fields, setFields] = useState<Field[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // SQL Editor state
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM surahs LIMIT 10;');
  const [sqlResults, setSqlResults] = useState<{
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
    executionTime: number;
  } | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [activeTab, setActiveTab] = useState('browser');
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      
      const response = await fetch('/api/admin/database/tables');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setTables(data.tables);
        // Fetch counts in the background
        fetchCounts();
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      let errorMessage = 'فشل في تحميل الجداول';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setFetchError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      setIsLoadingCounts(true);
      const response = await fetch('/api/admin/database/counts');
      const data = await response.json();
      
      if (data.success && data.counts) {
        // Update tables with counts
        setTables(prev => prev.map(table => ({
          ...table,
          count: data.counts[table.tableName] || 0
        })));
      }
    } catch (error) {
      console.error('Error fetching counts:', error);
      // Don't show error for counts - it's not critical
    } finally {
      setIsLoadingCounts(false);
    }
  };

  const fetchTableData = async (tableName: string, page: number, search: string) => {
    if (!tableName) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        search: search || '',
        limit: pageSize.toString(),
      });

      const response = await fetch(`/api/admin/database/data/${tableName}?${params}`);
      const data = await response.json();
      if (data.success) {
        setTableData(data.data);
        setTotalRecords(data.total);
        setFields(data.fields);
      }
    } catch (error) {
      console.error('Error fetching table data:', error);
      toast.error('فشل في تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTableSelect = (table: TableInfo) => {
    setSelectedTable(table);
    setTableData([]);
    setFields(table.fields);
    setCurrentPage(1);
    setSearchQuery('');
    fetchTableData(table.tableName, 1, '');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  useEffect(() => {
    if (selectedTable) {
      const timer = setTimeout(() => {
        fetchTableData(selectedTable.tableName, currentPage, searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchTableData(selectedTable?.tableName || '', newPage, searchQuery);
  };

  const handleEdit = (record: Record) => {
    setEditingRecord({ ...record });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editingRecord || !selectedTable) return;

    try {
      const response = await fetch(`/api/admin/database/data/${selectedTable.tableName}/${editingRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRecord),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('تم تحديث السجل بنجاح');
        setEditDialogOpen(false);
        setEditingRecord(null);
        fetchTableData(selectedTable.tableName, currentPage, searchQuery);
      } else {
        toast.error(data.error || 'فشل في التحديث');
      }
    } catch (error) {
      console.error('Error saving record:', error);
      toast.error('فشل في حفظ السجل');
    }
  };

  const confirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!deletingId || !selectedTable) return;

    try {
      const response = await fetch(`/api/admin/database/data/${selectedTable.tableName}/${deletingId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        toast.success('تم حذف السجل بنجاح');
        setDeleteDialogOpen(false);
        setDeletingId(null);
        fetchTableData(selectedTable.tableName, currentPage, searchQuery);
      } else {
        toast.error(data.error || 'فشل في الحذف');
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('فشل في حذف السجل');
    }
  };

  // SQL Editor functions
  const executeQuery = async () => {
    if (!sqlQuery.trim()) {
      toast.error('الرجاء إدخال استعلام SQL');
      return;
    }

    setIsExecuting(true);
    setSqlError(null);
    setSqlResults(null);

    try {
      const response = await fetch('/api/admin/database/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sqlQuery }),
      });

      const data = await response.json();

      if (data.success) {
        setSqlResults(data.data);
        setQueryHistory(prev => [
          { query: sqlQuery, timestamp: new Date().toISOString(), success: true },
          ...prev.slice(0, 19)
        ]);
        toast.success(`تم التنفيذ بنجاح - ${data.data.rowCount} صف في ${data.data.executionTime}ms`);
      } else {
        setSqlError(data.error || 'خطأ غير معروف');
        setQueryHistory(prev => [
          { query: sqlQuery, timestamp: new Date().toISOString(), success: false },
          ...prev.slice(0, 19)
        ]);
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Error executing query:', error);
      const errorMsg = error instanceof Error ? error.message : 'خطأ في الاتصال';
      setSqlError(errorMsg);
      toast.error('فشل في تنفيذ الاستعلام');
    } finally {
      setIsExecuting(false);
    }
  };

  const copyQuery = () => {
    navigator.clipboard.writeText(sqlQuery);
    toast.success('تم نسخ الاستعلام');
  };

  const clearQuery = () => {
    setSqlQuery('');
    setSqlResults(null);
    setSqlError(null);
  };

  const loadSampleQuery = (query: string) => {
    setSqlQuery(query);
    setSqlResults(null);
    setSqlError(null);
  };

  const loadHistoryQuery = (query: string) => {
    setSqlQuery(query);
    setSqlResults(null);
    setSqlError(null);
  };

  const formatValue = (value: unknown): ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic text-xs">NULL</span>;
    }
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'} className="text-xs">
          {value ? 'true' : 'false'}
        </Badge>
      );
    }
    if (typeof value === 'number') {
      return <span className="font-mono text-sm">{value.toLocaleString()}</span>;
    }
    if (value instanceof Date) {
      return <span className="text-muted-foreground text-xs">{value.toLocaleString()}</span>;
    }
    if (typeof value === 'string') {
      if (value.length > 100) {
        return (
          <span className="font-mono text-xs truncate block max-w-[200px]" title={value}>
            {value.substring(0, 50)}...
          </span>
        );
      }
      return <span className="text-sm">{value}</span>;
    }
    if (typeof value === 'object') {
      return (
        <Badge variant="outline" className="text-xs">
          {Array.isArray(value) ? 'Array' : 'Object'}
        </Badge>
      );
    }
    return <span className="text-sm">{String(value)}</span>;
  };

  if (isLoading && tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (fetchError && tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <XCircle className="h-12 w-12 text-red-500" />
        <p className="text-muted-foreground">{fetchError}</p>
        <Button onClick={() => fetchTables()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="browser" className="flex items-center gap-2">
          <TableIcon className="h-4 w-4" />
          مستعرِض الجداول
        </TabsTrigger>
        <TabsTrigger value="sql" className="flex items-center gap-2">
          <Code className="h-4 w-4" />
          محرر SQL
        </TabsTrigger>
      </TabsList>

      {/* Table Browser Tab */}
      <TabsContent value="browser" className="space-y-0">
        <div className="flex gap-4 h-[calc(100vh-280px)]">
          {/* Left sidebar - Tables list */}
          <Card className="w-64 shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                الجداول ({tables.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-340px)]">
                <div className="space-y-1 p-2">
                  {tables.map((table) => (
                    <div
                      key={table.tableName}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors',
                        selectedTable?.tableName === table.tableName
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted/50'
                      )}
                      onClick={() => handleTableSelect(table)}
                    >
                      <div className="flex items-center gap-2">
                        <TableIcon className="h-4 w-4" />
                        <span className="font-medium text-sm">{table.displayName}</span>
                      </div>
                      <Badge 
                        variant={selectedTable?.tableName === table.tableName ? 'secondary' : 'outline'} 
                        className="text-xs"
                      >
                        {isLoadingCounts && table.count === 0 ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          table.count
                        )}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Main content area */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {selectedTable ? (
                      <div className="flex items-center gap-2">
                        <TableIcon className="h-5 w-5" />
                        {selectedTable.displayName}
                      </div>
                    ) : (
                      'اختر جدولاً للاستعراض'
                    )}
                  </CardTitle>
                  {selectedTable && (
                    <CardDescription>
                      {selectedTable.fields.length} أعمدة • {totalRecords} سجل
                    </CardDescription>
                  )}
                </div>
                {selectedTable && (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="بحث..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-8 w-64"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fetchTableData(selectedTable.tableName, currentPage, searchQuery)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {!selectedTable ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Database className="h-16 w-16 mb-4 opacity-20" />
                  <p>اختر جدولاً من القائمة للاستعراض</p>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16 text-center">إجراءات</TableHead>
                          {fields.filter(f => f.kind === 'scalar').slice(0, 8).map((field) => (
                            <TableHead key={field.name}>
                              <div className="flex items-center gap-1">
                                {field.isId && <Key className="h-3 w-3 text-yellow-500" />}
                                <span className="text-xs">{field.name}</span>
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tableData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center h-24">
                              <span className="text-muted-foreground">لا توجد بيانات</span>
                            </TableCell>
                          </TableRow>
                        ) : (
                          tableData.map((record) => (
                            <TableRow key={record.id} className="hover:bg-muted/50">
                              <TableCell>
                                <div className="flex gap-1 justify-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleEdit(record)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-500 hover:text-red-600"
                                    onClick={() => handleDeleteClick(String(record.id))}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                              {fields.filter(f => f.kind === 'scalar').slice(0, 8).map((field) => (
                                <TableCell key={field.name} className="text-sm">
                                  {formatValue(record[field.name])}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, totalRecords)} من {totalRecords} سجل
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        السابق
                      </Button>
                      <span className="text-sm px-2">
                        {currentPage} / {Math.ceil(totalRecords / pageSize) || 1}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage * pageSize >= totalRecords}
                        onClick={() => handlePageChange(currentPage + 1)}
                      >
                        التالي
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* SQL Editor Tab */}
      <TabsContent value="sql" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Panel - Sample Queries & History */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" />
                استعلامات جاهزة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-400px)]">
                <div className="space-y-1 p-2">
                  {sampleQueries.map((sample, index) => (
                    <div
                      key={index}
                      className="p-2 rounded-lg cursor-pointer hover:bg-muted/50 text-sm transition-colors"
                      onClick={() => loadSampleQuery(sample.query)}
                    >
                      <div className="font-medium text-xs">{sample.name}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate mt-1">
                        {sample.query.substring(0, 40)}...
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* History Section */}
              {queryHistory.length > 0 && (
                <>
                  <div className="border-t px-4 py-2">
                    <h4 className="text-xs font-medium text-muted-foreground">سجل الاستعلامات</h4>
                  </div>
                  <ScrollArea className="h-40">
                    <div className="space-y-1 p-2">
                      {queryHistory.map((item, index) => (
                        <div
                          key={index}
                          className="p-2 rounded-lg cursor-pointer hover:bg-muted/50 text-xs transition-colors"
                          onClick={() => loadHistoryQuery(item.query)}
                        >
                          <div className="flex items-center gap-2">
                            {item.success ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                            <span className="font-mono truncate flex-1">
                              {item.query.substring(0, 30)}...
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>

          {/* Right Panel - Editor & Results */}
          <div className="lg:col-span-3 space-y-4">
            {/* SQL Editor */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    محرر SQL
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={copyQuery}>
                      <Copy className="h-4 w-4 mr-1" />
                      نسخ
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearQuery}>
                      <X className="h-4 w-4 mr-1" />
                      مسح
                    </Button>
                    <Button 
                      onClick={executeQuery} 
                      disabled={isExecuting || !sqlQuery.trim()}
                    >
                      {isExecuting ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
                      تنفيذ
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="اكتب استعلام SQL هنا... (فقط SELECT, PRAGMA, EXPLAIN مسموح بها)"
                  className="font-mono text-sm min-h-[120px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      executeQuery();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  اضغط Ctrl+Enter للتنفيذ السريع • فقط أوامر SELECT و PRAGMA و EXPLAIN مسموح بها للأمان
                </p>
              </CardContent>
            </Card>

            {/* Results */}
            {(sqlResults || sqlError) && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      {sqlError ? 'خطأ' : 'النتائج'}
                    </CardTitle>
                    {sqlResults && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {sqlResults.executionTime}ms
                        </div>
                        <div className="flex items-center gap-1">
                          <TableIcon className="h-3 w-3" />
                          {sqlResults.rowCount} صف
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {sqlError ? (
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-800 dark:text-red-200">خطأ في الاستعلام</p>
                          <p className="text-sm text-red-600 dark:text-red-300 mt-1">{sqlError}</p>
                        </div>
                      </div>
                    </div>
                  ) : sqlResults && (
                    <div className="rounded-md border overflow-auto max-h-[400px]">
                      {sqlResults.rowCount === 0 ? (
                        <div className="flex items-center justify-center h-24 text-muted-foreground">
                          لا توجد نتائج
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {sqlResults.columns.map((col) => (
                                <TableHead key={col} className="font-mono text-xs whitespace-nowrap">
                                  {col}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sqlResults.rows.slice(0, 100).map((row, index) => (
                              <TableRow key={index}>
                                {sqlResults.columns.map((col) => (
                                  <TableCell key={col} className="text-sm">
                                    {formatValue(row[col])}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                      {sqlResults.rowCount > 100 && (
                        <div className="p-2 text-center text-xs text-muted-foreground border-t">
                          عرض أول 100 صف من {sqlResults.rowCount} صف
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </TabsContent>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل السجل</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4 py-4">
              {fields.filter(f => f.kind === 'scalar').map((field) => (
                <div key={field.name} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">{field.name}</label>
                    <Badge variant="outline" className="text-xs">{field.type}</Badge>
                    {field.isId && <Badge className="text-xs">ID</Badge>}
                    {field.isRequired && <Badge variant="secondary" className="text-xs">مطلوب</Badge>}
                  </div>
                  {field.type === 'Boolean' ? (
                    <select
                      className="w-full border rounded-md p-2"
                      value={editingRecord[field.name] ? 'true' : 'false'}
                      onChange={(e) => setEditingRecord({ 
                        ...editingRecord, 
                        [field.name]: e.target.value === 'true' 
                      })}
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <Input
                      value={editingRecord[field.name]?.toString() || ''}
                      onChange={(e) => {
                        let value: string | number = e.target.value;
                        if (field.type === 'Int' || field.type === 'Float') {
                          value = field.type === 'Int' 
                            ? parseInt(e.target.value) || 0 
                            : parseFloat(e.target.value) || 0;
                        }
                        setEditingRecord({ ...editingRecord, [field.name]: value });
                      }}
                      disabled={field.isId}
                      type={field.type === 'Int' || field.type === 'Float' ? 'number' : 'text'}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={saveEdit}>حفظ التغييرات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              حذف
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
