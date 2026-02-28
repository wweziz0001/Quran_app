import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const editionId = searchParams.get('editionId');
    const pageNumber = searchParams.get('pageNumber');

    if (!pageNumber) {
      return NextResponse.json(
        { success: false, error: 'pageNumber is required' },
        { status: 400 }
      );
    }

    const page = parseInt(pageNumber, 10);

    if (page < 1 || page > 604) {
      return NextResponse.json(
        { success: false, error: 'Page number must be between 1 and 604' },
        { status: 400 }
      );
    }

    // Get all ayahs on this page
    const ayahs = await db.ayah.findMany({
      where: { pageNumber: page },
      orderBy: { ayahNumberGlobal: 'asc' },
      include: {
        surah: {
          select: {
            id: true,
            number: true,
            nameArabic: true,
          },
        },
      },
    });

    // Group ayahs by line (simplified - in production this would come from a MushafLine table)
    // For now, we'll put all ayahs on one page
    const lines = [
      {
        lineNumber: 1,
        ayahs: ayahs.map(ayah => ({
          id: String(ayah.id),
          surahNumber: ayah.surah.number,
          ayahNumber: ayah.ayahNumber,
          text: ayah.textArabic,
        })),
      },
    ];

    // If we have many ayahs, split them into multiple lines
    if (ayahs.length > 3) {
      const linesArray = [];
      const ayahsPerLine = Math.ceil(ayahs.length / 15);
      
      for (let i = 0; i < ayahs.length; i += ayahsPerLine) {
        linesArray.push({
          lineNumber: Math.floor(i / ayahsPerLine) + 1,
          ayahs: ayahs.slice(i, i + ayahsPerLine).map(ayah => ({
            id: String(ayah.id),
            surahNumber: ayah.surah.number,
            ayahNumber: ayah.ayahNumber,
            text: ayah.textArabic,
          })),
        });
      }
      
      return NextResponse.json({
        success: true,
        data: {
          pageNumber: page,
          lines: linesArray,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        pageNumber: page,
        lines,
      },
    });
  } catch (error) {
    console.error('Error fetching TTF mushaf page:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch TTF mushaf page' },
      { status: 500 }
    );
  }
}
