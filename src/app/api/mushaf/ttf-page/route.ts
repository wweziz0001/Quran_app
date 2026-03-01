import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const editionId = searchParams.get('editionId');
    const pageNumber = searchParams.get('page');

    if (!pageNumber) {
      return NextResponse.json(
        { error: 'Page number is required' },
        { status: 400 }
      );
    }

    const page = parseInt(pageNumber, 10);

    if (page < 1 || page > 604) {
      return NextResponse.json(
        { error: 'Page number must be between 1 and 604' },
        { status: 400 }
      );
    }

    // Get all ayahs on this page with their words
    const ayahs = await db.ayah.findMany({
      where: { pageNumber: page },
      orderBy: { ayahNumberGlobal: 'asc' },
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

    if (ayahs.length === 0) {
      return NextResponse.json({
        edition: {
          id: editionId || 'default',
          name: 'Hafs',
          type: 'ttf',
        },
        page: {
          number: page,
          fontUrl: null,
          totalAyat: 0,
          surahs: [],
        },
        lines: [],
        ayat: [],
      });
    }

    // Get unique surahs on this page
    const surahsMap = new Map();
    ayahs.forEach(a => {
      if (!surahsMap.has(a.Surah.number)) {
        surahsMap.set(a.Surah.number, {
          number: a.Surah.number,
          name: a.Surah.nameArabic,
        });
      }
    });
    const surahsInfo = Array.from(surahsMap.values());

    // Build words array from ayahs
    // In production, this would come from a MushafWord table with actual word positions
    // For now, we split the Arabic text into words
    const allWords: Array<{
      id: string;
      text: string;
      discriminator: number;
      wordNumber: number;
      ayahNumber: number;
      surahNumber: number;
      ayahId: string;
    }> = [];

    ayahs.forEach((ayah) => {
      // Split Arabic text into words
      const words = ayah.textArabic.split(' ').filter(w => w.trim());
      
      words.forEach((wordText, idx) => {
        allWords.push({
          id: `word-${ayah.id}-${idx}`,
          text: wordText,
          discriminator: 0, // Normal word
          wordNumber: idx + 1,
          ayahNumber: ayah.ayahNumber,
          surahNumber: ayah.Surah.number,
          ayahId: String(ayah.id),
        });
      });

      // Add ayah end marker (discriminator 11)
      allWords.push({
        id: `ayah-end-${ayah.id}`,
        text: '',
        discriminator: 11, // Ayah end marker
        wordNumber: 999,
        ayahNumber: ayah.ayahNumber,
        surahNumber: ayah.Surah.number,
        ayahId: String(ayah.id),
      });
    });

    // Distribute words across lines (typically 15 lines per page)
    const linesCount = 15;
    const wordsPerLine = Math.ceil(allWords.length / linesCount);
    const lines = [];

    for (let i = 0; i < linesCount; i++) {
      const startIdx = i * wordsPerLine;
      const endIdx = startIdx + wordsPerLine;
      const lineWords = allWords.slice(startIdx, endIdx);

      if (lineWords.length > 0) {
        lines.push({
          lineNumber: i + 1,
          words: lineWords,
        });
      }
    }

    // Build ayat array
    const ayat = ayahs.map(ayah => ({
      id: String(ayah.id),
      ayahId: ayah.id,
      surahNumber: ayah.Surah.number,
      ayahNumber: ayah.ayahNumber,
      quarter: null, // Would come from actual data
      wordCount: ayah.wordCount || ayah.textArabic.split(' ').length,
    }));

    return NextResponse.json({
      edition: {
        id: editionId || 'default',
        name: 'Hafs',
        type: 'ttf',
      },
      page: {
        number: page,
        fontUrl: null, // In production: `/fonts/mushaf-${editionId}/page-${page}.ttf`
        totalAyat: ayahs.length,
        surahs: surahsInfo,
      },
      lines,
      ayat,
    });
  } catch (error) {
    console.error('Error fetching TTF page:', error);
    return NextResponse.json(
      { error: 'Failed to fetch TTF page data' },
      { status: 500 }
    );
  }
}
