import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import type { ChatMessage, ContractSpecResponse } from '../types';

const PrototypeView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSpec, setCurrentSpec] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasSentInitial = useRef(false);

  const handleSendMessage = useCallback(async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    if (!messageText) {
      setInput('');
    }
    setIsLoading(true);

    try {
      const response = await fetch('/api/contract/spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: text,
          existingSpec: currentSpec,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate contract spec');
      }

      const data: ContractSpecResponse = await response.json();
      setCurrentSpec(data.spec);
      setMessages(prev => [...prev, { role: 'assistant', content: data.agentMessage }]);
    } catch (error) {
      console.error('Error generating spec:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to generate contract specification'}`
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, currentSpec]);

  useEffect(() => {
    const initialPrompt = location.state?.initialPrompt;
    if (initialPrompt && !hasSentInitial.current) {
      hasSentInitial.current = true;
      setInput(initialPrompt);
      handleSendMessage(initialPrompt);
    }
  }, [location.state, handleSendMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const handleCreateContract = () => {
    if (currentSpec) {
      navigate('/development', { state: { spec: currentSpec, messages } });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              NeoStudio
            </h1>
            <p className="text-sm text-muted-foreground">Refine your contract idea</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-6 py-8 max-w-4xl">
        <Card className="flex flex-col h-full min-h-[calc(100vh-12rem)]">
          <CardHeader className="border-b border-border">
            <CardTitle>Prototype Chat</CardTitle>
            <CardDescription>
              Describe your contract idea and refine it through conversation with AI
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-6 flex flex-col gap-4">
                {messages.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    <p className="text-lg mb-2">👋 Start describing your smart contract idea</p>
                    <p className="text-sm">
                      The AI will help you refine and structure your contract specification.
                    </p>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col gap-2 p-4 rounded-lg max-w-[85%] ${
                      msg.role === 'user'
                        ? 'self-end bg-primary/15 border border-primary/30'
                        : 'self-start bg-card border border-border'
                    }`}
                  >
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {msg.role === 'user' ? 'You' : 'AI Assistant'}
                    </div>
                    <div className="text-foreground leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex flex-col gap-2 p-4 rounded-lg max-w-[85%] self-start bg-card border border-border">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      AI Assistant
                    </div>
                    <div className="text-foreground">
                      Thinking<span className="animate-pulse">...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="border-t border-border p-4 space-y-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Continue refining your contract idea..."
                  disabled={isLoading}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="flex-1"
                  >
                    {isLoading ? 'Sending...' : 'Send'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreateContract}
                    disabled={!currentSpec}
                    className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
                  >
                    Create Contract
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrototypeView;

