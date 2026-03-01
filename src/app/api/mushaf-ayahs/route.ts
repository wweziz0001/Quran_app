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

    // Get all ayahs on this page with their line/bound information
    // In production, this would come from a MushafAyahLine table
    // For now, we return ayahs from the database without line bounds
    
    const ayahs = await db.ayah.findMany({
      where: { pageNumber: page },
      orderBy: { ayahNumberGlobal: 'asc' },
      select: {
        id: true,
        ayahNumber: true,
        surah: {
          select: {
            number: true,
          },
        },
      },
    });

    // Transform data for the mushaf viewer
    // In production, this would include actual line bounds from the MushafAyahLine table
    const mushafAyahs = ayahs.map((ayah, index) => ({
      id: String(ayah.id),
      surahNumber: ayah.surah.number,
      ayahNumber: ayah.ayahNumber,
      lines: [
        {
          id: `line-${ayah.id}-1`,
          lineNumber: 1,
          bounds: {
            minX: 50,
            maxX: 750,
            minY: 50 + index * 40,
            maxY: 80 + index * 40,
          },
        },
      ],
    }));

    return NextResponse.json({
      success: true,
      data: mushafAyahs,
    });
  } catch (error) {
    console.error('Error fetching mushaf ayahs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch mushaf ayahs' },
      { status: 500 }
    );
  }
}
