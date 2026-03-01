import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Types
export interface TableInfo {
  name: string;
  type: 'table' | 'view';
  rowCount: number;
  sizeBytes: number;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
}

export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  query: string;
  tags: string[];
  isFavorite: boolean;
  useCount: number;
  createdAt: string;
  lastUsedAt?: string;
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  executionTime: number;
  rowCount?: number;
  status: 'success' | 'error';
  errorMessage?: string;
  timestamp: Date;
}

export interface QueryResult {
  data: Record<string, unknown>[];
  columns: { name: string; type: string }[];
  rowCount: number;
  executionTime: number;
  affectedRows?: number;
  error?: string;
}

export interface EditorTab {
  id: string;
  name: string;
  query: string;
  result?: QueryResult;
  isSaved: boolean;
  isExecuting: boolean;
}

export interface BackupRecord {
  id: string;
  name: string;
  type: 'full' | 'schema-only' | 'data-only';
  size: number;
  status: 'completed' | 'failed' | 'in-progress';
  createdAt: string;
  checksum?: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  action: string;
  resourceType: string;
  resourceName: string;
  resourceId?: string;
  details?: string;
  query?: string;
  status: string;
  errorMessage?: string;
}

interface DatabaseState {
  // Connection State
  connectionStatus: 'connected' | 'disconnected' | 'checking';
  
  // Tables
  tables: TableInfo[];
  selectedTable: string | null;
  tableStructure: ColumnInfo[] | null;
  isLoadingTables: boolean;
  
  // Editor State
  tabs: EditorTab[];
  activeTabId: string | null;
  queryHistory: QueryHistoryItem[];
  savedQueries: SavedQuery[];
  isExecuting: boolean;
  
  // Backup State
  backups: BackupRecord[];
  isLoadingBackups: boolean;
  
  // Audit Logs
  auditLogs: AuditLogItem[];
  isLoadingAuditLogs: boolean;
  
  // Metrics
  metrics: {
    totalTables: number;
    totalRows: number;
    totalSize: number;
    queryCount: number;
    avgQueryTime: number;
  };
  
  // Actions
  actions: {
    // Tables
    fetchTables: () => Promise<void>;
    selectTable: (tableName: string) => void;
    fetchTableStructure: (tableName: string) => Promise<void>;
    
    // Query Editor
    createTab: (name?: string) => string;
    closeTab: (tabId: string) => void;
    setActiveTab: (tabId: string) => void;
    updateTabQuery: (tabId: string, query: string) => void;
    executeQuery: (query: string, tabId?: string) => Promise<QueryResult>;
    
    // Query Management
    fetchSavedQueries: () => Promise<void>;
    saveQuery: (name: string, query: string, description?: string, tags?: string[]) => Promise<void>;
    deleteSavedQuery: (id: string) => Promise<void>;
    toggleFavorite: (id: string) => Promise<void>;
    clearHistory: () => void;
    
    // Backup
    fetchBackups: () => Promise<void>;
    createBackup: (name: string, type?: 'full' | 'schema-only' | 'data-only') => Promise<void>;
    deleteBackup: (id: string) => Promise<void>;
    restoreBackup: (id: string) => Promise<void>;
    
    // Audit Logs
    fetchAuditLogs: (limit?: number, offset?: number) => Promise<void>;
    
    // Metrics
    fetchMetrics: () => Promise<void>;
    
    // Utility
    checkConnection: () => Promise<boolean>;
  };
}

// Tab name generator
let tabCounter = 1;
const generateTabName = () => `Query ${tabCounter++}`;

