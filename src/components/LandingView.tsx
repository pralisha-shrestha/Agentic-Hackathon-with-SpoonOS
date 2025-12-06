import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

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
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="prompt" className="text-sm font-medium text-foreground">
                Describe your contract idea
              </label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handlePrototype();
                  }
                }}
                placeholder="e.g., Create a token contract with 100,000 supply and admin-only minting"
                rows={8}
                className="resize-none text-base"
              />
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
                    {conversations.map((conv, idx) => (
                      <React.Fragment key={conv.id}>
                        <div
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
                        {idx < conversations.length - 1 && <Separator />}
                      </React.Fragment>
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

