'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
  NodeProps,
  BackgroundVariant,
  EdgeProps,
  getBezierPath,
  BaseEdge,
} from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ZoomIn, ZoomOut, Maximize2, Download, RefreshCw, Table2, Key, Link2, Loader2, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
}

interface TableInfo {
  name: string;
  type: 'table' | 'view';
  rowCount: number;
  columns: ColumnInfo[];
}

interface PrismaRelation {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: string;
}

interface TableNodeData {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
  type: string;
  highlightedColumns?: string[];
  isHighlighted?: boolean;
}

// Custom Table Node Component
function TableNode({ data }: NodeProps) {
  const tableData = data as TableNodeData;

  if (!tableData) {
    return <div className="p-4 bg-red-100">No data</div>;
  }

  const { name, columns, rowCount, type, highlightedColumns = [], isHighlighted } = tableData;

  return (
    <Card className={cn(
      "min-w-[200px] shadow-lg border-2 transition-all duration-300",
      isHighlighted && "ring-4 ring-blue-400 ring-opacity-75 scale-105 shadow-xl border-blue-500"
    )}>
      {/* Header */}
      <div className={cn(
        "px-3 py-2 flex items-center justify-between rounded-t-lg transition-colors duration-300",
        isHighlighted ? "bg-blue-500 text-white" : "bg-primary text-primary-foreground"
      )}>
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4" />
          <span className="font-semibold text-sm">{name}</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {rowCount?.toLocaleString()}
        </Badge>
      </div>

      {/* Columns */}
      <div className="divide-y max-h-64 overflow-y-auto">
        {columns?.map((col: ColumnInfo, idx: number) => {
          const isColumnHighlighted = highlightedColumns.includes(col.name);
          
          return (
            <div
              key={col.name}
              className={cn(
                "px-3 py-1.5 flex items-center justify-between text-xs relative transition-all duration-300",
                isColumnHighlighted 
                  ? "bg-blue-100 dark:bg-blue-900/50 ring-1 ring-blue-400" 
                  : "hover:bg-muted/50"
              )}
            >
              {/* Left Handle for incoming edges */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${col.name}-left`}
                className={cn(
                  "w-2 h-2 transition-colors duration-300",
                  isColumnHighlighted ? "bg-blue-500" : "bg-muted-foreground"
                )}
                style={{ top: 'auto' }}
              />

              <div className="flex items-center gap-2">
                {col.primaryKey && (
                  <Key className="h-3 w-3 text-yellow-500" />
                )}
                {col.foreignKey && (
                  <Link2 className={cn(
                    "h-3 w-3",
                    isColumnHighlighted ? "text-blue-600" : "text-blue-500"
                  )} />
                )}
                <span className={cn(
                  "font-mono",
                  isColumnHighlighted && "font-bold text-blue-700 dark:text-blue-300"
                )}>{col.name}</span>
              </div>

              <div className="flex items-center gap-1">
                <span className={cn(
                  "text-xs",
                  isColumnHighlighted ? "text-blue-600" : "text-muted-foreground"
                )}>{col.type}</span>
              </div>

              {/* Right Handle for outgoing edges */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${col.name}-right`}
                className={cn(
                  "w-2 h-2 transition-colors duration-300",
                  isColumnHighlighted ? "bg-blue-500" : "bg-muted-foreground"
                )}
                style={{ top: 'auto' }}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// Custom Edge Component
function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isHighlighted = data?.isHighlighted;

  return (
    <>
      {/* Invisible wider path for easier hover */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={20}
        stroke="transparent"
        style={{ cursor: 'pointer' }}
      />
      {/* Visible path */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={isHighlighted ? '#2563eb' : '#3b82f6'}
        strokeWidth={isHighlighted ? 4 : 2}
        strokeDasharray={isHighlighted ? undefined : undefined}
        className="transition-all duration-300"
        markerEnd={markerEnd}
        style={{ cursor: 'pointer' }}
      />
      {/* Glow effect when highlighted */}
      {isHighlighted && (
        <path
          d={edgePath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={8}
          strokeOpacity={0.3}
          className="animate-pulse"
        />
      )}
    </>
  );
}

const nodeTypes = {
  table: TableNode,
};

const edgeTypes = {
  custom: RelationEdge,
};

interface SchemaVisualizerProps {
  tables?: TableInfo[];
}

export function SchemaVisualizer({ tables: propTables }: SchemaVisualizerProps) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [prismaRelations, setPrismaRelations] = useState<PrismaRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  // Fetch tables and Prisma relations
  const fetchTables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tablesResponse = await fetch('/api/admin/db/tables');
      const tablesResult = await tablesResponse.json();
      
      const relationsResponse = await fetch('/api/admin/db/schema');
      const relationsResult = await relationsResponse.json();
      
      if (tablesResult.success && tablesResult.tables) {
        setTables(tablesResult.tables);
      } else {
        setError(tablesResult.error || 'Failed to fetch tables');
      }
      
      if (relationsResult.success && relationsResult.relations) {
        setPrismaRelations(relationsResult.relations);
      }
    } catch (err) {
      console.error('Schema Visualizer - Error:', err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    if (propTables && propTables.length > 0) {
      setTables(propTables);
      setLoading(false);
    }
  }, [propTables]);

  // Parse edge ID to get relation info
  const parseEdgeId = (edgeId: string): { fromTable: string; fromColumn: string; toTable: string; toColumn: string } | null => {
    const relation = prismaRelations.find(r => 
      edgeId.startsWith(`${r.fromTable}.${r.fromColumn}->${r.toTable}.${r.toColumn}`)
    );
    return relation ? {
      fromTable: relation.fromTable,
      fromColumn: relation.fromColumn,
      toTable: relation.toTable,
      toColumn: relation.toColumn,
    } : null;
  };

  // Update nodes when hoveredEdge changes
  useEffect(() => {
    if (nodes.length === 0) return;

    const relation = hoveredEdge ? parseEdgeId(hoveredEdge) : null;

    const updatedNodes = nodes.map(node => {
      const nodeData = node.data as TableNodeData;
      
      if (relation) {
        const isSource = node.id === relation.fromTable;
        const isTarget = node.id === relation.toTable;
        const isHighlighted = isSource || isTarget;
        
        const highlightedColumns: string[] = [];
        if (isSource) highlightedColumns.push(relation.fromColumn);
        if (isTarget) highlightedColumns.push(relation.toColumn);

        return {
          ...node,
          data: {
            ...nodeData,
            isHighlighted,
            highlightedColumns,
          },
        };
      }

      return {
        ...node,
        data: {
          ...nodeData,
          isHighlighted: false,
          highlightedColumns: [],
        },
      };
    });

    setNodes(updatedNodes);
  }, [hoveredEdge, prismaRelations, setNodes]);

  // Update edges when hoveredEdge changes
  useEffect(() => {
    if (edges.length === 0) return;

    const updatedEdges = edges.map(edge => ({
      ...edge,
      data: {
        ...edge.data,
        isHighlighted: edge.id === hoveredEdge,
      },
      style: {
        stroke: edge.id === hoveredEdge ? '#2563eb' : '#3b82f6',
        strokeWidth: edge.id === hoveredEdge ? 4 : 2,
      },
    }));

    setEdges(updatedEdges);
  }, [hoveredEdge, setEdges]);

  // Generate nodes and edges from tables and Prisma relations
  useEffect(() => {
    if (tables.length === 0) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const addedEdges = new Set<string>();

    const cols = Math.ceil(Math.sqrt(tables.length));
    const nodeWidth = 250;
    const nodeHeight = 200;
    const padding = 150; // Increased padding for more spacing between tables

    const tableNames = new Set(tables.map(t => t.name));

    tables.forEach((table, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      const columnsWithFK = table.columns?.map(col => {
        const relation = prismaRelations.find(
          r => r.fromTable === table.name && r.fromColumn === col.name
        );
        if (relation) {
          return { ...col, foreignKey: { table: relation.toTable, column: relation.toColumn } };
        }
        return col;
      }) || [];

      newNodes.push({
        id: table.name,
        type: 'table',
        position: {
          x: col * (nodeWidth + padding),
          y: row * (nodeHeight + padding),
        },
        data: {
          name: table.name,
          columns: columnsWithFK,
          rowCount: table.rowCount,
          type: table.type,
          isHighlighted: false,
          highlightedColumns: [],
        },
      });
    });

    prismaRelations.forEach((relation) => {
      const edgeId = `${relation.fromTable}.${relation.fromColumn}->${relation.toTable}.${relation.toColumn}`;
      
      if (tableNames.has(relation.fromTable) && tableNames.has(relation.toTable) && !addedEdges.has(edgeId)) {
        addedEdges.add(edgeId);
        
        newEdges.push({
          id: edgeId,
          source: relation.fromTable,
          sourceHandle: `${relation.fromColumn}-right`,
          target: relation.toTable,
          targetHandle: `${relation.toColumn}-left`,
          type: 'custom',
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#3b82f6',
          },
          data: {
            isHighlighted: false,
            fromColumn: relation.fromColumn,
            toColumn: relation.toColumn,
          },
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [tables, prismaRelations, setNodes, setEdges]);

  const handleEdgeMouseEnter = useCallback((event: React.MouseEvent, edge: Edge) => {
    setHoveredEdge(edge.id);
  }, []);

  const handleEdgeMouseLeave = useCallback((event: React.MouseEvent, edge: Edge) => {
    setHoveredEdge(null);
  }, []);

  const handleExport = async () => {
    toast.info('Export feature coming soon');
  };

  const handleAutoLayout = () => {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const nodeWidth = 250;
    const nodeHeight = 200;
    const padding = 150; // Match the padding used in initial layout

    const updatedNodes = nodes.map((node, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      return {
        ...node,
        position: {
          x: col * (nodeWidth + padding),
          y: row * (nodeHeight + padding),
        },
      };
    });

    setNodes(updatedNodes);
  };

  if (loading) {
    return (
      <div className="h-full min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading schema...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full min-h-[500px] flex items-center justify-center">
        <div className="text-center text-destructive">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4" />
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={fetchTables} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="h-full min-h-[500px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Table2 className="h-8 w-8 mx-auto mb-4 opacity-50" />
          <p>No tables found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-[500px] flex flex-col">
      {/* Toolbar */}
      <div className="border-b p-2 flex items-center gap-2 bg-card shrink-0">
        <Button variant="outline" size="sm" onClick={fetchTables}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={handleAutoLayout}>
          <Maximize2 className="h-4 w-4 mr-1" /> Auto Layout
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
        <div className="flex-1" />
        <Badge variant="outline">{tables.length} tables</Badge>
        <Badge variant="outline">{edges.length} relations</Badge>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 w-full" style={{ minHeight: '400px', height: 'calc(100% - 80px)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeMouseEnter={handleEdgeMouseEnter}
          onEdgeMouseLeave={handleEdgeMouseLeave}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls showZoom showFitView showInteractive />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="border-t p-2 bg-muted/30 flex items-center gap-4 text-xs shrink-0">
        <div className="flex items-center gap-1">
          <Key className="h-3 w-3 text-yellow-500" />
          <span>Primary Key</span>
        </div>
        <div className="flex items-center gap-1">
          <Link2 className="h-3 w-3 text-blue-500" />
          <span>Foreign Key</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-blue-500" />
          <span>Relation</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-blue-100 border border-blue-400" />
          <span>Hovered Column</span>
        </div>
      </div>
    </div>
  );
}

export default SchemaVisualizer;
