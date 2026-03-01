import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// GET - Fetch pages for an edition
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const editionId = searchParams.get('editionId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');

    if (!editionId) {
      return NextResponse.json(
        { success: false, error: 'Edition ID is required' },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { editionId };
    
    if (search) {
      const pageNum = parseInt(search);
      if (!isNaN(pageNum)) {
        where.pageNumber = pageNum;
      }
    }

    const [pages, total] = await Promise.all([
      db.imageMushafPage.findMany({
        where,
        orderBy: { pageNumber: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.imageMushafPage.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: pages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching mushaf pages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch mushaf pages' },
      { status: 500 }
    );
  }
}

// POST - Upload new page(s)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const editionId = formData.get('editionId') as string;
    const file = formData.get('file') as File | null;
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

    // Check if edition exists
    const edition = await db.imageMushafEdition.findUnique({
      where: { id: editionId },
    });

    if (!edition) {
      return NextResponse.json(
        { success: false, error: 'Edition not found' },
        { status: 404 }
      );
    }

    // Check if page already exists for this edition
    const existingPage = await db.imageMushafPage.findFirst({
      where: { editionId, pageNumber },
    });

    if (existingPage) {
      return NextResponse.json(
        { success: false, error: 'Page number already exists for this edition' },
        { status: 400 }
      );
    }

    let imageUrl = '';

    if (file && file.size > 0) {
      const uploadDir = path.join(process.cwd(), 'public', 'upload', 'mushaf-pages', editionId);
      await mkdir(uploadDir, { recursive: true });

      const ext = file.name.split('.').pop() || 'png';
      const fileName = `page-${pageNumber.toString().padStart(3, '0')}.${ext}`;
      const filePath = path.join(uploadDir, fileName);

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      imageUrl = `/upload/mushaf-pages/${editionId}/${fileName}`;
    } else {
      const url = formData.get('url') as string;
      if (url) {
        imageUrl = url;
      } else {
        return NextResponse.json(
          { success: false, error: 'File or URL is required' },
          { status: 400 }
        );
      }
    }

    const page = await db.imageMushafPage.create({
      data: {
        editionId,
        pageNumber,
        imageUrl,
        width: edition.width,
        height: edition.height,
      },
    });

    return NextResponse.json({
      success: true,
      data: page,
      message: 'تم رفع الصفحة بنجاح',
    });
  } catch (error) {
    console.error('Error uploading page:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload page' },
      { status: 500 }
    );
  }
}

// PUT - Update page
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    const id = formData.get('id') as string;
    const file = formData.get('file') as File | null;
    const pageNumber = formData.get('pageNumber') ? parseInt(formData.get('pageNumber') as string) : undefined;
    const imageUrlOverride = formData.get('url') as string;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Page ID is required' },
        { status: 400 }
      );
    }

    const existingPage = await db.imageMushafPage.findUnique({
      where: { id },
      include: { ImageMushafEdition: true },
    });

    if (!existingPage) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      );
    }

    let imageUrl = existingPage.imageUrl;

    if (file && file.size > 0) {
      const uploadDir = path.join(process.cwd(), 'public', 'upload', 'mushaf-pages', existingPage.editionId);
      await mkdir(uploadDir, { recursive: true });

      const ext = file.name.split('.').pop() || 'png';
      const fileName = `page-${(pageNumber || existingPage.pageNumber).toString().padStart(3, '0')}.${ext}`;
      const filePath = path.join(uploadDir, fileName);

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      imageUrl = `/upload/mushaf-pages/${existingPage.editionId}/${fileName}`;
    } else if (imageUrlOverride) {
      imageUrl = imageUrlOverride;
    }

    const updateData: Record<string, unknown> = { imageUrl };
    if (pageNumber !== undefined) updateData.pageNumber = pageNumber;

    const page = await db.imageMushafPage.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: page,
      message: 'تم تحديث الصفحة بنجاح',
    });
  } catch (error) {
    console.error('Error updating page:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update page' },
      { status: 500 }
    );
  }
}

// DELETE - Delete page
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, editionId, deleteFiles } = body;

    if (!id && !editionId) {
      return NextResponse.json(
        { success: false, error: 'Page ID or Edition ID is required' },
        { status: 400 }
      );
    }

    // Delete single page
    if (id) {
      const page = await db.imageMushafPage.findUnique({
        where: { id },
      });

      if (page) {
        // Delete file
        if (page.imageUrl && page.imageUrl.startsWith('/upload/')) {
          const filePath = path.join(process.cwd(), 'public', page.imageUrl);
          if (existsSync(filePath)) {
            await unlink(filePath);
          }
        }

        await db.imageMushafPage.delete({
          where: { id },
        });
      }
    }

    // Delete all pages for an edition
    if (editionId && deleteFiles) {
      const pages = await db.imageMushafPage.findMany({
        where: { editionId },
      });

      // Delete files
      for (const page of pages) {
        if (page.imageUrl && page.imageUrl.startsWith('/upload/')) {
          const filePath = path.join(process.cwd(), 'public', page.imageUrl);
          if (existsSync(filePath)) {
            await unlink(filePath);
          }
        }
      }

      // Delete from database
      await db.imageMushafPage.deleteMany({
        where: { editionId },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف الصفحة بنجاح',
    });
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete page' },
      { status: 500 }
    );
  }
}
