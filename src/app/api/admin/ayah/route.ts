import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Create a new ayah
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      surahId, 
      numberInSurah, 
      textArabic, 
      juzNumber, 
      pageNumber 
    } = body;

    // Validation
    if (!surahId || !textArabic) {
      return NextResponse.json(
        { success: false, error: 'Surah ID and Arabic text are required' },
        { status: 400 }
      );
    }

    // Get the surah to calculate global ayah number
    const surah = await db.surah.findUnique({
      where: { id: parseInt(surahId, 10) },
      include: {
        ayahs: {
          orderBy: { ayahNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!surah) {
      return NextResponse.json(
        { success: false, error: 'Surah not found' },
        { status: 404 }
      );
    }

    // Calculate the number in surah if not provided
    const ayahNum = numberInSurah || (surah.ayahs[0]?.ayahNumber || 0) + 1;
    
    // Calculate global ayah number
    const previousSurahs = await db.surah.findMany({
      where: { number: { lt: surah.number } },
      select: { totalAyahs: true },
    });
    const previousAyahsCount = previousSurahs.reduce((sum, s) => sum + s.totalAyahs, 0);
    const globalNumber = previousAyahsCount + ayahNum;

    // Create ayah
    const ayah = await db.ayah.create({
      data: {
        surahId: parseInt(surahId, 10),
        ayahNumber: ayahNum,
        ayahNumberGlobal: globalNumber,
        textArabic,
        textUthmani: textArabic,
        pageNumber: parseInt(pageNumber, 10) || 1,
        juzNumber: parseInt(juzNumber, 10) || 1,
        hizbNumber: 1,
        rubNumber: 1,
        sajdah: false,
      },
    });

    // Update surah's total ayahs count
    await db.surah.update({
      where: { id: parseInt(surahId, 10) },
      data: { totalAyahs: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: String(ayah.id),
        surahId: ayah.surahId,
        numberInSurah: ayah.ayahNumber,
        numberGlobal: ayah.ayahNumberGlobal,
        textArabic: ayah.textArabic,
        juzNumber: ayah.juzNumber,
        pageNumber: ayah.pageNumber,
      },
    });
  } catch (error) {
    console.error('Error creating ayah:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create ayah' },
      { status: 500 }
    );
  }
}

// PUT - Update an ayah
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, 
      numberInSurah, 
      textArabic, 
      juzNumber, 
      pageNumber 
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Ayah ID is required' },
        { status: 400 }
      );
    }

    // Check if ayah exists
    const existingAyah = await db.ayah.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!existingAyah) {
      return NextResponse.json(
        { success: false, error: 'Ayah not found' },
        { status: 404 }
      );
    }

    // Update ayah
    const ayah = await db.ayah.update({
      where: { id: parseInt(id, 10) },
      data: {
        ...(numberInSurah !== undefined && { ayahNumber: parseInt(numberInSurah, 10) }),
        ...(textArabic && { textArabic }),
        ...(juzNumber !== undefined && { juzNumber: parseInt(juzNumber, 10) }),
        ...(pageNumber !== undefined && { pageNumber: parseInt(pageNumber, 10) }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: String(ayah.id),
        surahId: ayah.surahId,
        numberInSurah: ayah.ayahNumber,
        textArabic: ayah.textArabic,
        juzNumber: ayah.juzNumber,
        pageNumber: ayah.pageNumber,
      },
    });
  } catch (error) {
    console.error('Error updating ayah:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update ayah' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an ayah
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Ayah ID is required' },
        { status: 400 }
      );
    }

    // Check if ayah exists
    const existingAyah = await db.ayah.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!existingAyah) {
      return NextResponse.json(
        { success: false, error: 'Ayah not found' },
        { status: 404 }
      );
    }

    const surahId = existingAyah.surahId;

    // Delete related records first
    await db.tafsirEntry.deleteMany({
      where: { ayahId: parseInt(id, 10) },
    });

    await db.translationEntry.deleteMany({
      where: { ayahId: parseInt(id, 10) },
    });

    await db.recitationAyah.deleteMany({
      where: { ayahId: parseInt(id, 10) },
    });

    await db.bookmark.deleteMany({
      where: { ayahId: parseInt(id, 10) },
    });

    await db.readingHistory.deleteMany({
      where: { ayahId: parseInt(id, 10) },
    });

    // Delete ayah
    await db.ayah.delete({
      where: { id: parseInt(id, 10) },
    });

    // Update surah's total ayahs count
    await db.surah.update({
      where: { id: surahId },
      data: { totalAyahs: { decrement: 1 } },
    });

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error('Error deleting ayah:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete ayah' },
      { status: 500 }
    );
  }
}
