import React, { useMemo } from 'react';
import type { ChatMessage, ContractSpec } from '../types';
import FormattedContractSpec from './FormattedContractSpec';

type Variant = 'prototype' | 'development';

interface ChatMessageCardProps {
  message: ChatMessage;
  variant?: Variant;
  className?: string;
}

const ChatMessageCard: React.FC<ChatMessageCardProps> = ({
  message,
  variant = 'prototype',
  className = '',
}) => {
  const isDev = variant === 'development';
  const isUser = message.role === 'user';

  // Try to parse JSON from assistant messages
  const { parsedSpec, textBeforeJson } = useMemo(() => {
    if (isUser) return { parsedSpec: null, textBeforeJson: null };
    
    try {
      // Try to find JSON object in the message content (handle code blocks too)
      let jsonStr = message.content;
      
      // Remove markdown code blocks if present
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Try to find JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStartIndex = jsonStr.indexOf(jsonMatch[0]);
        const textBefore = jsonStartIndex > 0 ? jsonStr.substring(0, jsonStartIndex).trim() : null;
        
        const parsed = JSON.parse(jsonMatch[0]);
        // Check if it looks like a ContractSpec
        if (parsed.metadata && parsed.metadata.name && parsed.variables !== undefined) {
          return { parsedSpec: parsed as ContractSpec, textBeforeJson: textBefore };
        }
      }
    } catch (e) {
      // Not valid JSON or not a contract spec, return null
    }
    return { parsedSpec: null, textBeforeJson: null };
  }, [message.content, isUser]);

  // Card styling based on role
  const cardClasses = isUser
    ? 'bg-primary/15 border border-primary/30'
    : 'bg-card border border-border';

  // Header styling
  const headerClasses = isUser
    ? 'text-primary font-semibold'
    : 'text-muted-foreground font-semibold';

  // Body text styling
  const bodyClasses = isUser
    ? 'text-accent-foreground'
    : 'text-foreground';

  // Spacing based on variant
  const padding = isDev ? 'p-3' : 'p-4';
  const gap = isDev ? 'gap-1' : 'gap-2';

  const roleLabel = isUser ? 'You' : isDev ? 'Assistant' : 'AI Assistant';

  return (
    <div
      className={`flex flex-col ${gap} ${padding} rounded-lg max-w-[85%] ${cardClasses} ${className}`}
    >
      <div className={`text-xs uppercase tracking-wide ${headerClasses}`}>
        {roleLabel}
      </div>
      {parsedSpec ? (
        <div className="flex flex-col gap-3">
          {textBeforeJson && (
            <div className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${bodyClasses}`}>
              {textBeforeJson}
            </div>
          )}
          <FormattedContractSpec spec={parsedSpec} />
        </div>
      ) : (
        <div className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${bodyClasses}`}>
          {message.content}
        </div>
      )}
    </div>
  );
};

export default ChatMessageCard;

