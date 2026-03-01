'use client';

import { useCallback, useEffect, useState } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ZoomIn, ZoomOut, Maximize2, Download, RefreshCw, Table2, Key, Link2, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

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

// Custom Table Node Component
function TableNode({ data }: NodeProps) {
  const { name, columns, rowCount, type } = data as {
    name: string;
    columns: ColumnInfo[];
    rowCount: number;
    type: string;
  };

  return (
    <Card className="min-w-[200px] shadow-lg border-2">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-3 py-2 flex items-center justify-between rounded-t-lg">
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4" />
          <span className="font-semibold text-sm">{name}</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {rowCount?.toLocaleString()}
        </Badge>
      </div>

      {/* Columns */}
      <div className="divide-y">
        {columns?.map((col: ColumnInfo, idx: number) => (
          <div
            key={col.name}
            className="px-3 py-1.5 flex items-center justify-between text-xs hover:bg-muted/50 relative"
          >
            {/* Left Handle for incoming edges */}
            <Handle
              type="target"
              position={Position.Left}
              id={`${col.name}-left`}
              className="w-2 h-2 bg-muted-foreground"
              style={{ top: 'auto' }}
            />

            <div className="flex items-center gap-2">
              {col.primaryKey && (
                <Key className="h-3 w-3 text-yellow-500" />
              )}
              {col.foreignKey && (
                <Link2 className="h-3 w-3 text-blue-500" />
              )}
              <span className="font-mono">{col.name}</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">{col.type}</span>
              {col.nullable && (
                <span className="text-muted-foreground/50">?</span>
              )}
            </div>

            {/* Right Handle for outgoing edges */}
            <Handle
              type="source"
              position={Position.Right}
              id={`${col.name}-right`}
              className="w-2 h-2 bg-muted-foreground"
              style={{ top: 'auto' }}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

const nodeTypes = {
  table: TableNode,
};

interface SchemaVisualizerProps {
  tables?: TableInfo[];
}

export function SchemaVisualizer({ tables: propTables }: SchemaVisualizerProps) {
  const [tables, setTables] = useState<TableInfo[]>(propTables || []);
  const [loading, setLoading] = useState(!propTables);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Fetch tables
  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/db/tables');
      const result = await response.json();
      if (result.success) {
        setTables(result.tables);
      }
    } catch (error) {
      toast.error('Failed to fetch tables');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!propTables) {
      fetchTables();
    }
  }, [propTables, fetchTables]);

  // Generate nodes and edges from tables
  useEffect(() => {
    if (tables.length === 0) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Calculate grid layout
    const cols = Math.ceil(Math.sqrt(tables.length));
    const nodeWidth = 250;
    const nodeHeight = 200;
    const padding = 50;

    tables.forEach((table, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      newNodes.push({
        id: table.name,
        type: 'table',
        position: {
          x: col * (nodeWidth + padding),
          y: row * (nodeHeight + padding),
        },
        data: {
          name: table.name,
          columns: table.columns || [],
          rowCount: table.rowCount,
          type: table.type,
        },
      });

      // Create edges for foreign keys
      table.columns?.forEach((col) => {
        if (col.foreignKey) {
          const edgeId = `${table.name}.${col.name}->${col.foreignKey.table}.${col.foreignKey.column}`;
          
          // Check if edge already exists
          if (!newEdges.find(e => e.id === edgeId)) {
            newEdges.push({
              id: edgeId,
              source: table.name,
              sourceHandle: `${col.name}-right`,
              target: col.foreignKey.table,
              targetHandle: `${col.foreignKey.column}-left`,
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#3b82f6', strokeWidth: 2 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#3b82f6',
              },
              label: col.name,
              labelStyle: { fontSize: 10 },
              labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
            });
          }
        }
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [tables, setNodes, setEdges]);

  // Export as image
  const handleExport = async () => {
    toast.info('Export feature coming soon');
  };

  // Auto layout
  const handleAutoLayout = () => {
    // Simple grid layout
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const nodeWidth = 250;
    const nodeHeight = 200;
    const padding = 50;

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
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b p-2 flex items-center gap-2 bg-card">
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
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            type: 'smoothstep',
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls showZoom showFitView showInteractive />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="border-t p-2 bg-muted/30 flex items-center gap-4 text-xs">
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
      </div>
    </div>
  );
}

export default SchemaVisualizer;
