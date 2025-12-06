import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, Handle, Position } from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import './ContractFlowchart.css';
import type { ContractSpec, NeoStudioNodeData } from '../types';

interface ContractFlowchartProps {
  spec: ContractSpec | null;
  onNodeSelect?: (nodeId: string) => void;
}

// Custom node component to display title and subtitle
const CustomNode: React.FC<{ data: NeoStudioNodeData }> = ({ data }) => {
  return (
    <div className="px-3 py-2">
      <Handle type="target" position={Position.Top} />
      <div className="text-sm font-semibold text-foreground">{data.title}</div>
      {data.subtitle && (
        <div className="text-xs text-muted-foreground mt-1">{data.subtitle}</div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const nodeTypes = {
  default: CustomNode,
};

const ContractFlowchart: React.FC<ContractFlowchartProps> = ({ spec, onNodeSelect }) => {
  const { nodes, edges } = useMemo(() => {
    if (!spec) {
      return { nodes: [], edges: [] };
    }

    const nodes: Node<NeoStudioNodeData>[] = [];
    const edges: Edge[] = [];
    let yPos = 50;
    const xSpacing = 250;
    const ySpacing = 120;

    // Metadata node
    nodes.push({
      id: 'metadata',
      type: 'default',
      position: { x: 400, y: yPos },
      data: {
        kind: 'metadata',
        refId: spec.id,
        title: spec.metadata.name,
        subtitle: spec.metadata.description || 'Contract Metadata',
      },
      className: 'bg-gradient-to-br from-primary/20 to-accent/20 border-primary font-semibold',
    });
    yPos += ySpacing;

    // Variables
    if (spec.variables.length > 0) {
      const varStartX = 200;
      spec.variables.forEach((variable, idx) => {
        const x = varStartX + (idx % 3) * xSpacing;
        const y = yPos + Math.floor(idx / 3) * ySpacing;
        nodes.push({
          id: `var-${variable.id}`,
          type: 'default',
          position: { x, y },
          data: {
            kind: 'variable',
            refId: variable.id,
            title: variable.name,
            subtitle: `${variable.type}${variable.initialValue ? ` = ${variable.initialValue}` : ''}`,
          },
          className: 'bg-primary/10 border-primary/40',
        });
        edges.push({
          id: `edge-metadata-var-${variable.id}`,
          source: 'metadata',
          target: `var-${variable.id}`,
          type: 'smoothstep',
        });
      });
      yPos += Math.ceil(spec.variables.length / 3) * ySpacing + 50;
    }

    // Methods
    if (spec.methods.length > 0) {
      const methodStartX = 200;
      spec.methods.forEach((method, idx) => {
        const x = methodStartX + (idx % 3) * xSpacing;
        const y = yPos + Math.floor(idx / 3) * ySpacing;
        nodes.push({
          id: `method-${method.id}`,
          type: 'default',
          position: { x, y },
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
        });
        edges.push({
          id: `edge-metadata-method-${method.id}`,
          source: 'metadata',
          target: `method-${method.id}`,
          type: 'smoothstep',
        });
      });
      yPos += Math.ceil(spec.methods.length / 3) * ySpacing + 50;
    }

    // Events
    if (spec.events.length > 0) {
      const eventStartX = 200;
      spec.events.forEach((event, idx) => {
        const x = eventStartX + (idx % 3) * xSpacing;
        const y = yPos + Math.floor(idx / 3) * ySpacing;
        nodes.push({
          id: `event-${event.id}`,
          type: 'default',
          position: { x, y },
          data: {
            kind: 'event',
            refId: event.id,
            title: event.name,
            subtitle: `(${event.params.map(p => `${p.name}: ${p.type}`).join(', ')})`,
          },
          className: 'bg-[#9A8FA3]/10 border-[#9A8FA3]/40',
        });
        edges.push({
          id: `edge-metadata-event-${event.id}`,
          source: 'metadata',
          target: `event-${event.id}`,
          type: 'smoothstep',
        });
      });
    }

    return { nodes, edges };
  }, [spec]);

  const onNodeClick = (_: React.MouseEvent, node: Node<NeoStudioNodeData>) => {
    if (onNodeSelect) {
      onNodeSelect(node.data.refId);
    }
  };

  if (!spec) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-center p-10">
        <p>No contract specification yet. Start by describing your contract in the chat!</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-popover rounded-xl overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        className="bg-popover"
        nodesConnectable={false}
        elementsSelectable={false}
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
  );
};

export default ContractFlowchart;

