import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List ayahs with various filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surahId = searchParams.get('surahId');
    const surahNumber = searchParams.get('surahNumber');
    const ayahNumber = searchParams.get('ayahNumber');
    const pageNumber = searchParams.get('page');
    const juzNumber = searchParams.get('juz');

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (surahId) {
      where.surahId = parseInt(surahId, 10);
    }
    
    if (surahNumber) {
      where.Surah = { number: parseInt(surahNumber, 10) };
    }
    
    if (ayahNumber) {
      where.ayahNumber = parseInt(ayahNumber, 10);
    }
    
    if (pageNumber) {
      where.pageNumber = parseInt(pageNumber, 10);
    }
    
    if (juzNumber) {
      where.juzNumber = parseInt(juzNumber, 10);
    }

    const ayahs = await db.ayah.findMany({
      where,
      orderBy: [
        { surahId: 'asc' },
        { ayahNumber: 'asc' },
      ],
      include: {
        Surah: {
          select: {
            id: true,
            number: true,
            nameArabic: true,
            nameEnglish: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: ayahs.map(ayah => ({
        id: String(ayah.id),
        surahId: ayah.surahId,
        numberInSurah: ayah.ayahNumber,
        numberGlobal: ayah.ayahNumberGlobal,
        textArabic: ayah.textArabic,
        textUthmani: ayah.textUthmani,
        textIndopak: ayah.textIndopak,
        pageNumber: ayah.pageNumber,
        juzNumber: ayah.juzNumber,
        hizbNumber: ayah.hizbNumber,
        rubNumber: ayah.rubNumber,
        sajdah: ayah.sajdah,
        sajdahType: ayah.sajdahType,
        wordCount: ayah.wordCount,
        letterCount: ayah.letterCount,
        surah: ayah.Surah,
      })),
    });
  } catch (error) {
    console.error('Error fetching ayahs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ayahs' },
      { status: 500 }
    );
  }
}
