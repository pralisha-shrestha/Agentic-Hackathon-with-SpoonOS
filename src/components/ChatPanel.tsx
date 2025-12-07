import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import ChatHistory from './ChatHistory';
import SpeechToTextButton from './SpeechToTextButton';

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
          <div className="p-4 pb-6 flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="py-6 text-center text-muted-foreground">
                <p className="text-sm">👋 Describe the smart contract you want to create on Neo.</p>
                <p className="mt-2 text-xs italic">
                  Example: "Create a token contract with 100,000 supply and admin-only minting"
                </p>
              </div>
            )}
            <ChatHistory messages={messages} isLoading={isLoading} variant="development" />
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="pt-4 border-t border-border">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !isLoading) {
                  onSendMessage(input.trim());
                  setInput('');
                }
              }
            }}
            placeholder="Type your contract description..."
            disabled={isLoading}
            rows={3}
            className="resize-none"
          />
          <div className="flex items-center gap-2">
            <SpeechToTextButton
              onTranscript={(text) => setInput(text)}
              size="sm"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
            >
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </form>
      </CardFooter>
    </Card>
  );
};

export default ChatPanel;

