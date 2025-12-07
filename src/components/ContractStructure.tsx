import React, { useState } from 'react';
import type { ContractSpec, ContractVariable } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Pencil, Check, X } from 'lucide-react';

interface ContractStructureProps {
  spec: ContractSpec | null;
  onItemClick?: (kind: string, id: string) => void;
  onVariableUpdate?: (variableId: string, updates: Partial<ContractVariable>) => void;
}

const ContractStructure: React.FC<ContractStructureProps> = ({ spec, onItemClick, onVariableUpdate }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    metadata: true,
    variables: true,
    methods: true,
    events: true,
    permissions: true,
  });
  const [editingVariableId, setEditingVariableId] = useState<string | null>(null);
  const [editInitialValue, setEditInitialValue] = useState<string>('');

  const toggleSection = (section: string) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleStartEdit = (variable: ContractVariable) => {
    setEditingVariableId(variable.id);
    const displayValue = variable.initialValue !== undefined
      ? (typeof variable.initialValue === 'object' ? JSON.stringify(variable.initialValue) : String(variable.initialValue))
      : '';
    setEditInitialValue(displayValue);
  };

  const handleSaveEdit = (variableId: string) => {
    if (!onVariableUpdate) return;
    
    const updates: Partial<ContractVariable> = {};

    const trimmed = editInitialValue.trim();
    if (trimmed === '') {
      updates.initialValue = undefined;
    } else {
      try {
        const parsed = JSON.parse(trimmed);
        updates.initialValue = parsed;
      } catch {
        // For non-JSON inputs (e.g., hex strings like 0x...), keep the raw string
        updates.initialValue = trimmed;
      }
    }
    
    onVariableUpdate(variableId, updates);
    setEditingVariableId(null);
    setEditInitialValue('');
  };

  const handleCancelEdit = () => {
    setEditingVariableId(null);
    setEditInitialValue('');
  };

  if (!spec) {
    return (
      <Card className="flex items-center justify-center h-full text-muted-foreground text-center p-10">
        <p>No contract structure available yet.</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden rounded-2xl border-none shadow-none bg-card">
      <CardHeader className="pb-4 border-b border-border rounded-t-2xl">
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
                    {spec.variables.map((variable) => {
                      const isEditing = editingVariableId === variable.id;
                      return (
                        <div
                          key={variable.id}
                          className="p-2.5 mb-1 rounded-md transition-all border border-transparent hover:bg-primary/10 hover:border-primary/30"
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              {/* Variable Name (read-only) */}
                              <div className="font-semibold text-sm text-foreground mb-1 break-words">
                                {variable.name}
                              </div>

                              {/* Variable Type (read-only) with controls aligned inline */}
                              <div className="text-xs text-muted-foreground mt-0.5 break-words">
                                {variable.type}
                              </div>

                              {/* Initial Value (editable) */}
                              {isEditing ? (
                                <Input
                                  value={editInitialValue}
                                  onChange={(e) => setEditInitialValue(e.target.value)}
                                  className="h-6 text-xs mt-1"
                                  placeholder="Enter value (JSON, number, string, or boolean)"
                                />
                              ) : (
                                <div className="text-xs text-muted-foreground mt-0.5 break-all break-words">
                                  {variable.initialValue !== undefined ? (
                                    <> = {typeof variable.initialValue === 'object' ? JSON.stringify(variable.initialValue) : String(variable.initialValue)}</>
                                  ) : (
                                    <span className="text-muted-foreground/50 italic">No initial value</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-1">
                              {!isEditing ? (
                                <button
                                  className="p-1 rounded hover:bg-accent/60 text-muted-foreground"
                                  onClick={() => handleStartEdit(variable)}
                                  aria-label={`Edit ${variable.name}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              ) : (
                                <>
                                  <button
                                    className="p-1 rounded hover:bg-primary/20 text-primary"
                                    onClick={() => handleSaveEdit(variable.id)}
                                    aria-label="Save"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    className="p-1 rounded hover:bg-destructive/10 text-destructive"
                                    onClick={handleCancelEdit}
                                    aria-label="Cancel"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                                ? 'bg-primary/20 text-primary border-primary/30'
                                : method.visibility === 'private'
                                ? 'bg-destructive/20 text-destructive border-destructive/30'
                                : 'bg-[#B8A082]/20 text-[#B8A082] border-[#B8A082]/30'
                            }`}
                          >
                            {method.visibility}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 break-words break-all">
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
                        <div className="font-semibold text-sm text-foreground mb-1 break-words">{event.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 break-words break-all">
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
                        <div className="font-semibold text-sm text-foreground mb-1 flex items-center gap-2">
                          {permission.name || permission.role || `Permission ${permission.id}`}
                          {permission.role && (
                            <Badge
                              variant="outline"
                              className="text-xs uppercase bg-[#B8A082]/20 text-[#B8A082] border-[#B8A082]/30"
                            >
                              {permission.role}
                            </Badge>
                          )}
                        </div>
                        {permission.methods && permission.methods.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Methods: {permission.methods.join(', ')}
                          </div>
                        )}
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

