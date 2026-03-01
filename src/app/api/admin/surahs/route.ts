import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Create a new surah
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { number, nameArabic, nameEnglish, nameTransliteration, revelationType, totalAyahs } = body;

    // Validation
    if (!nameArabic || !nameEnglish) {
      return NextResponse.json(
        { success: false, error: 'Name (Arabic) and Name (English) are required' },
        { status: 400 }
      );
    }

    // Check if surah number already exists
    if (number) {
      const existingSurah = await db.surah.findUnique({
        where: { number: parseInt(number, 10) },
      });

      if (existingSurah) {
        return NextResponse.json(
          { success: false, error: 'A surah with this number already exists' },
          { status: 400 }
        );
      }
    }

    // Create surah
    const surah = await db.surah.create({
      data: {
        number: parseInt(number, 10) || (await db.surah.count()) + 1,
        nameArabic,
        nameEnglish,
        nameTransliteration: nameTransliteration || nameEnglish,
        revelationType: revelationType || 'meccan',
        totalAyahs: parseInt(totalAyahs, 10) || 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: surah,
    });
  } catch (error) {
    console.error('Error creating surah:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create surah' },
      { status: 500 }
    );
  }
}

// PUT - Update a surah
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, number, nameArabic, nameEnglish, nameTransliteration, revelationType, totalAyahs } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Surah ID is required' },
        { status: 400 }
      );
    }

    // Check if surah exists
    const existingSurah = await db.surah.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!existingSurah) {
      return NextResponse.json(
        { success: false, error: 'Surah not found' },
        { status: 404 }
      );
    }

    // Update surah
    const surah = await db.surah.update({
      where: { id: parseInt(id, 10) },
      data: {
        ...(number !== undefined && { number: parseInt(number, 10) }),
        ...(nameArabic && { nameArabic }),
        ...(nameEnglish && { nameEnglish }),
        ...(nameTransliteration && { nameTransliteration }),
        ...(revelationType && { revelationType }),
        ...(totalAyahs !== undefined && { totalAyahs: parseInt(totalAyahs, 10) }),
      },
    });

    return NextResponse.json({
      success: true,
      data: surah,
    });
  } catch (error) {
    console.error('Error updating surah:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update surah' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a surah
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Surah ID is required' },
        { status: 400 }
      );
    }

    // Check if surah exists
    const existingSurah = await db.surah.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        _count: {
          select: { ayahs: true },
        },
      },
    });

    if (!existingSurah) {
      return NextResponse.json(
        { success: false, error: 'Surah not found' },
        { status: 404 }
      );
    }

    // Delete all ayahs first (cascade)
    await db.ayah.deleteMany({
      where: { surahId: parseInt(id, 10) },
    });

    // Delete surah
    await db.surah.delete({
      where: { id: parseInt(id, 10) },
    });

    return NextResponse.json({
      success: true,
      data: {
        deleted: true,
        ayahsDeleted: existingSurah._count.ayahs,
      },
    });
  } catch (error) {
    console.error('Error deleting surah:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete surah' },
      { status: 500 }
    );
  }
}
