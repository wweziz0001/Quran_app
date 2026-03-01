import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Traditional text search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const type = searchParams.get('type') || 'all'; // all, surah, ayah

    if (!q || q.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const results: {
      surahs: unknown[];
      ayahs: unknown[];
    } = {
      surahs: [],
      ayahs: [],
    };

    // Search surahs
    if (type === 'all' || type === 'surah') {
      const surahs = await db.surah.findMany({
        where: {
          OR: [
            { nameArabic: { contains: q } },
            { nameEnglish: { contains: q } },
            { nameTransliteration: { contains: q } },
          ],
        },
        take: 10,
      });
      results.surahs = surahs;
    }

    // Search ayahs
    if (type === 'all' || type === 'ayah') {
      const ayahs = await db.ayah.findMany({
        where: {
          OR: [
            { textArabic: { contains: q } },
            { textUthmani: { contains: q } },
          ],
        },
        include: {
          surah: {
            select: {
              id: true,
              number: true,
              nameArabic: true,
              nameEnglish: true,
            },
          },
        },
        take: 20,
      });
      results.ayahs = ayahs;
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search' },
      { status: 500 }
    );
  }
}

// POST - Semantic/AI-powered search (returns verse results)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 20 } = body;

    if (!query || query.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Search in Arabic text
    const ayahs = await db.ayah.findMany({
      where: {
        OR: [
          { textArabic: { contains: query } },
          { textUthmani: { contains: query } },
        ],
      },
      include: {
        surah: {
          select: {
            id: true,
            number: true,
            nameArabic: true,
            nameEnglish: true,
          },
        },
        translationEntries: {
          where: {
            source: { languageCode: 'en-sahih' },
          },
          select: {
            text: true,
            source: {
              select: {
                name: true,
                languageCode: true,
              },
            },
          },
          take: 1,
        },
      },
      take: limit,
    });

    // Transform results for the semantic search component
    const results = ayahs.map((ayah) => ({
      verse: {
        id: String(ayah.id),
        surahId: ayah.surahId,
        numberInSurah: ayah.ayahNumber,
        numberGlobal: ayah.ayahNumberGlobal,
        textArabic: ayah.textArabic,
        textUthmani: ayah.textUthmani,
        pageNumber: ayah.pageNumber,
        juzNumber: ayah.juzNumber,
        hizbNumber: ayah.hizbNumber,
        rubNumber: ayah.rubNumber,
        sajdah: ayah.sajdah,
        surah: ayah.surah,
        translation: ayah.translationEntries[0]
          ? {
              text: ayah.translationEntries[0].text,
              source: ayah.translationEntries[0].source,
            }
          : null,
      },
      score: 1.0, // In production, use actual similarity score from AI
      highlights: [], // In production, extract highlighted segments
    }));

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in semantic search:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform search' },
      { status: 500 }
    );
  }
}
