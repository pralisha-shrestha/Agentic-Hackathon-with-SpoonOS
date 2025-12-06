import React, { useState } from 'react';
import type { ContractSpec } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

interface ContractStructureProps {
  spec: ContractSpec | null;
  onItemClick?: (kind: string, id: string) => void;
}

const ContractStructure: React.FC<ContractStructureProps> = ({ spec, onItemClick }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    metadata: true,
    variables: true,
    methods: true,
    events: true,
    permissions: true,
  });

  const toggleSection = (section: string) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!spec) {
    return (
      <Card className="flex items-center justify-center h-full text-muted-foreground text-center p-10">
        <p>No contract structure available yet.</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader className="pb-4 border-b border-border">
        <CardTitle>Contract Structure</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full">
          <div className="p-2">
            {/* Metadata */}
            <div className="mb-2">
              <div
                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-md transition-colors hover:bg-accent/50 select-none"
                onClick={() => toggleSection('metadata')}
              >
                <span className="text-xs text-muted-foreground w-4 text-center">{expanded.metadata ? '▼' : '▶'}</span>
                <span className="font-semibold text-sm text-foreground">Metadata</span>
              </div>
              {expanded.metadata && (
                <div className="ml-6 mt-1">
                  <div
                    className="p-2.5 mb-1 rounded-md cursor-pointer transition-all border border-transparent hover:bg-primary/10 hover:border-primary/30"
                    onClick={() => onItemClick?.('metadata', spec.id)}
                  >
                    <div className="font-semibold text-sm text-foreground mb-1">{spec.metadata.name}</div>
                    {spec.metadata.symbol && <div className="text-xs text-muted-foreground mt-0.5">Symbol: {spec.metadata.symbol}</div>}
                    {spec.metadata.description && <div className="text-xs text-muted-foreground mt-0.5">{spec.metadata.description}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* Variables */}
            {spec.variables.length > 0 && (
              <div className="mb-2">
                <div
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-md transition-colors hover:bg-accent/50 select-none"
                  onClick={() => toggleSection('variables')}
                >
                  <span className="text-xs text-muted-foreground w-4 text-center">{expanded.variables ? '▼' : '▶'}</span>
                  <span className="font-semibold text-sm text-foreground">Variables ({spec.variables.length})</span>
                </div>
                {expanded.variables && (
                  <div className="ml-6 mt-1">
                    {spec.variables.map((variable) => (
                      <div
                        key={variable.id}
                        className="p-2.5 mb-1 rounded-md cursor-pointer transition-all border border-transparent hover:bg-primary/10 hover:border-primary/30"
                        onClick={() => onItemClick?.('variable', variable.id)}
                      >
                        <div className="font-semibold text-sm text-foreground mb-1">{variable.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{variable.type}</div>
                        {variable.initialValue && <div className="text-xs text-muted-foreground mt-0.5">= {variable.initialValue}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Methods */}
            {spec.methods.length > 0 && (
              <div className="mb-2">
                <div
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-md transition-colors hover:bg-accent/50 select-none"
                  onClick={() => toggleSection('methods')}
                >
                  <span className="text-xs text-muted-foreground w-4 text-center">{expanded.methods ? '▼' : '▶'}</span>
                  <span className="font-semibold text-sm text-foreground">Methods ({spec.methods.length})</span>
                </div>
                {expanded.methods && (
                  <div className="ml-6 mt-1">
                    {spec.methods.map((method) => (
                      <div
                        key={method.id}
                        className="p-2.5 mb-1 rounded-md cursor-pointer transition-all border border-transparent hover:bg-primary/10 hover:border-primary/30"
                        onClick={() => onItemClick?.('method', method.id)}
                      >
                        <div className="font-semibold text-sm text-foreground mb-1 flex items-center gap-2">
                          {method.name}
                          <Badge
                            variant="outline"
                            className={`text-xs uppercase ${
                              method.visibility === 'public'
                                ? 'bg-green-500/20 text-green-500 border-green-500/30'
                                : method.visibility === 'private'
                                ? 'bg-destructive/20 text-destructive border-destructive/30'
                                : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                            }`}
                          >
                            {method.visibility}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          ({method.params.map(p => `${p.name}: ${p.type}`).join(', ')})
                          {method.returns && ` → ${method.returns}`}
                        </div>
                        {method.description && <div className="text-xs text-muted-foreground mt-0.5">{method.description}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Events */}
            {spec.events.length > 0 && (
              <div className="mb-2">
                <div
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-md transition-colors hover:bg-accent/50 select-none"
                  onClick={() => toggleSection('events')}
                >
                  <span className="text-xs text-muted-foreground w-4 text-center">{expanded.events ? '▼' : '▶'}</span>
                  <span className="font-semibold text-sm text-foreground">Events ({spec.events.length})</span>
                </div>
                {expanded.events && (
                  <div className="ml-6 mt-1">
                    {spec.events.map((event) => (
                      <div
                        key={event.id}
                        className="p-2.5 mb-1 rounded-md cursor-pointer transition-all border border-transparent hover:bg-primary/10 hover:border-primary/30"
                        onClick={() => onItemClick?.('event', event.id)}
                      >
                        <div className="font-semibold text-sm text-foreground mb-1">{event.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          ({event.params.map(p => `${p.name}: ${p.type}`).join(', ')})
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Permissions */}
            {spec.permissions.length > 0 && (
              <div className="mb-2">
                <div
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-md transition-colors hover:bg-accent/50 select-none"
                  onClick={() => toggleSection('permissions')}
                >
                  <span className="text-xs text-muted-foreground w-4 text-center">{expanded.permissions ? '▼' : '▶'}</span>
                  <span className="font-semibold text-sm text-foreground">Permissions ({spec.permissions.length})</span>
                </div>
                {expanded.permissions && (
                  <div className="ml-6 mt-1">
                    {spec.permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="p-2.5 mb-1 rounded-md cursor-pointer transition-all border border-transparent hover:bg-primary/10 hover:border-primary/30"
                        onClick={() => onItemClick?.('permission', permission.id)}
                      >
                        <div className="font-semibold text-sm text-foreground mb-1">{permission.name}</div>
                        {permission.description && <div className="text-xs text-muted-foreground mt-0.5">{permission.description}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ContractStructure;

