import React from 'react';
import Editor from '@monaco-editor/react';
import type { ContractLanguage } from '../types';
import { Badge } from './ui/badge';

interface CodeEditorProps {
  code: string;
  language: ContractLanguage;
  onChange?: (value: string | undefined) => void;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ 
  code, 
  language, 
  onChange, 
  readOnly = false 
}) => {
  const editorLanguage = language === 'python' ? 'python' : 'csharp';

  return (
    <div className="flex flex-col h-full bg-popover rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-card border-b border-border">
        <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
          {language.toUpperCase()}
        </Badge>
        {readOnly && (
          <Badge variant="outline" className="bg-background/5 text-muted-foreground">
            Read Only
          </Badge>
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

