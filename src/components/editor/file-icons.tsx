'use client';

import React from 'react';

interface FileIconProps {
  name: string;
  extension?: string;
  isFolder?: boolean;
  isOpen?: boolean;
  size?: number;
  className?: string;
}

// Folder colors based on name
const FOLDER_COLORS: Record<string, string> = {
  src: '#e8a427',
  components: '#42a5f5',
  hooks: '#ab47bc',
  utils: '#66bb6a',
  styles: '#ec407a',
  public: '#8d6e63',
  ui: '#29b6f6',
  node_modules: '#78909c',
  assets: '#ffa726',
  config: '#78909c',
  lib: '#7e57c2',
  types: '#26a69a',
  api: '#ef5350',
  services: '#5c6bc0',
  store: '#ec407a',
  pages: '#66bb6a',
  layouts: '#42a5f5',
  middleware: '#ff7043',
  test: '#9ccc65',
  tests: '#9ccc65',
  __tests__: '#9ccc65',
  dist: '#78909c',
  build: '#78909c',
  prisma: '#4a5568',
  admin: '#3b82f6',
  editor: '#8b5cf6',
  quran: '#10b981',
  search: '#f59e0b',
};

// File type colors and letters
const FILE_TYPES: Record<string, { color: string; letter: string }> = {
  ts: { color: '#3178c6', letter: 'TS' },
  tsx: { color: '#3178c6', letter: 'TS' },
  js: { color: '#f7df1e', letter: 'JS' },
  jsx: { color: '#f7df1e', letter: 'JS' },
  css: { color: '#42a5f5', letter: '#' },
  scss: { color: '#ec407a', letter: 'S' },
  sass: { color: '#ec407a', letter: 'S' },
  less: { color: '#1d365d', letter: 'L' },
  json: { color: '#ffa726', letter: '{}' },
  md: { color: '#42a5f5', letter: 'M' },
  mdx: { color: '#fcb32c', letter: 'MDX' },
  html: { color: '#e44d26', letter: '<>' },
  htm: { color: '#e44d26', letter: '<>' },
  svg: { color: '#ffb300', letter: 'SV' },
  yaml: { color: '#f44336', letter: 'Y' },
  yml: { color: '#f44336', letter: 'Y' },
  env: { color: '#ffc107', letter: 'E' },
  gitignore: { color: '#e64a19', letter: 'G' },
  dockerfile: { color: '#2196f3', letter: 'D' },
  lock: { color: '#78909c', letter: 'L' },
  png: { color: '#66bb6a', letter: 'IMG' },
  jpg: { color: '#66bb6a', letter: 'IMG' },
  jpeg: { color: '#66bb6a', letter: 'IMG' },
  gif: { color: '#66bb6a', letter: 'GIF' },
  webp: { color: '#66bb6a', letter: 'IMG' },
  ico: { color: '#66bb6a', letter: 'ICO' },
  prisma: { color: '#4a5568', letter: 'P' },
  sql: { color: '#e48e00', letter: 'SQL' },
  prc: { color: '#4a5568', letter: 'PRC' },
  txt: { color: '#78909c', letter: 'TXT' },
  log: { color: '#78909c', letter: 'LOG' },
  xml: { color: '#e44d26', letter: 'X' },
  sh: { color: '#4eaa25', letter: 'SH' },
  bash: { color: '#4eaa25', letter: 'SH' },
  zsh: { color: '#4eaa25', letter: 'ZSH' },
  py: { color: '#3776ab', letter: 'PY' },
  rb: { color: '#cc342d', letter: 'RB' },
  go: { color: '#00add8', letter: 'GO' },
  rs: { color: '#dea584', letter: 'RS' },
  java: { color: '#b07219', letter: 'J' },
  kt: { color: '#7f52ff', letter: 'KT' },
  kts: { color: '#7f52ff', letter: 'KT' },
  swift: { color: '#f05138', letter: 'SW' },
  c: { color: '#a8b9cc', letter: 'C' },
  cpp: { color: '#00599c', letter: 'C++' },
  h: { color: '#a8b9cc', letter: 'H' },
  hpp: { color: '#00599c', letter: 'HPP' },
  cs: { color: '#178600', letter: 'C#' },
  php: { color: '#777bb4', letter: 'PHP' },
  vue: { color: '#42b883', letter: 'V' },
  svelte: { color: '#ff3e00', letter: 'S' },
  astro: { color: '#ff5d01', letter: 'A' },
  graphql: { color: '#e535ab', letter: 'GQL' },
  gql: { color: '#e535ab', letter: 'GQL' },
  toml: { color: '#9c4121', letter: 'T' },
  ini: { color: '#78909c', letter: 'INI' },
  cfg: { color: '#78909c', letter: 'CFG' },
  conf: { color: '#78909c', letter: 'CONF' },
  map: { color: '#78909c', letter: 'MAP' },
};

