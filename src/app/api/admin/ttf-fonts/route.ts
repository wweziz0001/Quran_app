import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// GET - Fetch fonts for an edition
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const editionId = searchParams.get('editionId');

    if (!editionId) {
      return NextResponse.json(
        { success: false, error: 'Edition ID is required' },
        { status: 400 }
      );
    }

    const fonts = await db.ttfMushafPage.findMany({
      where: { editionId },
      orderBy: { pageNumber: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: fonts,
    });
  } catch (error) {
    console.error('Error fetching fonts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fonts' },
      { status: 500 }
    );
  }
}

// POST - Upload new font
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const editionId = formData.get('editionId') as string;
    const fontFile = formData.get('fontFile') as File | null;
    const pageNumber = parseInt(formData.get('pageNumber') as string);

    if (!editionId) {
      return NextResponse.json(
        { success: false, error: 'Edition ID is required' },
        { status: 400 }
      );
    }

    if (!pageNumber || isNaN(pageNumber)) {
      return NextResponse.json(
        { success: false, error: 'Page number is required' },
        { status: 400 }
      );
    }

    if (!fontFile || fontFile.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Font file is required' },
        { status: 400 }
      );
    }

    // Check if edition exists
    const edition = await db.ttfMushafEdition.findUnique({
      where: { id: editionId },
    });

    if (!edition) {
      return NextResponse.json(
        { success: false, error: 'Edition not found' },
        { status: 404 }
      );
    }

    // Check if font already exists for this page
    const existingFont = await db.ttfMushafPage.findUnique({
      where: { editionId_pageNumber: { editionId, pageNumber } },
    });

    if (existingFont) {
      // Delete existing font file
      if (existingFont.fontUrl) {
        const existingPath = path.join(process.cwd(), 'public', existingFont.fontUrl);
        if (existsSync(existingPath)) {
          await unlink(existingPath);
        }
      }
      
      // Update existing record with new file
      const fontsDir = path.join(process.cwd(), 'public', 'fonts', 'ttf', editionId);
      await mkdir(fontsDir, { recursive: true });

      const ext = fontFile.name.split('.').pop() || 'ttf';
      const fileName = `p${pageNumber.toString().padStart(3, '0')}.${ext}`;
      const fontPath = path.join(fontsDir, fileName);

      const fontBytes = await fontFile.arrayBuffer();
      const fontBuffer = Buffer.from(fontBytes);
      await writeFile(fontPath, fontBuffer);

      const fontUrl = `/fonts/ttf/${editionId}/${fileName}`;

      const font = await db.ttfMushafPage.update({
        where: { id: existingFont.id },
        data: {
          fontUrl,
          fileName,
          fileSize: fontFile.size,
        },
      });

      return NextResponse.json({
        success: true,
        data: font,
        message: 'تم تحديث ملف الخط بنجاح',
      });
    }

    // Save font file
    const fontsDir = path.join(process.cwd(), 'public', 'fonts', 'ttf', editionId);
    await mkdir(fontsDir, { recursive: true });

    const ext = fontFile.name.split('.').pop() || 'ttf';
    const fileName = `p${pageNumber.toString().padStart(3, '0')}.${ext}`;
    const fontPath = path.join(fontsDir, fileName);

    const fontBytes = await fontFile.arrayBuffer();
    const fontBuffer = Buffer.from(fontBytes);
    await writeFile(fontPath, fontBuffer);

    const fontUrl = `/fonts/ttf/${editionId}/${fileName}`;

    const font = await db.ttfMushafPage.create({
      data: {
        editionId,
        pageNumber,
        fontUrl,
        fileName,
        fileSize: fontFile.size,
      },
    });

    return NextResponse.json({
      success: true,
      data: font,
      message: 'تم رفع ملف الخط بنجاح',
    });
  } catch (error) {
    console.error('Error uploading font:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload font' },
      { status: 500 }
    );
  }
}

// DELETE - Delete font
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, editionId, deleteAll } = body;

    if (!id && !editionId) {
      return NextResponse.json(
        { success: false, error: 'Font ID or Edition ID is required' },
        { status: 400 }
      );
    }

    // Delete single font
    if (id) {
      const font = await db.ttfMushafPage.findUnique({
        where: { id },
      });

      if (font && font.fontUrl) {
        const fontPath = path.join(process.cwd(), 'public', font.fontUrl);
        if (existsSync(fontPath)) {
          await unlink(fontPath);
        }
      }

      await db.ttfMushafPage.delete({
        where: { id },
      });
    }

    // Delete all fonts for an edition
    if (editionId && deleteAll) {
      const fonts = await db.ttfMushafPage.findMany({
        where: { editionId },
      });

      for (const font of fonts) {
        if (font.fontUrl) {
          const fontPath = path.join(process.cwd(), 'public', font.fontUrl);
          if (existsSync(fontPath)) {
            await unlink(fontPath);
          }
        }
      }

      await db.ttfMushafPage.deleteMany({
        where: { editionId },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف ملف الخط بنجاح',
    });
  } catch (error) {
    console.error('Error deleting font:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete font' },
      { status: 500 }
    );
  }
}
