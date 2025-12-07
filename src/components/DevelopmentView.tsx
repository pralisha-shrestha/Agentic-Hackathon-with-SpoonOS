import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, Workflow, FileText } from 'lucide-react';
import ChatPanel from './ChatPanel';
import ContractFlowchart from './ContractFlowchart';
import CodeEditor from './CodeEditor';
import ContractStructure from './ContractStructure';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import AppNav from './AppNav';
import { findLatestSpecFromMessages, isSpecIncomplete } from '../utils/specExtractor';
import type {
  ContractSpec,
  ContractCodeResponse,
  ChatMessage,
  ContractLanguage,
  SimulateDeployResponse,
  ContractVariable,
  PermissionRule,
} from '../types';

/**
 * Normalizes a contract spec to match backend schema requirements.
 * Specifically normalizes permissions to have required id and name fields.
 */
const normalizeSpecForBackend = (spec: ContractSpec): ContractSpec => {
  const normalizedPermissions: PermissionRule[] = spec.permissions.map((perm, index) => {
    // Ensure id is present
    const id = perm.id || `perm-${index + 1}`;
    
    // Ensure name is present - use role if available, otherwise use name, otherwise generate
    const name = perm.name || perm.role || `Permission ${index + 1}`;
    
    // Build description from available fields
    const descriptionParts: string[] = [];
    if (perm.description) {
      descriptionParts.push(perm.description);
    }
    if (perm.methods && perm.methods.length > 0) {
      descriptionParts.push(`Methods: ${perm.methods.join(', ')}`);
    }
    // Note: condition field is not part of backend schema, so we include it in description if present
    const condition = 'condition' in perm ? (perm as PermissionRule & { condition?: string }).condition : undefined;
    if (condition && condition !== 'any') {
      descriptionParts.push(`Condition: ${condition}`);
    }
    
    const description = descriptionParts.length > 0 ? descriptionParts.join('. ') : undefined;
    
    // Return normalized permission with only backend-supported fields
    return {
      id,
      name,
      ...(description && { description }),
    };
  });
  
  return {
    ...spec,
    permissions: normalizedPermissions,
  };
};

