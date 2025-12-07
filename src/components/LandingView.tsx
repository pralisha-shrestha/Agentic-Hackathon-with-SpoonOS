import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import SpeechToTextButton from './SpeechToTextButton';
import { Brain, Network, AudioLines } from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
}

const LandingView: React.FC = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrototype = () => {
    if (prompt.trim()) {
      navigate('/prototype', { state: { initialPrompt: prompt.trim() } });
    }
  };

  const handleConversationClick = (conversationId: string) => {
    navigate('/development', { state: { conversationId } });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Product Info + Prompt */}
        <div className="flex flex-col justify-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              NeoStudio
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Transform your ideas into Neo smart contracts with AI-powered assistance. 
              Describe your contract concept, refine it through conversation, and watch 
              it come to life as executable code.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-full bg-primary/10 border border-primary/40 px-4 py-2 shadow-sm">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">SpoonOS AI Orchestration</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-accent/10 border border-accent/40 px-4 py-2 shadow-sm">
                <Network className="h-4 w-4 text-accent-foreground" />
                <span className="text-sm font-medium text-foreground">Neo Blockchain Native</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-primary/10 border border-primary/40 px-4 py-2 shadow-sm">
                <AudioLines className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">ElevenLabs Speech-to-Text</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2 relative">
              <label htmlFor="prompt" className="text-sm font-medium text-foreground">
                Describe your contract idea
              </label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handlePrototype();
                  }
                }}
                placeholder="e.g., Create a token contract with 100,000 supply and admin-only minting"
                rows={8}
                className="resize-none text-base pb-20"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <SpeechToTextButton
                  onTranscript={(text) => setPrompt(text)}
                  size="icon"
                  className="h-10 w-10 rounded-md border border-border bg-card flex items-center justify-center"
                />
                <select
                  className="h-10 w-44 rounded-md border border-border bg-card text-sm px-3 pr-6 cursor-pointer"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      setPrompt(value);
                    }
                  }}
                  value=""
                >
                  <option value="" disabled>
                    Get some inspo
                  </option>
                  <option value="Generate a simple Hello World smart contract that exposes a single method returning the greeting string.">
                    Hello World contract
                  </option>
                  <option value="Create a fungible token contract with 100,000 initial supply, admin-only minting, and a pausable transfer feature.">
                    Token with admin mint + pause
                  </option>
                  <option value="Build a 3-of-5 multisig wallet contract supporting proposal creation, approvals, execution, and a configurable quorum.">
                    Multisig wallet starter
                  </option>
                </select>
              </div>
            </div>
            <Button
              onClick={handlePrototype}
              disabled={!prompt.trim()}
              className="w-full h-12 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
              size="lg"
            >
              Prototype
            </Button>
          </div>
        </div>

        {/* Right Side: Existing Conversations */}
        <div className="flex flex-col">
          <Card className="flex flex-col max-h-[600px]">
            <CardHeader className="flex-shrink-0">
              <CardTitle>Your Conversations</CardTitle>
              <CardDescription>Continue working on your contracts</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
              <ScrollArea className="h-[500px]">
                {isLoading ? (
                  <div className="p-6 text-center text-muted-foreground">
                    Loading conversations...
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <p>No conversations yet.</p>
                    <p className="text-sm mt-2">Start by creating a new contract prototype.</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => handleConversationClick(conv.id)}
                        className="p-4 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                      >
                        <div className="font-semibold text-foreground mb-1">{conv.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {conv.preview}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(conv.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LandingView;

