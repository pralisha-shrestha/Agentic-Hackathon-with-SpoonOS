import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden rounded-2xl border-none shadow-none bg-card">
      <CardHeader className="pb-4 border-b border-border rounded-t-2xl">
        <CardTitle>Chat</CardTitle>
        <CardDescription>Describe your smart contract idea</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full">
          <div className="p-4 flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="py-6 text-center text-muted-foreground">
                <p className="text-sm">👋 Describe the smart contract you want to create on Neo.</p>
                <p className="mt-2 text-xs italic">
                  Example: "Create a token contract with 100,000 supply and admin-only minting"
                </p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col gap-1 p-3 rounded-lg max-w-[85%] ${
                  msg.role === 'user'
                    ? 'self-end bg-accent border border-accent/50'
                    : 'self-start bg-card border border-border'
                }`}
              >
                <div className={`text-xs font-semibold uppercase tracking-wide ${
                  msg.role === 'user' ? 'text-accent-foreground' : 'text-muted-foreground'
                }`}>
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  msg.role === 'user' ? 'text-accent-foreground' : 'text-foreground'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex flex-col gap-1 p-3 rounded-lg max-w-[85%] self-start bg-card border border-border">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Assistant
                </div>
                <div className="text-sm text-foreground">
                  Generating<span className="animate-pulse">...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="pt-4 border-t border-border">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your contract description..."
            disabled={isLoading}
            rows={3}
            className="resize-none"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};

export default ChatPanel;

