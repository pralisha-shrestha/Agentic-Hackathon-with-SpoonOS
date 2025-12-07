import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import AppNav from './AppNav';
import ChatHistory from './ChatHistory';
import type { ChatMessage, ContractSpecResponse, ContractSpec } from '../types';

const PrototypeView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSpec, setCurrentSpec] = useState<ContractSpec | null>(null);
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
      <div className="sticky top-0 z-50 p-4 pb-7 bg-gradient-to-b from-background via-background to-background/30 after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-0 after:h-8 after:bg-gradient-to-b after:from-background after:via-background after:to-background/0 after:pointer-events-none">
        <AppNav
          breadcrumbText="New contract prototype"
          subtitle="Refine your contract idea"
        />
      </div>

      <div className="flex-1 container mx-auto px-6 py-8 max-w-4xl flex flex-col min-h-0">
        <div className="flex-1 min-h-0 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-6 pb-8 flex flex-col gap-4">
              {messages.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <p className="text-lg mb-2">👋 Start describing your smart contract idea</p>
                  <p className="text-sm">
                    The AI will help you refine and structure your contract specification.
                  </p>
                </div>
              )}
              <ChatHistory messages={messages} isLoading={isLoading} variant="prototype" />
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          <div className="sticky bottom-0 z-50 bg-background p-4 space-y-4 flex-shrink-0 bg-gradient-to-t from-background via-background to-background/30 before:content-[''] before:absolute before:left-0 before:right-0 before:-top-8 before:h-8 before:bg-gradient-to-t before:from-background before:via-background before:to-background/0 before:pointer-events-none">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !isLoading) {
                      handleSendMessage();
                    }
                  }
                }}
                placeholder="Continue refining your contract idea..."
                disabled={isLoading}
                rows={3}
                  className="resize-none pb-14 pr-20"
              />
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-3 bottom-3 h-8 px-3 text-sm cursor-pointer"
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </Button>
              </div>
                <Button
                  type="button"
                  onClick={handleCreateContract}
                  disabled={!currentSpec}
                className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 cursor-pointer"
                >
                  Create Contract
                </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrototypeView;