export function FileIcon({ 
  name, 
  extension, 
  isFolder, 
  isOpen, 
  size = 16,
  className = '' 
}: FileIconProps) {
  if (isFolder) {
    return <FolderIcon name={name} isOpen={isOpen} size={size} className={className} />;
  }
  return <FileTypeIcon extension={extension} name={name} size={size} className={className} />;
}

function FolderIcon({ name, isOpen, size, className }: { name: string; isOpen?: boolean; size: number; className: string }) {
  const lowerName = name.toLowerCase();
  const color = FOLDER_COLORS[lowerName] || '#90a4ae';
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
    >
      {isOpen ? (
        <>
          <path 
            d="M4 8V6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v1H4z" 
            fill={color} 
            opacity={0.9} 
          />
          <path 
            d="M2 10a2 2 0 012-2h16a2 2 0 012 2l-1.5 8a2 2 0 01-2 2H5.5a2 2 0 01-2-2L2 10z" 
            fill={color} 
            opacity={0.7} 
          />
        </>
      ) : (
        <>
          <path 
            d="M4 8V6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" 
            fill={color} 
            opacity={0.85} 
          />
          <path 
            d="M4 8h16" 
            stroke={color} 
            strokeWidth={0.5} 
            opacity={0.5} 
          />
        </>
      )}
    </svg>
  );
}

function FileTypeIcon({ extension, name, size, className }: { extension?: string; name: string; size: number; className: string }) {
  const lowerName = name.toLowerCase();
  const ext = extension?.toLowerCase() || '';
  
  // Special files
  if (lowerName === 'dockerfile') {
    return renderFileIcon('#2196f3', 'D', size, className);
  }
  if (lowerName === '.gitignore') {
    return renderFileIcon('#e64a19', 'G', size, className);
  }
  if (lowerName === '.env' || lowerName.startsWith('.env.')) {
    return renderFileIcon('#ffc107', 'E', size, className);
  }
  if (lowerName === 'package.json') {
    return renderFileIcon('#f7df1e', 'PKG', size, className);
  }
  if (lowerName === 'tsconfig.json') {
    return renderFileIcon('#3178c6', 'TS', size, className);
  }
  if (lowerName === 'tailwind.config.js' || lowerName === 'tailwind.config.ts') {
    return renderFileIcon('#38bdf8', 'TW', size, className);
  }
  if (lowerName === 'next.config.js' || lowerName === 'next.config.ts' || lowerName === 'next.config.mjs') {
    return renderFileIcon('#000000', 'NX', size, className);
  }
  if (lowerName === 'vite.config.ts' || lowerName === 'vite.config.js') {
    return renderFileIcon('#646cff', 'V', size, className);
  }
  if (lowerName === 'prisma.schema' || ext === 'prisma') {
    return renderFileIcon('#4a5568', 'P', size, className);
  }
  if (lowerName === 'readme.md') {
    return renderFileIcon('#42a5f5', 'RME', size, className);
  }
  if (lowerName === 'license' || lowerName === 'license.md') {
    return renderFileIcon('#f44336', 'LIC', size, className);
  }
  if (lowerName === 'changelog.md' || lowerName === 'changelog') {
    return renderFileIcon('#66bb6a', 'CL', size, className);
  }
  if (lowerName === 'version') {
    return renderFileIcon('#42a5f5', 'V', size, className);
  }
  
  // Standard file types
  const fileType = FILE_TYPES[ext];
  if (fileType) {
    return renderFileIcon(fileType.color, fileType.letter, size, className);
  }
  
  // Default
  return renderFileIcon('#90a4ae', '?', size, className);
}

function renderFileIcon(color: string, letter: string, size: number, className: string) {
  const fontSize = letter.length > 2 ? '5' : letter.length > 1 ? '6' : '8';
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
    >
      <path 
        d="M6 2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" 
        fill={color} 
        opacity={0.15} 
        stroke={color} 
        strokeWidth={1} 
      />
      <path 
        d="M14 2v6h6" 
        stroke={color} 
        strokeWidth={1} 
        opacity={0.5} 
      />
      <text 
        x="12" 
        y="17" 
        textAnchor="middle" 
        fill={color} 
        fontSize={fontSize} 
        fontWeight="bold" 
        fontFamily="monospace"
      >
        {letter}
      </text>
    </svg>
  );
}

export default FileIcon;
