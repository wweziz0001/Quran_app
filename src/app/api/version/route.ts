import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = process.cwd();

// GET - Get current version info
export async function GET() {
  try {
    const versionPath = path.join(PROJECT_ROOT, 'VERSION');
    const changelogPath = path.join(PROJECT_ROOT, 'changelog', 'CHANGELOG.md');
    
    let version = '1.0.0';
    let changelogExists = false;
    
    if (fs.existsSync(versionPath)) {
      version = fs.readFileSync(versionPath, 'utf-8').trim();
    }
    
    if (fs.existsSync(changelogPath)) {
      changelogExists = true;
    }
    
    // Parse version
    const [major, minor, patch] = version.split('.').map(Number);
    
    return NextResponse.json({
      success: true,
      version,
      parsed: {
        major: major || 1,
        minor: minor || 0,
        patch: patch || 0,
      },
      changelogExists,
      downloadFilename: `quran-app-v${version}`,
    });
  } catch (error) {
    console.error('Error reading version:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read version' },
      { status: 500 }
    );
  }
}

// POST - Update version (for future use)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type } = body; // 'major', 'minor', 'patch'
    
    const versionPath = path.join(PROJECT_ROOT, 'VERSION');
    let version = '1.0.0';
    
    if (fs.existsSync(versionPath)) {
      version = fs.readFileSync(versionPath, 'utf-8').trim();
    }
    
    const [major, minor, patch] = version.split('.').map(Number);
    let newVersion = version;
    
    switch (type) {
      case 'major':
        newVersion = `${(major || 1) + 1}.0.0`;
        break;
      case 'minor':
        newVersion = `${major || 1}.${(minor || 0) + 1}.0`;
        break;
      case 'patch':
        newVersion = `${major || 1}.${minor || 0}.${(patch || 0) + 1}`;
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid version type. Use: major, minor, or patch' },
          { status: 400 }
        );
    }
    
    fs.writeFileSync(versionPath, newVersion + '\n');
    
    return NextResponse.json({
      success: true,
      previousVersion: version,
      newVersion,
    });
  } catch (error) {
    console.error('Error updating version:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update version' },
      { status: 500 }
    );
  }
}
