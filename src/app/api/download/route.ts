import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = process.cwd();

// Get current version from VERSION file
function getVersion(): string {
  try {
    const versionPath = path.join(PROJECT_ROOT, 'VERSION');
    if (fs.existsSync(versionPath)) {
      return fs.readFileSync(versionPath, 'utf-8').trim();
    }
  } catch {
    // Ignore errors
  }
  return '1.0.0';
}

// Directories and files to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.next',
  '.git',
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.test.local',
  '.env.production.local',
  '.env',
  '*.log',
  '.DS_Store',
  'Thumbs.db',
  '*.db-journal',
];

function shouldExclude(filePath: string): boolean {
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  const basename = path.basename(filePath);
  
  // Check exclude patterns
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.startsWith('*')) {
      const ext = pattern.replace('*', '');
      if (basename.endsWith(ext)) return true;
    } else {
      if (relativePath.includes(pattern) || relativePath.startsWith(pattern)) {
        return true;
      }
    }
  }
  
  // Exclude hidden files (except .env.example)
  if (basename.startsWith('.') && basename !== '.env.example') {
    return true;
  }
  
  return false;
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.ts': 'text/typescript',
    '.tsx': 'text/typescript',
    '.js': 'text/javascript',
    '.jsx': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.scss': 'text/x-scss',
    '.html': 'text/html',
    '.md': 'text/markdown',
    '.prisma': 'text/plain',
    '.sql': 'text/x-sql',
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
    '.txt': 'text/plain',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const singleFile = searchParams.get('file');
    const downloadAll = searchParams.get('all') === 'true';

    // Download single file
    if (singleFile && !downloadAll) {
      const fullPath = path.join(PROJECT_ROOT, singleFile);
      
      // Security check
      if (shouldExclude(fullPath)) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
      
      // Resolve to absolute path and check it's within project
      const resolvedPath = path.resolve(fullPath);
      if (!resolvedPath.startsWith(PROJECT_ROOT)) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
      
      if (!fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }
      
      const content = fs.readFileSync(resolvedPath);
      const fileName = path.basename(singleFile);
      const mimeType = getMimeType(resolvedPath);
      
      return new NextResponse(content, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': content.length.toString(),
        },
      });
    }

    // Download entire project as tar.gz
    if (downloadAll) {
      const version = getVersion();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `quran-app-v${version}-${timestamp}.tar.gz`;
      
      // Create a temporary tar.gz file
      const tempFile = path.join(PROJECT_ROOT, '..', `temp-${filename}`);
      
      try {
        // Create exclude file
        const excludeFile = path.join(PROJECT_ROOT, '..', 'tar-exclude.txt');
        const excludeContent = EXCLUDE_PATTERNS
          .map(p => p.startsWith('*') ? `--exclude=${p}` : `--exclude=${p}`)
          .join('\n');
        fs.writeFileSync(excludeFile, excludeContent);
        
        // Use tar command to create archive
        const tarCommand = `tar -czf "${tempFile}" \
          --exclude='node_modules' \
          --exclude='.next' \
          --exclude='.git' \
          --exclude='*.log' \
          --exclude='*.db-journal' \
          --exclude='.env' \
          --exclude='.env.local' \
          --exclude='.env.*.local' \
          --exclude='.DS_Store' \
          --exclude='temp-*.tar.gz' \
          -C "${path.dirname(PROJECT_ROOT)}" \
          "${path.basename(PROJECT_ROOT)}"`;
        
        execSync(tarCommand, { 
          cwd: path.dirname(PROJECT_ROOT),
          maxBuffer: 50 * 1024 * 1024 // 50MB buffer
        });
        
        if (!fs.existsSync(tempFile)) {
          throw new Error('Failed to create archive');
        }
        
        const content = fs.readFileSync(tempFile);
        
        // Cleanup temp file
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // Ignore cleanup errors
        }
        try {
          fs.unlinkSync(excludeFile);
        } catch (e) {
          // Ignore cleanup errors
        }
        
        return new NextResponse(content, {
          headers: {
            'Content-Type': 'application/gzip',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': content.length.toString(),
          },
        });
      } catch (tarError) {
        console.error('Tar error:', tarError);
        
        // Cleanup on error
        try { fs.unlinkSync(tempFile); } catch (e) {}
        
        // Fallback: Create a simple zip-like archive using Node.js only
        return createFallbackArchive(filename);
      }
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    );
  }
}