const DevelopmentView: React.FC = () => {
  const location = useLocation();
  const [conversationId, setConversationId] = useState<string | null>(
    location.state?.conversationId || null
  );
  const [currentSpec, setCurrentSpec] = useState<ContractSpec | null>(
    location.state?.spec || null
  );
  const [currentCode, setCurrentCode] = useState<string>('');
  const [language, setLanguage] = useState<ContractLanguage>('python');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
    location.state?.messages || []
  );
  const [viewMode, setViewMode] = useState<'flow' | 'code'>('flow');
  const [, setSelectedNodeId] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isSimulatingDeploy, setIsSimulatingDeploy] = useState(false);
  const [mobileActivePanel, setMobileActivePanel] = useState<'chat' | 'flow' | 'structure'>('flow');
  const lastGeneratedSpecIdRef = useRef<string | null>(null);
  const generateCodeRef = useRef<(() => Promise<void>) | null>(null);

  // Load conversation if conversationId is provided and we don't have data from location.state
  useEffect(() => {
    const loadConversation = async () => {
      // Only load if we have a conversationId but no data from navigation state
      const hasStateData = location.state?.spec || (location.state?.messages && location.state.messages.length > 0);
      
      if (conversationId && !hasStateData) {
        try {
          const response = await fetch(`/api/conversations/${conversationId}`);
          if (response.ok) {
            const data = await response.json();
            const conv = data.conversation;
            
            if (conv.spec && !currentSpec) {
              setCurrentSpec(conv.spec);
            }
            if (conv.messages && conv.messages.length > 0 && chatMessages.length === 0) {
              setChatMessages(conv.messages);
            }
            if (conv.code && !currentCode) {
              setCurrentCode(conv.code);
            }
            if (conv.language) {
              setLanguage(conv.language);
            }
          }
        } catch (error) {
          console.error('Error loading conversation:', error);
        }
      }
    };
    
    loadConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]); // Only depend on conversationId to load once

  // Save conversation helper
  const saveConversation = useCallback(async (specOverride?: ContractSpec | null) => {
    try {
      // Use the provided spec override, or fall back to currentSpec
      const specToSave = specOverride !== undefined ? specOverride : currentSpec;
      
      const title = specToSave?.metadata?.name || 'Untitled Contract';
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversationId || undefined,
          title,
          messages: chatMessages,
          spec: specToSave,
          code: currentCode,
          language,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (!conversationId && data.conversation?.id) {
          setConversationId(data.conversation.id);
        }
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }, [conversationId, currentSpec, chatMessages, currentCode, language]);

  // Get short name from spec or generate it (max 12 chars)
  const getShortName = (): string => {
    if (currentSpec?.metadata?.shortName) {
      return currentSpec.metadata.shortName;
    }
    if (currentSpec?.metadata?.name) {
      return currentSpec.metadata.name.length <= 25 
        ? currentSpec.metadata.name 
        : currentSpec.metadata.name.substring(0, 25);
    }
    return 'Project';
  };

  const generateCode = useCallback(async () => {
    if (!currentSpec) return;

    setIsGeneratingCode(true);
    try {
      const normalizedSpec = normalizeSpecForBackend(currentSpec);
      const response = await fetch('/api/contract/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          spec: normalizedSpec,
          conversationId: conversationId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate contract code');
      }

      const data: ContractCodeResponse = await response.json();
      setCurrentCode(data.code);
      setLanguage(data.language);
      
      // Save conversation after code generation
      setTimeout(() => saveConversation(), 500);
    } catch (error) {
      console.error('Error generating code:', error);
      setCurrentCode(`## Attempting to generate code (10 attempts): ${error instanceof Error ? error.message : 'Unknown error'} \n## Please wait a moment as the AI will try again.`);
    } finally {
      setIsGeneratingCode(false);
    }
  }, [currentSpec, conversationId, saveConversation]);

  // Keep ref updated with latest generateCode function
  useEffect(() => {
    generateCodeRef.current = generateCode;
  }, [generateCode]);

  // Hydrate spec from chat messages if incomplete
  useEffect(() => {
    if (isSpecIncomplete(currentSpec) && chatMessages.length > 0) {
      const latestSpec = findLatestSpecFromMessages(chatMessages);
      if (latestSpec) {
        console.log('Hydrating incomplete spec from chat messages:', latestSpec);
        setCurrentSpec(latestSpec);
      }
    }
  }, [chatMessages, currentSpec]);

  // Auto-generate code when spec changes (only once per spec ID)
  useEffect(() => {
    if (currentSpec && currentSpec.id !== lastGeneratedSpecIdRef.current && !isGeneratingCode && generateCodeRef.current) {
      lastGeneratedSpecIdRef.current = currentSpec.id;
      generateCodeRef.current();
    }
  }, [currentSpec, isGeneratingCode]);

  const handleSendMessage = async (message: string) => {
    const userMessage: ChatMessage = { role: 'user', content: message };
    setChatMessages(prev => [...prev, userMessage]);

    try {
      const normalizedSpec = currentSpec ? normalizeSpecForBackend(currentSpec) : null;
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          existingSpec: normalizedSpec,
          existingCode: currentCode || undefined,
          conversationId: conversationId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process chat message');
      }

      const data = await response.json();
      
      // Update spec if provided
      if (data.spec) {
        setCurrentSpec(data.spec);
      }
      
      // Update code if provided
      if (data.code) {
        setCurrentCode(data.code);
      }
      
      // Update language if provided
      if (data.language) {
        setLanguage(data.language);
      }
      
      // Add assistant message
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.agentMessage || 'Response received' }]);
      
      // Save conversation after message exchange
      setTimeout(() => saveConversation(), 500);
    } catch (error) {
      console.error('Error processing chat message:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to process chat message'}`
      }]);
    }
  };

  const handleExportCode = () => {
    if (!currentCode || !currentSpec) return;

    const extension = language === 'python' ? 'py' : 'cs';
    const filename = `${currentSpec.metadata.name || 'Contract'}.${extension}`;
    const blob = new Blob([currentCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSimulateDeploy = async (): Promise<SimulateDeployResponse> => {
    setIsSimulatingDeploy(true);
    try {
      const normalizedSpec = currentSpec ? normalizeSpecForBackend(currentSpec) : null;
      const response = await fetch('/api/neo/simulate_deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spec: normalizedSpec,
          code: currentCode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to simulate deployment');
      }

      const data: SimulateDeployResponse = await response.json();
      return data;
    } finally {
      setIsSimulatingDeploy(false);
    }
  };

  const handleStructureItemClick = (_kind: string, id: string) => {
    setSelectedNodeId(id);
  };

  const handleVariableUpdate = (variableId: string, updates: Partial<ContractVariable>) => {
    if (!currentSpec) return;

    // Compute the updated spec
    const updatedSpec: ContractSpec = {
      ...currentSpec,
      variables: currentSpec.variables.map(variable =>
        variable.id === variableId
          ? { ...variable, ...updates }
          : variable
      ),
    };

    // Update state
    setCurrentSpec(updatedSpec);
    
    // Save conversation immediately with the updated spec to avoid closure issues
    setTimeout(() => saveConversation(updatedSpec), 1000);
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden p-2 md:p-4 gap-2 md:gap-4">
      <AppNav
        breadcrumbText={getShortName()}
        subtitle="Development Workspace"
        rightActions={
          <>
            <Button
              onClick={handleExportCode}
              disabled={!currentCode}
              variant="outline"
              size="sm"
              className="cursor-pointer text-xs md:text-sm"
            >
              Export
            </Button>
            <Button
              onClick={async () => {
                try {
                  await handleSimulateDeploy();
                  alert('Deployment simulation completed!');
                } catch (error) {
                  alert(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
              disabled={!currentSpec || isSimulatingDeploy}
              size="sm"
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 cursor-pointer text-xs md:text-sm"
            >
              {isSimulatingDeploy ? 'Deploying...' : 'Deploy'}
            </Button>
          </>
        }
      />

      {/* Desktop Layout: Three Columns */}
      <div className="hidden md:flex flex-1 overflow-hidden min-h-0 gap-4">
        {/* Left Sidebar: Chat */}
        <div className="w-96 bg-card flex flex-col overflow-hidden rounded-2xl shadow-sm border border-border">
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatPanel
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              isLoading={false}
            />
          </div>
        </div>

        {/* Middle: Flow/Code Tabs */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-card rounded-2xl shadow-sm border border-border">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'flow' | 'code')} className="flex flex-col h-full overflow-hidden">
            <div className="p-4 pb-0 bg-card/80 flex-shrink-0">
              <TabsList className="w-full">
                <TabsTrigger value="flow" className="flex-1 cursor-pointer">Flow</TabsTrigger>
                <TabsTrigger value="code" className="flex-1 cursor-pointer">Code</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="flow" className="flex-1 min-h-0 m-0 p-4 pt-0 overflow-auto">
              <ContractFlowchart
                spec={currentSpec}
                onNodeSelect={setSelectedNodeId}
                onVariableUpdate={handleVariableUpdate}
              />
            </TabsContent>

            <TabsContent value="code" className="flex-1 min-h-0 m-0 p-4 pt-0 overflow-hidden flex flex-col">
              <div className="flex-1 min-h-0 h-full">
                <CodeEditor
                  code={currentCode || (isGeneratingCode ? '## Generating code...' : '## No code generated yet')}
                  language={language}
                  readOnly={true}
                  isGenerating={isGeneratingCode}
                  rightActions={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateCode}
                      disabled={!currentSpec || isGeneratingCode}
                      className="cursor-pointer text-xs md:text-sm"
                    >
                      {isGeneratingCode ? 'Regenerating...' : 'Regenerate Code'}
                    </Button>
                  }
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar: Structure + Actions */}
        <div className="w-80 bg-card flex flex-col overflow-hidden rounded-2xl shadow-sm border border-border">
          <div className="flex-1 min-h-0 overflow-hidden">
            <ContractStructure
              spec={currentSpec}
              onItemClick={handleStructureItemClick}
              onVariableUpdate={handleVariableUpdate}
            />
          </div>
        </div>
      </div>

      {/* Mobile Layout: Single Panel with Tabs */}
      <div className="flex md:hidden flex-1 flex-col overflow-hidden min-h-0">
        {/* Chat Panel - Mobile */}
        {mobileActivePanel === 'chat' && (
          <div className="flex-1 w-full bg-card flex flex-col overflow-hidden rounded-2xl shadow-sm border border-border">
            <div className="flex-1 min-h-0 overflow-hidden">
              <ChatPanel
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                isLoading={false}
              />
            </div>
          </div>
        )}

        {/* Flow/Code Panel - Mobile */}
        {mobileActivePanel === 'flow' && (
          <div className="flex-1 w-full flex flex-col min-h-0 overflow-hidden bg-card rounded-2xl shadow-sm border border-border">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'flow' | 'code')} className="flex flex-col h-full overflow-hidden">
              <div className="p-4 pb-0 bg-card/80 flex-shrink-0">
                <TabsList className="w-full">
                  <TabsTrigger value="flow" className="flex-1 cursor-pointer">Flow</TabsTrigger>
                  <TabsTrigger value="code" className="flex-1 cursor-pointer">Code</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="flow" className="flex-1 min-h-0 m-0 p-4 pt-0 overflow-auto">
                <ContractFlowchart
                  spec={currentSpec}
                  onNodeSelect={setSelectedNodeId}
                  onVariableUpdate={handleVariableUpdate}
                />
              </TabsContent>

              <TabsContent value="code" className="flex-1 min-h-0 m-0 p-4 pt-0 overflow-hidden flex flex-col">
                <div className="flex-1 min-h-0 h-full">
                  <CodeEditor
                    code={currentCode || (isGeneratingCode ? '## Generating code...' : '## No code generated yet')}
                    language={language}
                    readOnly={true}
                    isGenerating={isGeneratingCode}
                    rightActions={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateCode}
                        disabled={!currentSpec || isGeneratingCode}
                        className="cursor-pointer text-xs md:text-sm"
                      >
                        {isGeneratingCode ? 'Regenerating...' : 'Regenerate Code'}
                      </Button>
                    }
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Structure Panel - Mobile */}
        {mobileActivePanel === 'structure' && (
          <div className="flex-1 w-full bg-card flex flex-col overflow-hidden rounded-2xl shadow-sm border border-border">
            <div className="flex-1 min-h-0 overflow-hidden">
              <ContractStructure
                spec={currentSpec}
                onItemClick={handleStructureItemClick}
                onVariableUpdate={handleVariableUpdate}
              />
            </div>
          </div>
        )}

        {/* Mobile Bottom Tab Navigation */}
        <div className="flex-shrink-0 mt-2 bg-card rounded-2xl shadow-sm border border-border">
          <div className="flex items-center justify-around h-16">
            <button
              onClick={() => setMobileActivePanel('chat')}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                mobileActivePanel === 'chat'
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs font-medium">Chat</span>
            </button>
            <button
              onClick={() => setMobileActivePanel('flow')}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                mobileActivePanel === 'flow'
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <Workflow className="h-5 w-5" />
              <span className="text-xs font-medium">Flow</span>
            </button>
            <button
              onClick={() => setMobileActivePanel('structure')}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                mobileActivePanel === 'structure'
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <FileText className="h-5 w-5" />
              <span className="text-xs font-medium">Structure</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevelopmentView;

