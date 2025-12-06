import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ChatPanel from './ChatPanel';
import ContractFlowchart from './ContractFlowchart';
import CodeEditor from './CodeEditor';
import ContractStructure from './ContractStructure';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import type {
  ContractSpec,
  ContractCodeResponse,
  ChatMessage,
  ContractLanguage,
  SimulateDeployResponse,
} from '../types';

const DevelopmentView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentSpec, setCurrentSpec] = useState<ContractSpec | null>(
    location.state?.spec || null
  );
  const [currentCode, setCurrentCode] = useState<string>('');
  const [language, setLanguage] = useState<ContractLanguage>('python');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
    location.state?.messages || []
  );
  const [viewMode, setViewMode] = useState<'flow' | 'code'>('flow');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isSimulatingDeploy, setIsSimulatingDeploy] = useState(false);

  // Auto-generate code when spec changes
  useEffect(() => {
    if (currentSpec) {
      generateCode();
    }
  }, [currentSpec]);

  const generateCode = async () => {
    if (!currentSpec) return;

    setIsGeneratingCode(true);
    try {
      const response = await fetch('/api/contract/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec: currentSpec }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate contract code');
      }

      const data: ContractCodeResponse = await response.json();
      setCurrentCode(data.code);
      setLanguage(data.language);
    } catch (error) {
      console.error('Error generating code:', error);
      setCurrentCode(`// Error generating code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    setChatMessages(prev => [...prev, { role: 'user', content: message }]);

    try {
      const response = await fetch('/api/contract/spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: message,
          existingSpec: currentSpec,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate contract spec');
      }

      const data = await response.json();
      setCurrentSpec(data.spec);
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.agentMessage }]);
    } catch (error) {
      console.error('Error generating spec:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to generate contract specification'}`
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
      const response = await fetch('/api/neo/simulate_deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spec: currentSpec,
          code: currentCode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to simulate deployment');
      }

      const data: SimulateDeployResponse = await response.json();
      return data;
    } catch (error) {
      throw error;
    } finally {
      setIsSimulatingDeploy(false);
    }
  };

  const handleStructureItemClick = (kind: string, id: string) => {
    setSelectedNodeId(id);
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="border-b border-border bg-card flex-shrink-0">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              NeoStudio
            </h1>
            <p className="text-sm text-muted-foreground">Development Workspace</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar: Chat */}
        <div className="w-80 border-r border-border bg-card flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatPanel
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              isLoading={false}
            />
          </div>
        </div>

        {/* Middle: Flow/Code Tabs */}
        <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'flow' | 'code')} className="flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-border bg-card flex-shrink-0">
              <TabsList className="w-full max-w-md">
                <TabsTrigger value="flow" className="flex-1">Flow</TabsTrigger>
                <TabsTrigger value="code" className="flex-1">Code</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="flow" className="flex-1 min-h-0 m-0 p-4 overflow-auto">
              <ContractFlowchart
                spec={currentSpec}
                onNodeSelect={setSelectedNodeId}
              />
            </TabsContent>

            <TabsContent value="code" className="flex-1 min-h-0 m-0 p-4 overflow-hidden">
              <CodeEditor
                code={currentCode || (isGeneratingCode ? '// Generating code...' : '// No code generated yet')}
                language={language}
                readOnly={true}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar: Structure + Actions */}
        <div className="w-80 border-l border-border bg-card flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            <ContractStructure
              spec={currentSpec}
              onItemClick={handleStructureItemClick}
            />
          </div>
          <div className="p-4 border-t border-border space-y-2 flex-shrink-0">
            <Button
              onClick={handleExportCode}
              disabled={!currentCode}
              variant="outline"
              className="w-full"
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
              className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
            >
              {isSimulatingDeploy ? 'Deploying...' : 'Deploy'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevelopmentView;

