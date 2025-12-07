import type { ChatMessage, ContractSpec } from '../types';

/**
 * Extracts a ContractSpec from a chat message content
 * Similar logic to ChatMessageCard but returns the spec directly
 */
export const extractSpecFromMessage = (content: string): ContractSpec | null => {
  try {
    // Try to find JSON object in the message content (handle code blocks too)
    let jsonStr = content;
    
    // Remove markdown code blocks if present
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Try to find JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Check if it looks like a ContractSpec
      if (parsed.metadata && parsed.metadata.name && parsed.variables !== undefined) {
        return parsed as ContractSpec;
      }
    }
  } catch (e) {
    // Not valid JSON or not a contract spec, return null
  }
  return null;
};

/**
 * Finds the latest contract spec from chat messages
 * Returns the most recent valid ContractSpec found in assistant messages
 */
export const findLatestSpecFromMessages = (messages: ChatMessage[]): ContractSpec | null => {
  // Search from the end (most recent) to the beginning
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === 'assistant') {
      const spec = extractSpecFromMessage(message.content);
      if (spec) {
        return spec;
      }
    }
  }
  return null;
};

/**
 * Checks if a spec is incomplete (only has metadata, missing variables/methods)
 */
export const isSpecIncomplete = (spec: ContractSpec | null): boolean => {
  if (!spec) return true;
  
  // Check if spec has meaningful content beyond metadata
  const hasVariables = spec.variables && spec.variables.length > 0;
  const hasMethods = spec.methods && spec.methods.length > 0;
  const hasEvents = spec.events && spec.events.length > 0;
  const hasPermissions = spec.permissions && spec.permissions.length > 0;
  
  // If it only has metadata and nothing else, it's incomplete
  return !hasVariables && !hasMethods && !hasEvents && !hasPermissions;
};