// Fallback archive creation without external commands
async function createFallbackArchive(filename: string) {
  const { createGzip } = await import('zlib');
  const { promisify } = await import('util');
  const gzip = promisify(createGzip);
  
  // Collect all files
  const files: { path: string; content: Buffer }[] = [];
  
  function collectFiles(dir: string, basePath: string = '') {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);
        
        if (shouldExclude(fullPath)) continue;
        
        if (entry.isDirectory()) {
          collectFiles(fullPath, relativePath);
        } else {
          try {
            const stat = fs.statSync(fullPath);
            // Skip files larger than 5MB
            if (stat.size < 5 * 1024 * 1024) {
              const content = fs.readFileSync(fullPath);
              files.push({ path: relativePath, content });
            }
          } catch (e) {
            // Skip unreadable files
          }
        }
      }
    } catch (e) {
      // Skip unreadable directories
    }
  }
  
  collectFiles(PROJECT_ROOT);
  
  // Create tar archive in memory
  const tarBuffer = createTarArchive(files);
  
  // Compress with gzip
  const gzippedBuffer = await gzip(tarBuffer);
  
  return new NextResponse(gzippedBuffer, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': gzippedBuffer.length.toString(),
    },
  });
}

// Create tar archive
function createTarArchive(files: { path: string; content: Buffer }[]): Buffer {
  const chunks: Buffer[] = [];
  
  for (const file of files) {
    // Create tar header (512 bytes)
    const header = Buffer.alloc(512);
    
    // File name (100 bytes)
    const nameBytes = Buffer.from(file.path, 'utf-8');
    nameBytes.copy(header, 0, 0, Math.min(nameBytes.length, 100));
    
    // File mode (8 bytes)
    header.write('0000644 ', 100, 8, 'ascii');
    
    // Owner UID (8 bytes)
    header.write('0000000 ', 108, 8, 'ascii');
    
    // Owner GID (8 bytes)
    header.write('0000000 ', 116, 8, 'ascii');
    
    // File size (12 bytes, octal)
    const sizeStr = file.content.length.toString(8).padStart(11, '0') + ' ';
    header.write(sizeStr, 124, 12, 'ascii');
    
    // Modification time (12 bytes, octal)
    const mtime = Math.floor(Date.now() / 1000);
    const mtimeStr = mtime.toString(8).padStart(11, '0') + ' ';
    header.write(mtimeStr, 136, 12, 'ascii');
    
    // Checksum placeholder
    header.write('        ', 148, 8, 'ascii');
    
    // Type flag (1 byte) - regular file
    header.writeUInt8(0x30, 156); // '0'
    
    // USTAR magic
    header.write('ustar', 257, 5, 'ascii');
    header.writeUInt8(0x00, 262);
    header.write('00', 263, 2, 'ascii');
    
    // Calculate checksum
    let checksum = 0;
    for (let i = 0; i < 512; i++) {
      checksum += header[i];
    }
    const checksumStr = checksum.toString(8).padStart(6, '0') + '  ';
    header.write(checksumStr, 148, 8, 'ascii');
    
    chunks.push(header);
    chunks.push(file.content);
    
    // Padding to 512-byte boundary
    const padding = (512 - (file.content.length % 512)) % 512;
    if (padding > 0) {
      chunks.push(Buffer.alloc(padding));
    }
  }
  
  // End of archive (two 512-byte blocks of zeros)
  chunks.push(Buffer.alloc(1024));
  
  return Buffer.concat(chunks);
}
