import React, { useMemo, useState, useCallback } from 'react';
import ReactFlow, { Background, Controls, Handle, Position } from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import './ContractFlowchart.css';
import type { ContractSpec, NeoStudioNodeData, ContractVariable } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Pencil } from 'lucide-react';

interface ContractFlowchartProps {
  spec: ContractSpec | null;
  onNodeSelect?: (nodeId: string) => void;
  onVariableUpdate?: (variableId: string, updates: Partial<ContractVariable>) => void;
}

const ContractFlowchart: React.FC<ContractFlowchartProps> = ({ spec, onNodeSelect, onVariableUpdate }) => {
  const [editingVariable, setEditingVariable] = useState<ContractVariable | null>(null);
  const [editForm, setEditForm] = useState<{ initialValue: string }>({
    initialValue: '',
  });
  const [highlightNodeId, setHighlightNodeId] = useState<string | null>(null);

  const startEditingVariable = useCallback((variableId: string) => {
    if (!spec) return;
    const variable = spec.variables.find(v => v.id === variableId);
    if (!variable) return;
    setEditingVariable(variable);
    setEditForm({
      initialValue: variable.initialValue !== undefined
        ? (typeof variable.initialValue === 'object' ? JSON.stringify(variable.initialValue) : String(variable.initialValue))
        : '',
    });
  }, [spec]);

  // Custom node component to display title and subtitle
  const CustomNode: React.FC<{ data: NeoStudioNodeData }> = ({ data }) => {
    const handleStyle = { opacity: 0, width: 0, height: 0, pointerEvents: 'none' as const };
    const showEdit = data.kind === 'variable' && data.onEditVariable;
    return (
      <div className="relative px-3 py-2 max-w-[220px]">
        <Handle type="target" position={Position.Top} style={handleStyle} />
        <div className="text-sm font-semibold text-foreground break-words pr-6">{data.title}</div>
        {data.subtitle && (
          <div className="text-xs text-muted-foreground mt-1 break-words break-all">{data.subtitle}</div>
        )}
        {showEdit && (
          <button
            className="absolute right-1 top-1 p-1 rounded hover:bg-accent/60 text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              data.onEditVariable?.(data.refId);
            }}
            aria-label="Edit variable"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        <Handle type="source" position={Position.Bottom} style={handleStyle} />
      </div>
    );
  };

  const nodeTypes = {
    default: CustomNode,
  };

  const { nodes, edges } = useMemo(() => {
    if (!spec) {
      return { nodes: [], edges: [] };
    }

    const nodes: Node<NeoStudioNodeData>[] = [];
    const edges: Edge[] = [];

    // Layout configuration keeps spacing consistent between sections.
    const layout = {
      baseX: 120,
      columnWidth: 260,
      rowHeight: 170,
      sectionGap: 120,
      columns: 3,
    };

    const centerX = layout.baseX + ((layout.columns - 1) * layout.columnWidth) / 2;
    let yPos = 40;

    // Metadata node
    nodes.push({
      id: 'metadata',
      type: 'default',
      position: { x: centerX, y: yPos },
      data: {
        kind: 'metadata',
        refId: spec.id,
        title: spec.metadata.name,
        subtitle: spec.metadata.description || 'Contract Metadata',
      },
      className: 'bg-gradient-to-br from-primary/20 to-accent/20 border-primary font-semibold',
    });
    yPos += layout.rowHeight;

    // Helper to format initial value for display
    const formatInitialValue = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(value);
    };

    // Shared grid placer so each section uses the same spacing rules.
    const placeSection = <T,>(
      items: T[],
      buildNode: (item: T, idx: number, position: { x: number; y: number }) => Node<NeoStudioNodeData>,
      buildEdge: (item: T) => Edge | null
    ) => {
      items.forEach((item, idx) => {
        const col = idx % layout.columns;
        const row = Math.floor(idx / layout.columns);
        const x = layout.baseX + col * layout.columnWidth;
        const y = yPos + row * layout.rowHeight;
        nodes.push(buildNode(item, idx, { x, y }));
        const edge = buildEdge(item);
        if (edge) edges.push(edge);
      });

      const rowsUsed = Math.max(1, Math.ceil(items.length / layout.columns));
      yPos += rowsUsed * layout.rowHeight + layout.sectionGap;
    };

    // Variables
    placeSection(
      spec.variables,
      (variable, _idx, position) => {
        const initialValueStr = variable.initialValue !== undefined
          ? ` = ${formatInitialValue(variable.initialValue)}`
          : '';
        return {
          id: `var-${variable.id}`,
          type: 'default',
          position,
          data: {
            kind: 'variable',
            refId: variable.id,
            title: variable.name,
            subtitle: `${variable.type}${initialValueStr}`,
            onEditVariable: startEditingVariable,
          },
          className: 'bg-primary/10 border-primary/40',
        };
      },
      (variable) => ({
        id: `edge-metadata-var-${variable.id}`,
        source: 'metadata',
        target: `var-${variable.id}`,
        type: 'smoothstep',
      })
    );

    // Methods
    placeSection(
      spec.methods,
      (method, _idx, position) => ({
        id: `method-${method.id}`,
        type: 'default',
        position,
        data: {
          kind: 'method',
          refId: method.id,
          title: method.name,
          subtitle: `${method.visibility}(${method.params.map(p => `${p.name}: ${p.type}`).join(', ')})${method.returns ? ` → ${method.returns}` : ''}`,
        },
        className: `bg-accent/10 border-accent/40 ${
          method.visibility === 'public' ? 'border-primary/50 bg-primary/10' :
          method.visibility === 'private' ? 'border-destructive/50 bg-destructive/10' :
          method.visibility === 'admin' ? 'border-[#B8A082]/50 bg-[#B8A082]/10' : ''
        }`,
      }),
      (method) => ({
        id: `edge-metadata-method-${method.id}`,
        source: 'metadata',
        target: `method-${method.id}`,
        type: 'smoothstep',
      })
    );

    // Events
    placeSection(
      spec.events,
      (event, _idx, position) => ({
        id: `event-${event.id}`,
        type: 'default',
        position,
        data: {
          kind: 'event',
          refId: event.id,
          title: event.name,
          subtitle: `(${event.params.map(p => `${p.name}: ${p.type}`).join(', ')})`,
        },
        className: 'bg-[#9A8FA3]/10 border-[#9A8FA3]/40',
      }),
      (event) => ({
        id: `edge-metadata-event-${event.id}`,
        source: 'metadata',
        target: `event-${event.id}`,
        type: 'smoothstep',
      })
    );

    return { nodes, edges };
  }, [spec, startEditingVariable]);

  const decoratedEdges = useMemo(() => {
    return edges.map(edge => {
      const isConnected = highlightNodeId
        ? edge.source === highlightNodeId || edge.target === highlightNodeId
        : false;
      return {
        ...edge,
        animated: isConnected,
        className: isConnected ? 'edge-highlight' : 'edge-muted',
      };
    });
  }, [edges, highlightNodeId]);

  const onNodeClick = (_: React.MouseEvent, node: Node<NeoStudioNodeData>) => {
    setHighlightNodeId(node.id);
    onNodeSelect?.(node.data.refId);
  };

  const onNodeDoubleClick = (_: React.MouseEvent, node: Node<NeoStudioNodeData>) => {
    if (node.data.kind === 'variable' && onVariableUpdate) {
      startEditingVariable(node.data.refId);
    }
  };

  const handleSaveVariable = () => {
    if (!editingVariable || !onVariableUpdate) return;

    const updates: Partial<ContractVariable> = {};

    const trimmedValue = editForm.initialValue.trim();
    if (trimmedValue === '') {
      updates.initialValue = undefined;
    } else {
      try {
        const parsed = JSON.parse(trimmedValue);
        updates.initialValue = parsed;
      } catch {
        // For non-JSON inputs (e.g., hex strings like 0x...), keep the raw string
        updates.initialValue = trimmedValue;
      }
    }

    onVariableUpdate(editingVariable.id, updates);
    setEditingVariable(null);
  };

  const handleCancelEdit = () => {
    setEditingVariable(null);
    setEditForm({ initialValue: '' });
  };

  if (!spec) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-center p-10">
        <p>No contract specification yet. Start by describing your contract in the chat!</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-full bg-popover rounded-xl overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={decoratedEdges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onPaneClick={() => setHighlightNodeId(null)}
          fitView
          fitViewOptions={{ padding: 0.5 }}
          className="bg-popover"
          nodesConnectable={false}
          // elementsSelectable={false}
          nodesDraggable={false}
          selectNodesOnDrag={false}
          panOnDrag={true}
        >
          <Background 
            gap={20}
            size={1}
          />
          <Controls
            className="[&_button]:bg-card [&_button]:border [&_button]:border-border [&_button]:text-foreground [&_button]:rounded-md [&_button]:shadow-xs hover:[&_button]:bg-accent hover:[&_button]:text-accent-foreground [&_button]:transition-all [&_button]:disabled:opacity-50"
            showInteractive={false}
          />
        </ReactFlow>
      </div>

      <Dialog open={editingVariable !== null} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Variable</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingVariable && (
              <>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Name</div>
                  <div className="text-sm font-medium">{editingVariable.name}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Type</div>
                  <div className="text-sm font-medium">{editingVariable.type}</div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Initial Value</label>
              <Input
                value={editForm.initialValue}
                onChange={(e) => setEditForm(prev => ({ ...prev, initialValue: e.target.value }))}
                placeholder="Initial value (JSON, number, string, or boolean)"
              />
              <p className="text-xs text-muted-foreground">
                Enter a value or leave empty. JSON objects, numbers, booleans, and strings are supported.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveVariable}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContractFlowchart;

