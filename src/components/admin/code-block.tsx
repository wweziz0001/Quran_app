'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'typescript' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 z-10">
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-muted/80"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <pre className="bg-muted/50 border rounded-lg p-4 overflow-x-auto text-sm max-h-[500px] overflow-y-auto">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
}
