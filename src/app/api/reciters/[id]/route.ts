import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get a single reciter by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reciter = await db.reciter.findUnique({
      where: { id },
      include: {
        _count: {
          select: { Recitation: true },
        },
      },
    });

    if (!reciter) {
      return NextResponse.json(
        { success: false, error: 'Reciter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: reciter.id,
        nameArabic: reciter.nameArabic,
        nameEnglish: reciter.nameEnglish,
        slug: reciter.slug,
        bio: reciter.bio,
        imageUrl: reciter.imageUrl,
        country: reciter.country,
        style: 'Hafs',
        biography: reciter.bio,
        hasHighQuality: reciter.hasHighQuality,
        hasGapless: reciter.hasGapless,
        popularity: reciter.popularity,
        isActive: reciter.isActive,
        isFeatured: reciter.popularity >= 90,
        recitationsCount: reciter._count.Recitation,
        createdAt: reciter.createdAt,
        updatedAt: reciter.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching reciter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reciter' },
      { status: 500 }
    );
  }
}

// PUT - Update a reciter
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nameArabic, nameEnglish, slug, country, style, biography, isActive, isFeatured, apiIdentifier } = body;

    // Check if reciter exists
    const existingReciter = await db.reciter.findUnique({
      where: { id },
    });

    if (!existingReciter) {
      return NextResponse.json(
        { success: false, error: 'Reciter not found' },
        { status: 404 }
      );
    }

    // Check if new slug conflicts with another reciter
    if (slug && slug !== existingReciter.slug) {
      const slugConflict = await db.reciter.findUnique({
        where: { slug },
      });

      if (slugConflict) {
        return NextResponse.json(
          { success: false, error: 'A reciter with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Update reciter
    const reciter = await db.reciter.update({
      where: { id },
      data: {
        ...(nameArabic && { nameArabic }),
        ...(nameEnglish && { nameEnglish }),
        ...(slug && { slug }),
        ...(apiIdentifier !== undefined && { apiIdentifier }),
        country: country !== undefined ? country : existingReciter.country,
        bio: biography !== undefined ? biography : existingReciter.bio,
        isActive: isActive !== undefined ? isActive : existingReciter.isActive,
        popularity: isFeatured !== undefined 
          ? (isFeatured ? 90 : 50) 
          : existingReciter.popularity,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: reciter.id,
        nameArabic: reciter.nameArabic,
        nameEnglish: reciter.nameEnglish,
        slug: reciter.slug,
        apiIdentifier: reciter.apiIdentifier,
        country: reciter.country,
        isActive: reciter.isActive,
        isFeatured: reciter.popularity >= 90,
      },
    });
  } catch (error) {
    console.error('Error updating reciter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update reciter' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a reciter
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if reciter exists
    const existingReciter = await db.reciter.findUnique({
      where: { id },
      include: {
        _count: {
          select: { Recitation: true },
        },
      },
    });

    if (!existingReciter) {
      return NextResponse.json(
        { success: false, error: 'Reciter not found' },
        { status: 404 }
      );
    }

    // Delete all recitations first (cascade)
    await db.recitation.deleteMany({
      where: { reciterId: id },
    });

    // Delete reciter
    await db.reciter.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: {
        deleted: true,
        recitationsDeleted: existingReciter._count.Recitation,
      },
    });
  } catch (error) {
    console.error('Error deleting reciter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete reciter' },
      { status: 500 }
    );
  }
}
