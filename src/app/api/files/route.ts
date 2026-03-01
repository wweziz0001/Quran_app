import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = process.cwd();

// Allowed directories for security - updated to be more flexible
const ALLOWED_PATTERNS = [
  /^src\//,           // src/**/*
  /^prisma\//,        // prisma/**/*
  /^docs\//,          // docs/**/*
  /^public\//,        // public/**/*
  /^changelog\//,     // changelog/**/*
  /^components\.json$/,
  /^package\.json$/,
  /^tsconfig\.json$/,
  /^tailwind\.config\.ts$/,
  /^next\.config\.ts$/,
  /^\.env\.example$/,
  /^bun\.lockb$/,
  /^postcss\.config\.mjs$/,
  /^VERSION$/,              // VERSION file
  /^README\.md$/,           // README.md file
  /^AI_INSTRUCTIONS\.md$/,  // AI Instructions
  /^DEVELOPMENT_GUIDE\.md$/, // Development Guide
  /^\.cursorrules$/,        // Cursor rules
  /^Caddyfile$/,            // Caddy config
  /^eslint\.config\.mjs$/,  // ESLint config
];

// Excluded patterns (even if in allowed directories)
const EXCLUDED_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /\.env$/,
  /\.env\.local$/,
  /\.env\..*\.local$/,
];

function isPathAllowed(filePath: string): boolean {
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  
  // Normalize path separators
  const normalizedPath = relativePath.replace(/\\/g, '/');
  
  // Check if path is excluded
  for (const pattern of EXCLUDED_PATTERNS) {
    if (pattern.test(normalizedPath)) {
      return false;
    }
  }
  
  // Check if path matches allowed patterns
  for (const pattern of ALLOWED_PATTERNS) {
    if (pattern.test(normalizedPath)) {
      return true;
    }
  }
  
  return false;
}

