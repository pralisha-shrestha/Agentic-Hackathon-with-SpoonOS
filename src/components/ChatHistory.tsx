import React from 'react';
import type { ChatMessage } from '../types';
import ChatMessageCard from './ChatMessageCard';

type Variant = 'prototype' | 'development';

interface ChatHistoryProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  variant?: Variant;
  className?: string;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({
  messages,
  isLoading = false,
  variant = 'prototype',
  className = '',
}) => {
  const isDev = variant === 'development';
  const gap = isDev ? 'gap-3' : 'gap-4';

  return (
    <div className={`flex flex-col ${gap} ${className}`}>
      {messages.map((msg, idx) => (
        <ChatMessageCard
          key={idx}
          message={msg}
          variant={variant}
          className={msg.role === 'user' ? 'self-end' : 'self-start'}
        />
      ))}
      {isLoading && (
        <div
          className={`flex flex-col ${
            isDev ? 'gap-1 p-3' : 'gap-2 p-4'
          } rounded-lg max-w-[85%] self-start bg-card border border-border`}
        >
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {isDev ? 'Assistant' : 'AI Assistant'}
          </div>
          <div className="text-sm text-foreground">
            {isDev ? 'Generating' : 'Thinking'}
            <span className="animate-pulse">...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;

