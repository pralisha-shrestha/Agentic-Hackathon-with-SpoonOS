import React from 'react';
import Editor from '@monaco-editor/react';
import type { ContractLanguage } from '../types';
import { Badge } from './ui/badge';

interface CodeEditorProps {
  code: string;
  language: ContractLanguage;
  onChange?: (value: string | undefined) => void;
  readOnly?: boolean;
  rightActions?: React.ReactNode;
  isGenerating?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ 
  code, 
  language, 
  onChange, 
  readOnly = false,
  rightActions,
  isGenerating = false,
}) => {
  const editorLanguage = language === 'python' ? 'python' : 'csharp';

  return (
    <div className="flex flex-col h-full bg-popover rounded-xl overflow-hidden relative">
      {isGenerating && (
        <div className="absolute inset-0 rounded-xl pointer-events-none z-10">
          <div 
            className="absolute inset-0 rounded-xl border-[3px] border-transparent"
            style={{
              borderTopColor: '#5A8A7F',
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
              animation: 'spin-border 1.5s linear infinite',
              boxShadow: '0 0 20px rgba(90, 138, 127, 0.4), inset 0 0 20px rgba(90, 138, 127, 0.1)',
            }} 
          />
        </div>
      )}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
            {language.toUpperCase()}
          </Badge>
          {readOnly && (
            <Badge variant="outline" className="bg-background/5 text-muted-foreground">
              Read Only
            </Badge>
          )}
        </div>
        {rightActions && (
          <div className="flex items-center gap-2">
            {rightActions}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={editorLanguage}
          value={code}
          onChange={onChange}
          theme="vs-dark"
          options={{
            readOnly,
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;

