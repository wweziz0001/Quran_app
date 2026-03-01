'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import Editor, { OnMount, BeforeMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useTheme } from 'next-themes';

interface MonacoEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  filePath?: string;
  readOnly?: boolean;
  onEditorMount?: (editor: editor.IStandaloneCodeEditor) => void;
  options?: editor.IStandaloneEditorConstructionOptions;
}

// Language mapping for file extensions
const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.json': 'json',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'scss',
  '.less': 'less',
  '.html': 'html',
  '.htm': 'html',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.sql': 'sql',
  '.sh': 'shell',
  '.bash': 'shell',
  '.py': 'python',
  '.java': 'java',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.prisma': 'prisma',
  '.env': 'plaintext',
  '.txt': 'plaintext',
  '.svg': 'xml',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.rust': 'rust',
  '.rs': 'rust',
  '.go': 'go',
  '.php': 'php',
  '.rb': 'ruby',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.swift': 'swift',
  '.dart': 'dart',
  '.vue': 'vue',
  '.svelte': 'svelte',
};

// Get language from file extension
export function getLanguageFromPath(filePath: string): string {
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return LANGUAGE_MAP[ext] || 'plaintext';
}

// Configure Monaco editor settings
const handleEditorWillMount: BeforeMount = (monaco) => {
  // Define custom theme for dark mode
  monaco.editor.defineTheme('quran-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'C586C0' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'function', foreground: 'DCDCAA' },
      { token: 'variable', foreground: '9CDCFE' },
      { token: 'constant', foreground: '4FC1FF' },
      { token: 'delimiter', foreground: 'D4D4D4' },
      { token: 'delimiter.bracket', foreground: 'FFD700' },
      { token: 'delimiter.parenthesis', foreground: 'FFA500' },
      { token: 'delimiter.square', foreground: '00CED1' },
    ],
    colors: {
      'editor.background': '#1E1E1E',
      'editor.foreground': '#D4D4D4',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#C6C6C6',
      'editor.selectionBackground': '#264F78',
      'editor.lineHighlightBackground': '#2A2D2E',
      'editorCursor.foreground': '#AEAFAD',
      'editorIndentGuide.background': '#404040',
      'editorIndentGuide.activeBackground': '#707070',
      'editorBracketMatch.background': '#006400',
      'editorBracketMatch.border': '#888888',
    },
  });

  // Define custom theme for light mode
  monaco.editor.defineTheme('quran-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '008000', fontStyle: 'italic' },
      { token: 'keyword', foreground: '0000FF' },
      { token: 'string', foreground: 'A31515' },
      { token: 'number', foreground: '098658' },
      { token: 'type', foreground: '267F99' },
      { token: 'function', foreground: '795E26' },
      { token: 'variable', foreground: '001080' },
      { token: 'constant', foreground: '0070C1' },
      { token: 'delimiter.bracket', foreground: 'FFD700' },
      { token: 'delimiter.parenthesis', foreground: 'FFA500' },
      { token: 'delimiter.square', foreground: '00CED1' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#000000',
      'editorLineNumber.foreground': '#999999',
      'editorLineNumber.activeForeground': '#333333',
      'editor.selectionBackground': '#ADD6FF',
      'editor.lineHighlightBackground': '#F5F5F5',
      'editorCursor.foreground': '#000000',
      'editorIndentGuide.background': '#D3D3D3',
      'editorIndentGuide.activeBackground': '#939393',
      'editorBracketMatch.background': '#BBDFFF',
      'editorBracketMatch.border': '#888888',
    },
  });

  // Configure bracket pair colorization
  monaco.languages.setLanguageConfiguration('typescript', {
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    colorizedBracketPairs: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
  });

  // Register Prisma language if not already registered
  try {
    monaco.languages.register({ id: 'prisma' });
    monaco.languages.setMonarchTokensProvider('prisma', {
      keywords: [
        'model', 'enum', 'type', 'datasource', 'generator', 'enum',
        'Boolean', 'String', 'Int', 'Float', 'DateTime', 'Json', 'Bytes',
        'Decimal', 'BigInt', 'true', 'false', 'null',
      ],
      typeKeywords: ['id', 'unique', 'index', 'default', 'autoincrement', 'updatedAt', 'createdAt'],
      operators: ['=', '@', '@@'],
      symbols: /[=><!~?:&|+\-*\/\^%]+/,
      tokenizer: {
        root: [
          [/[a-zA-Z_]\w*/, {
            cases: {
              '@keywords': 'keyword',
              '@typeKeywords': 'type',
              '@default': 'identifier',
            },
          }],
          { include: '@whitespace' },
          [/[{}()\[\]]/, '@brackets'],
          [/[<>](?!@symbols)/, '@brackets'],
          [/@symbols/, {
            cases: {
              '@operators': 'operator',
              '@default': '',
            },
          }],
          [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/\d+/, 'number'],
          [/[;,.]/, 'delimiter'],
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
        ],
        string: [
          [/[^\\"]+/, 'string'],
          [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
        ],
        whitespace: [
          [/[ \t\r\n]+/, 'white'],
          [/\/\/.*$/, 'comment'],
        ],
      },
    });
  } catch {
    // Language already registered
  }
};

export function MonacoEditor({
  value,
  onChange,
  language = 'typescript',
  filePath,
  readOnly = false,
  onEditorMount,
  options = {},
}: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { theme, systemTheme } = useTheme();
  const [editorReady, setEditorReady] = useState(false);
  
  // Determine the actual theme
  const actualTheme = theme === 'system' 
    ? (systemTheme ?? 'light') 
    : (theme ?? 'light');
  
  const editorTheme = actualTheme === 'dark' ? 'quran-dark' : 'quran-light';

  // Handle editor mount
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    setEditorReady(true);

    // Configure editor features
    editor.updateOptions({
      // Bracket pair colorization
      bracketPairColorization: {
        enabled: true,
        independentColorPoolPerBracketType: true,
      },
      
      // Code folding
      folding: true,
      foldingStrategy: 'auto',
      foldingHighlight: true,
      showFoldingControls: 'always',
      unfoldOnClickAfterEndOfLine: true,
      
      // Indentation guides
      guides: {
        bracketPairs: true,
        bracketPairsHorizontal: true,
        highlightActiveIndentation: true,
        indentation: true,
      },
      
      // Sticky scroll
      stickyScroll: {
        enabled: true,
        defaultModel: 'outlineModel',
        maxLineCount: 5,
      },
      
      // Minimap
      minimap: {
        enabled: true,
        side: 'right',
        size: 'proportional',
        showSlider: 'mouseover',
        renderCharacters: false,
        maxColumn: 120,
      },
      
      // Other features
      renderLineHighlight: 'all',
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      fontLigatures: true,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
      fontSize: 14,
      lineHeight: 22,
      wordWrap: 'on',
      automaticLayout: true,
      scrollBeyondLastLine: false,
      readOnly,
    });

    // Add cursor position listener
    editor.onDidChangeCursorPosition((e) => {
      // Could emit cursor position changes
    });

    // Add selection listener
    editor.onDidChangeCursorSelection((e) => {
      // Could emit selection changes
    });

    // Add visible ranges listener for sticky scroll info
    editor.onDidScrollChange(() => {
      // Could emit scroll changes
    });

    // Call the onEditorMount callback if provided
    onEditorMount?.(editor);
  };

  // Handle content changes
  const handleChange = useCallback((value: string | undefined) => {
    onChange?.(value ?? '');
  }, [onChange]);

  // Default options
  const defaultOptions: editor.IStandaloneEditorConstructionOptions = {
    readOnly,
    wordWrap: 'on',
    automaticLayout: true,
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
    minimap: { enabled: true },
    folding: true,
    lineNumbers: 'on',
    renderLineHighlight: 'all',
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    smoothScrolling: true,
    fontLigatures: true,
    tabSize: 2,
    insertSpaces: true,
    bracketPairColorization: {
      enabled: true,
      independentColorPoolPerBracketType: true,
    },
    guides: {
      bracketPairs: true,
      bracketPairsHorizontal: true,
      highlightActiveIndentation: true,
      indentation: true,
    },
    stickyScroll: {
      enabled: true,
      defaultModel: 'outlineModel',
      maxLineCount: 5,
    },
  };

  // Update model language when file path changes
  useEffect(() => {
    if (editorRef.current && filePath) {
      const model = editorRef.current.getModel();
      if (model) {
        const detectedLanguage = getLanguageFromPath(filePath);
        monaco.editor.setModelLanguage(model, detectedLanguage);
      }
    }
  }, [filePath, language]);

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={handleChange}
      beforeMount={handleEditorWillMount}
      onMount={handleEditorDidMount}
      theme={editorTheme}
      path={filePath}
      loading={
        <div className="flex items-center justify-center h-full bg-background">
          <div className="text-muted-foreground">Loading editor...</div>
        </div>
      }
      options={{ ...defaultOptions, ...options }}
    />
  );
}

export default MonacoEditor;