export const useDatabaseStore = create<DatabaseState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        connectionStatus: 'checking',
        tables: [],
        selectedTable: null,
        tableStructure: null,
        isLoadingTables: false,
        tabs: [],
        activeTabId: null,
        queryHistory: [],
        savedQueries: [],
        isExecuting: false,
        backups: [],
        isLoadingBackups: false,
        auditLogs: [],
        isLoadingAuditLogs: false,
        metrics: {
          totalTables: 0,
          totalRows: 0,
          totalSize: 0,
          queryCount: 0,
          avgQueryTime: 0,
        },
        
        actions: {
          // Tables
          fetchTables: async () => {
            set({ isLoadingTables: true });
            try {
              const response = await fetch('/api/admin/db/tables');
              const result = await response.json();
              if (result.success) {
                set({ 
                  tables: result.tables,
                  connectionStatus: 'connected',
                });
              }
            } catch (error) {
              set({ connectionStatus: 'disconnected' });
              console.error('Failed to fetch tables:', error);
            } finally {
              set({ isLoadingTables: false });
            }
          },
          
          selectTable: (tableName) => {
            set({ selectedTable: tableName });
          },
          
          fetchTableStructure: async (tableName) => {
            try {
              const response = await fetch(`/api/admin/db/tables/${encodeURIComponent(tableName)}/structure`);
              const result = await response.json();
              if (result.success) {
                set({ tableStructure: result.columns });
              }
            } catch (error) {
              console.error('Failed to fetch table structure:', error);
            }
          },
          
          // Query Editor
          createTab: (name) => {
            const tabId = `tab-${Date.now()}`;
            const tab: EditorTab = {
              id: tabId,
              name: name || generateTabName(),
              query: '',
              isSaved: false,
              isExecuting: false,
            };
            set((state) => ({
              tabs: [...state.tabs, tab],
              activeTabId: tabId,
            }));
            return tabId;
          },
          
          closeTab: (tabId) => {
            set((state) => {
              const newTabs = state.tabs.filter(t => t.id !== tabId);
              const newActiveId = state.activeTabId === tabId
                ? newTabs[newTabs.length - 1]?.id || null
                : state.activeTabId;
              return { tabs: newTabs, activeTabId: newActiveId };
            });
          },
          
          setActiveTab: (tabId) => {
            set({ activeTabId: tabId });
          },
          
          updateTabQuery: (tabId, query) => {
            set((state) => ({
              tabs: state.tabs.map(t =>
                t.id === tabId ? { ...t, query, isSaved: false } : t
              ),
            }));
          },
          
          executeQuery: async (query, tabId) => {
            const startTime = performance.now();
            
            // Mark tab as executing
            if (tabId) {
              set((state) => ({
                tabs: state.tabs.map(t =>
                  t.id === tabId ? { ...t, isExecuting: true } : t
                ),
                isExecuting: true,
              }));
            }
            
            try {
              const response = await fetch('/api/admin/db/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
              });
              const result = await response.json();
              
              const executionTime = performance.now() - startTime;
              
              const queryResult: QueryResult = {
                data: result.data || [],
                columns: result.columns || [],
                rowCount: result.rowCount || 0,
                executionTime,
                affectedRows: result.affectedRows,
                error: result.error,
              };
              
              // Update tab with result
              if (tabId) {
                set((state) => ({
                  tabs: state.tabs.map(t =>
                    t.id === tabId ? { ...t, result: queryResult, isExecuting: false } : t
                  ),
                  isExecuting: false,
                }));
              }
              
              // Add to history
              const historyItem: QueryHistoryItem = {
                id: `history-${Date.now()}`,
                query,
                executionTime,
                rowCount: queryResult.rowCount,
                status: result.success ? 'success' : 'error',
                errorMessage: result.error,
                timestamp: new Date(),
              };
              
              set((state) => ({
                queryHistory: [historyItem, ...state.queryHistory].slice(0, 100),
              }));
              
              return queryResult;
            } catch (error) {
              const executionTime = performance.now() - startTime;
              const queryResult: QueryResult = {
                data: [],
                columns: [],
                rowCount: 0,
                executionTime,
                error: String(error),
              };
              
              if (tabId) {
                set((state) => ({
                  tabs: state.tabs.map(t =>
                    t.id === tabId ? { ...t, result: queryResult, isExecuting: false } : t
                  ),
                  isExecuting: false,
                }));
              }
              
              return queryResult;
            }
          },
          
          // Query Management
          fetchSavedQueries: async () => {
            try {
              const response = await fetch('/api/admin/db/saved-queries');
              const result = await response.json();
              if (result.success) {
                set({ savedQueries: result.queries });
              }
            } catch (error) {
              console.error('Failed to fetch saved queries:', error);
            }
          },
          
          saveQuery: async (name, query, description, tags) => {
            try {
              const response = await fetch('/api/admin/db/saved-queries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, query, description, tags }),
              });
              const result = await response.json();
              if (result.success) {
                get().actions.fetchSavedQueries();
              }
            } catch (error) {
              console.error('Failed to save query:', error);
            }
          },
          
          deleteSavedQuery: async (id) => {
            try {
              await fetch(`/api/admin/db/saved-queries/${id}`, { method: 'DELETE' });
              set((state) => ({
                savedQueries: state.savedQueries.filter(q => q.id !== id),
              }));
            } catch (error) {
              console.error('Failed to delete saved query:', error);
            }
          },
          
          toggleFavorite: async (id) => {
            try {
              await fetch(`/api/admin/db/saved-queries/${id}/favorite`, { method: 'POST' });
              set((state) => ({
                savedQueries: state.savedQueries.map(q =>
                  q.id === id ? { ...q, isFavorite: !q.isFavorite } : q
                ),
              }));
            } catch (error) {
              console.error('Failed to toggle favorite:', error);
            }
          },
          
          clearHistory: () => {
            set({ queryHistory: [] });
          },
          
          // Backup
          fetchBackups: async () => {
            set({ isLoadingBackups: true });
            try {
              const response = await fetch('/api/admin/db/backup');
              const result = await response.json();
              if (result.success) {
                set({ backups: result.backups });
              }
            } catch (error) {
              console.error('Failed to fetch backups:', error);
            } finally {
              set({ isLoadingBackups: false });
            }
          },
          
          createBackup: async (name, type = 'full') => {
            try {
              const response = await fetch('/api/admin/db/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, type }),
              });
              const result = await response.json();
              if (result.success) {
                get().actions.fetchBackups();
              }
              return result;
            } catch (error) {
              console.error('Failed to create backup:', error);
              throw error;
            }
          },
          
          deleteBackup: async (id) => {
            try {
              await fetch(`/api/admin/db/backup/${id}`, { method: 'DELETE' });
              set((state) => ({
                backups: state.backups.filter(b => b.id !== id),
              }));
            } catch (error) {
              console.error('Failed to delete backup:', error);
            }
          },
          
          restoreBackup: async (id) => {
            try {
              const response = await fetch(`/api/admin/db/backup/${id}/restore`, {
                method: 'POST',
              });
              const result = await response.json();
              return result;
            } catch (error) {
              console.error('Failed to restore backup:', error);
              throw error;
            }
          },
          
          // Audit Logs
          fetchAuditLogs: async (limit = 100, offset = 0) => {
            set({ isLoadingAuditLogs: true });
            try {
              const response = await fetch(`/api/admin/db/audit-logs?limit=${limit}&offset=${offset}`);
              const result = await response.json();
              if (result.success) {
                set({ auditLogs: result.logs });
              }
            } catch (error) {
              console.error('Failed to fetch audit logs:', error);
            } finally {
              set({ isLoadingAuditLogs: false });
            }
          },
          
          // Metrics
          fetchMetrics: async () => {
            try {
              const response = await fetch('/api/admin/db/metrics');
              const result = await response.json();
              if (result.success) {
                set({ metrics: result.metrics });
              }
            } catch (error) {
              console.error('Failed to fetch metrics:', error);
            }
          },
          
          // Utility
          checkConnection: async () => {
            set({ connectionStatus: 'checking' });
            try {
              const response = await fetch('/api/admin/db/health');
              const result = await response.json();
              set({ connectionStatus: result.success ? 'connected' : 'disconnected' });
              return result.success;
            } catch (error) {
              set({ connectionStatus: 'disconnected' });
              return false;
            }
          },
        },
      }),
      {
        name: 'database-store',
        partialize: (state) => ({
          tabs: state.tabs,
          queryHistory: state.queryHistory.slice(0, 50),
        }),
      }
    ),
    { name: 'DatabaseStore' }
  )
);
