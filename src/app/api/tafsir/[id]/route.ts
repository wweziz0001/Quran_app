import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get a single tafsir source by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const source = await db.tafsirSource.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tafsirEntries: true },
        },
      },
    });

    if (!source) {
      return NextResponse.json(
        { success: false, error: 'Tafsir source not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: source.id,
        nameArabic: source.nameArabic,
        nameEnglish: source.nameEnglish,
        slug: source.slug,
        authorArabic: source.authorArabic,
        authorEnglish: source.authorEnglish,
        language: source.language,
        description: source.description,
        isDefault: source.isDefault,
        isActive: source.isActive,
        entriesCount: source._count.tafsirEntries,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching tafsir source:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tafsir source' },
      { status: 500 }
    );
  }
}

// PUT - Update a tafsir source
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      nameArabic, 
      nameEnglish, 
      slug, 
      authorArabic, 
      authorEnglish, 
      language, 
      description,
      isDefault, 
      isActive 
    } = body;

    // Check if source exists
    const existingSource = await db.tafsirSource.findUnique({
      where: { id },
    });

    if (!existingSource) {
      return NextResponse.json(
        { success: false, error: 'Tafsir source not found' },
        { status: 404 }
      );
    }

    // Check if new slug conflicts with another source
    if (slug && slug !== existingSource.slug) {
      const slugConflict = await db.tafsirSource.findUnique({
        where: { slug },
      });

      if (slugConflict) {
        return NextResponse.json(
          { success: false, error: 'A tafsir source with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // If this is set as default, unset any existing default
    if (isDefault) {
      await db.tafsirSource.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    // Update source
    const source = await db.tafsirSource.update({
      where: { id },
      data: {
        ...(nameArabic && { nameArabic }),
        ...(nameEnglish && { nameEnglish }),
        ...(slug && { slug }),
        authorArabic: authorArabic !== undefined ? authorArabic : existingSource.authorArabic,
        authorEnglish: authorEnglish !== undefined ? authorEnglish : existingSource.authorEnglish,
        language: language !== undefined ? language : existingSource.language,
        description: description !== undefined ? description : existingSource.description,
        isDefault: isDefault !== undefined ? isDefault : existingSource.isDefault,
        isActive: isActive !== undefined ? isActive : existingSource.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: source.id,
        nameArabic: source.nameArabic,
        nameEnglish: source.nameEnglish,
        slug: source.slug,
        authorArabic: source.authorArabic,
        authorEnglish: source.authorEnglish,
        language: source.language,
        isDefault: source.isDefault,
        isActive: source.isActive,
      },
    });
  } catch (error) {
    console.error('Error updating tafsir source:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update tafsir source' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a tafsir source
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if source exists
    const existingSource = await db.tafsirSource.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tafsirEntries: true },
        },
      },
    });

    if (!existingSource) {
      return NextResponse.json(
        { success: false, error: 'Tafsir source not found' },
        { status: 404 }
      );
    }

    // Delete all tafsir entries first
    await db.tafsirEntry.deleteMany({
      where: { sourceId: id },
    });

    // Delete source
    await db.tafsirSource.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: {
        deleted: true,
        entriesDeleted: existingSource._count.tafsirEntries,
      },
    });
  } catch (error) {
    console.error('Error deleting tafsir source:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete tafsir source' },
      { status: 500 }
    );
  }
}
