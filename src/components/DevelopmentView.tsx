import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, Workflow, FileText } from 'lucide-react';
import ChatPanel from './ChatPanel';
import ContractFlowchart from './ContractFlowchart';
import CodeEditor from './CodeEditor';
import ContractStructure from './ContractStructure';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
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
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [mobileActivePanel, setMobileActivePanel] = useState<'chat' | 'flow' | 'structure'>('flow');
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
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
  const saveConversation = useCallback(async (
    specOverride?: ContractSpec | null,
    messagesOverride?: ChatMessage[],
    codeOverride?: string,
    languageOverride?: ContractLanguage
  ) => {
    try {
      // Use the provided spec override, or fall back to currentSpec
      const specToSave = specOverride !== undefined ? specOverride : currentSpec;
      
      // Use the provided messages override, or fall back to current chatMessages
      const messagesToSave = messagesOverride !== undefined ? messagesOverride : chatMessages;
      
      // Use the provided code override, or fall back to currentCode
      const codeToSave = codeOverride !== undefined ? codeOverride : currentCode;
      
      // Use the provided language override, or fall back to language
      const languageToSave = languageOverride !== undefined ? languageOverride : language;
      
      // Normalize the spec for backend compatibility (especially permissions)
      const normalizedSpec = specToSave ? normalizeSpecForBackend(specToSave) : null;
      
      const title = normalizedSpec?.metadata?.name || specToSave?.metadata?.name || 'Untitled Contract';
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversationId || undefined,
          title,
          messages: messagesToSave,
          spec: normalizedSpec,
          code: codeToSave,
          language: languageToSave,
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
    setIsLoadingMessage(true);

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
      
      // Capture updated values before state updates
      // Use data.spec if provided (even if null), otherwise keep currentSpec
      const updatedSpec = data.spec !== undefined ? data.spec : currentSpec;
      const updatedCode = data.code !== undefined ? data.code : currentCode;
      const updatedLanguage = data.language !== undefined ? data.language : language;
      
      // Update spec if provided
      if (data.spec) {
        setCurrentSpec(data.spec);
      }
      
      // Update code if provided
      if (data.code !== undefined) {
        setCurrentCode(data.code);
      }
      
      // Update language if provided
      if (data.language) {
        setLanguage(data.language);
      }
      
      // Add assistant message and save conversation with all updated values
      setChatMessages(prev => {
        const assistantMessage: ChatMessage = { role: 'assistant', content: data.agentMessage || 'Response received' };
        const updatedMessages: ChatMessage[] = [...prev, assistantMessage];
        // Save conversation with all updated values immediately
        setTimeout(() => saveConversation(updatedSpec, updatedMessages, updatedCode, updatedLanguage), 100);
        return updatedMessages;
      });
    } catch (error) {
      console.error('Error processing chat message:', error);
      setChatMessages(prev => {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to process chat message'}`
        };
        const updatedMessages: ChatMessage[] = [...prev, assistantMessage];
        // Save conversation with the updated messages even on error
        setTimeout(() => saveConversation(undefined, updatedMessages), 100);
        return updatedMessages;
      });
    } finally {
      setIsLoadingMessage(false);
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
              onClick={() => setShowDeployDialog(true)}
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
              isLoading={isLoadingMessage}
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
                isLoading={isLoadingMessage}
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

      {/* Deploy Instructions Dialog */}
      <Dialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deploy Contract to Neo Network</DialogTitle>
            <DialogDescription>
              Follow these steps to deploy your smart contract to the Neo blockchain
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-semibold">
                    1
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-foreground">Prepare Your Contract</h3>
                  <p className="text-sm text-muted-foreground">
                    Ensure your contract code is complete and has been generated. Review the code in the Code tab to verify everything looks correct.
                  </p>
                  <div className="p-3 bg-muted rounded-md text-xs font-mono">
                    {currentSpec?.metadata?.name || 'YourContract'}.{language === 'python' ? 'py' : 'cs'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-semibold">
                    2
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-foreground">Export Your Contract Code</h3>
                  <p className="text-sm text-muted-foreground">
                    Click the "Export" button to download your contract code file. Save it to a location where you can easily access it.
                  </p>
                  <Button
                    onClick={() => {
                      handleExportCode();
                    }}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Export Code Now
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-semibold">
                    3
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-foreground">Set Up Neo Development Environment</h3>
                  <p className="text-sm text-muted-foreground">
                    Install the Neo development tools and configure your environment:
                  </p>
                  <div className="p-3 bg-muted rounded-md text-xs space-y-1">
                    {language === 'python' ? (
                      <>
                        <div className="font-semibold">For Python contracts:</div>
                        <div>• Install Neo Boa: <code className="bg-background px-1 py-0.5 rounded">pip install boa3</code></div>
                        <div>• Install Neo Python: <code className="bg-background px-1 py-0.5 rounded">pip install neo-python</code></div>
                      </>
                    ) : (
                      <>
                        <div className="font-semibold">For C# contracts:</div>
                        <div>• Install Neo Express: <code className="bg-background px-1 py-0.5 rounded">dotnet tool install -g neo-express</code></div>
                        <div>• Install Neo compiler: <code className="bg-background px-1 py-0.5 rounded">dotnet tool install -g neo</code></div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-semibold">
                    4
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-foreground">Compile Your Contract</h3>
                  <p className="text-sm text-muted-foreground">
                    Compile your contract code into a .nef file that can be deployed to the Neo blockchain:
                  </p>
                  <div className="p-3 bg-muted rounded-md text-xs space-y-1">
                    {language === 'python' ? (
                      <>
                        <div><code className="bg-background px-1 py-0.5 rounded">boa compile YourContract.py</code></div>
                        <div className="text-muted-foreground mt-1">This generates YourContract.nef and YourContract.manifest.json</div>
                      </>
                    ) : (
                      <>
                        <div><code className="bg-background px-1 py-0.5 rounded">neo compile YourContract.cs</code></div>
                        <div className="text-muted-foreground mt-1">This generates YourContract.nef and YourContract.manifest.json</div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-semibold">
                    5
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-foreground">Deploy to Neo Testnet</h3>
                  <p className="text-sm text-muted-foreground">
                    Deploy your contract to the Neo testnet first to ensure everything works correctly:
                  </p>
                  <div className="p-3 bg-muted rounded-md text-xs space-y-1">
                    <div>• Connect to Neo testnet RPC: <code className="bg-background px-1 py-0.5 rounded">https://testnet1.neo.org:20332</code></div>
                    <div>• Use Neo CLI or a wallet like NeoLine to deploy</div>
                    <div>• You'll need testnet GAS for deployment fees</div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-semibold">
                    6
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-foreground">Verify and Monitor</h3>
                  <p className="text-sm text-muted-foreground">
                    After deployment, verify your contract on the Neo blockchain explorer:
                  </p>
                  <div className="p-3 bg-muted rounded-md text-xs">
                    <div>• Check transaction status on <a href="https://xexplorer.neo.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Neo Testnet Explorer</a></div>
                    <div className="mt-1">• Save your contract hash for future reference</div>
                    <div className="mt-1">• Test your contract methods using the explorer or a Neo wallet</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeployDialog(false)}
            >
              Close
            </Button>
            <Button
              onClick={async () => {
                try {
                  await handleSimulateDeploy();
                  alert('✅ Deployment simulation completed! Review the steps above to deploy to the Neo network.');
                } catch (error) {
                  alert(`❌ Deployment simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
              disabled={isSimulatingDeploy}
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
            >
              {isSimulatingDeploy ? 'Running Simulation...' : 'Run Deployment Simulation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DevelopmentView;