function getFileTree(dir: string, basePath: string = ''): FileNode[] {
  const items: FileNode[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);
      
      // Skip hidden files and excluded directories
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '.next') {
        continue;
      }
      
      if (entry.isDirectory()) {
        items.push({
          name: entry.name,
          type: 'directory',
          path: relativePath,
          children: getFileTree(fullPath, relativePath),
        });
      } else {
        const ext = path.extname(entry.name);
        items.push({
          name: entry.name,
          type: 'file',
          path: relativePath,
          extension: ext,
          size: fs.statSync(fullPath).size,
        });
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  // Sort: directories first, then files
  return items.sort((a, b) => {
    if (a.type === 'directory' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });
}

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  extension?: string;
  size?: number;
  children?: FileNode[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const filePath = searchParams.get('path');

    if (action === 'tree') {
      const tree = getFileTree(PROJECT_ROOT);
      return NextResponse.json({
        success: true,
        data: tree,
      });
    }

    if (action === 'read' && filePath) {
      const fullPath = path.join(PROJECT_ROOT, filePath);
      
      // Security: resolve and check path
      const resolvedPath = path.resolve(fullPath);
      if (!resolvedPath.startsWith(PROJECT_ROOT)) {
        return NextResponse.json(
          { success: false, error: 'Access denied - invalid path' },
          { status: 403 }
        );
      }
      
      // Security check
      if (!isPathAllowed(resolvedPath)) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }

      if (!fs.existsSync(resolvedPath)) {
        return NextResponse.json(
          { success: false, error: 'File not found' },
          { status: 404 }
        );
      }

      const stats = fs.statSync(resolvedPath);
      
      if (stats.isDirectory()) {
        const children = getFileTree(resolvedPath, filePath);
        return NextResponse.json({
          success: true,
          data: {
            type: 'directory',
            children,
          },
        });
      }

      // Check file size (max 1MB)
      if (stats.size > 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: 'File too large' },
          { status: 400 }
        );
      }

      const content = fs.readFileSync(resolvedPath, 'utf-8');
      const ext = path.extname(resolvedPath);
      
      return NextResponse.json({
        success: true,
        data: {
          type: 'file',
          content,
          extension: ext,
          size: stats.size,
          lastModified: stats.mtime,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('File API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: filePath, content } = body;

    if (!filePath || content === undefined) {
      return NextResponse.json(
        { success: false, error: 'Path and content are required' },
        { status: 400 }
      );
    }

    const fullPath = path.join(PROJECT_ROOT, filePath);
    const resolvedPath = path.resolve(fullPath);
    
    // Security: ensure path is within project
    if (!resolvedPath.startsWith(PROJECT_ROOT)) {
      return NextResponse.json(
        { success: false, error: 'Access denied - invalid path' },
        { status: 403 }
      );
    }
    
    // Security check
    if (!isPathAllowed(resolvedPath)) {
      return NextResponse.json(
        { success: false, error: `Access denied for: ${filePath}` },
        { status: 403 }
      );
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // Check if it's a file (not a directory)
    const stats = fs.statSync(resolvedPath);
    if (stats.isDirectory()) {
      return NextResponse.json(
        { success: false, error: 'Cannot save to directory' },
        { status: 400 }
      );
    }

    // Create backup
    const backupPath = resolvedPath + '.backup';
    try {
      fs.copyFileSync(resolvedPath, backupPath);
    } catch (backupError) {
      console.error('Failed to create backup:', backupError);
      // Continue without backup if it fails
    }

    // Write new content
    fs.writeFileSync(resolvedPath, content, 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'File saved successfully',
      backup: backupPath,
    });
  } catch (error) {
    console.error('File write error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to save file';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    // Handle file upload (multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const uploadPath = formData.get('path') as string;
      
      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No file provided' },
          { status: 400 }
        );
      }
      
      if (!uploadPath) {
        return NextResponse.json(
          { success: false, error: 'Upload path is required' },
          { status: 400 }
        );
      }
      
      // Construct full path
      const filePath = uploadPath === '/' ? file.name : `${uploadPath}/${file.name}`;
      const fullPath = path.join(PROJECT_ROOT, filePath);
      const resolvedPath = path.resolve(fullPath);
      
      // Security: ensure path is within project
      if (!resolvedPath.startsWith(PROJECT_ROOT)) {
        return NextResponse.json(
          { success: false, error: 'Access denied - invalid path' },
          { status: 403 }
        );
      }
      
      // Security check
      if (!isPathAllowed(resolvedPath)) {
        return NextResponse.json(
          { success: false, error: `Access denied for: ${filePath}` },
          { status: 403 }
        );
      }
      
      // Check file size (max 10MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: 'File size exceeds 10MB limit' },
          { status: 400 }
        );
      }
      
      // Create directory if it doesn't exist
      const dir = path.dirname(resolvedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write file
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fs.writeFileSync(resolvedPath, buffer);
      
      return NextResponse.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          name: file.name,
          path: filePath,
          size: file.size,
          type: file.type,
        },
      });
    }
    
    // Handle create file/directory (JSON)
    const body = await request.json();
    const { path: filePath, type } = body;

    if (!filePath || !type) {
      return NextResponse.json(
        { success: false, error: 'Path and type are required' },
        { status: 400 }
      );
    }

    const fullPath = path.join(PROJECT_ROOT, filePath);
    const resolvedPath = path.resolve(fullPath);
    
    // Security: ensure path is within project
    if (!resolvedPath.startsWith(PROJECT_ROOT)) {
      return NextResponse.json(
        { success: false, error: 'Access denied - invalid path' },
        { status: 403 }
      );
    }
    
    // Security check
    if (!isPathAllowed(resolvedPath)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    if (type === 'directory') {
      fs.mkdirSync(resolvedPath, { recursive: true });
      return NextResponse.json({
        success: true,
        message: 'Directory created',
      });
    }

    if (type === 'file') {
      const dir = path.dirname(resolvedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(resolvedPath, '', 'utf-8');
      return NextResponse.json({
        success: true,
        message: 'File created',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('File create/upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create/upload' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldPath, newPath } = body;

    if (!oldPath || !newPath) {
      return NextResponse.json(
        { success: false, error: 'Old path and new path are required' },
        { status: 400 }
      );
    }

    const oldFullPath = path.join(PROJECT_ROOT, oldPath);
    const newFullPath = path.join(PROJECT_ROOT, newPath);
    const resolvedOldPath = path.resolve(oldFullPath);
    const resolvedNewPath = path.resolve(newFullPath);
    
    // Security: ensure paths are within project
    if (!resolvedOldPath.startsWith(PROJECT_ROOT) || !resolvedNewPath.startsWith(PROJECT_ROOT)) {
      return NextResponse.json(
        { success: false, error: 'Access denied - invalid path' },
        { status: 403 }
      );
    }
    
    // Security check
    if (!isPathAllowed(resolvedOldPath) || !isPathAllowed(resolvedNewPath)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if old path exists
    if (!fs.existsSync(resolvedOldPath)) {
      return NextResponse.json(
        { success: false, error: 'File or folder not found' },
        { status: 404 }
      );
    }

    // Check if new path already exists
    if (fs.existsSync(resolvedNewPath)) {
      return NextResponse.json(
        { success: false, error: 'A file or folder with this name already exists' },
        { status: 400 }
      );
    }

    // Rename
    fs.renameSync(resolvedOldPath, resolvedNewPath);

    return NextResponse.json({
      success: true,
      message: 'Renamed successfully',
      data: {
        oldPath,
        newPath,
      },
    });
  } catch (error) {
    console.error('File rename error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to rename' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'Path is required' },
        { status: 400 }
      );
    }

    const fullPath = path.join(PROJECT_ROOT, filePath);
    const resolvedPath = path.resolve(fullPath);
    
    // Security: ensure path is within project
    if (!resolvedPath.startsWith(PROJECT_ROOT)) {
      return NextResponse.json(
        { success: false, error: 'Access denied - invalid path' },
        { status: 403 }
      );
    }
    
    // Security check
    if (!isPathAllowed(resolvedPath)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 }
      );
    }

    const stats = fs.statSync(resolvedPath);
    
    if (stats.isDirectory()) {
      fs.rmSync(resolvedPath, { recursive: true });
    } else {
      fs.unlinkSync(resolvedPath);
    }

    return NextResponse.json({
      success: true,
      message: 'Deleted successfully',
    });
  } catch (error) {
    console.error('File delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete' },
      { status: 500 }
    );
  }
}
