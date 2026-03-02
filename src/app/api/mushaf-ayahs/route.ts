import { NextRequest, NextResponse } from 'next/server';

// Quran Service port
const QURAN_SERVICE_PORT = 3001;

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

    // Call quran-service for ayahs by page
    const response = await fetch(`http://localhost:${QURAN_SERVICE_PORT}/ayahs?page=${page}&limit=50`);
    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to fetch mushaf ayahs' },
        { status: 500 }
      );
    }

    // Filter ayahs by page number
    const ayahs = (data.data || []).filter(
      (a: { pageNumber: number | null }) => a.pageNumber === page
    );

    // Transform data for the mushaf viewer
    // In production, this would include actual line bounds from the MushafAyahLine table
    const mushafAyahs = ayahs.map((ayah: { id: number; ayahNumber: number; Surah?: { number: number } }, index: number) => ({
      id: String(ayah.id),
      surahNumber: ayah.Surah?.number || 1,
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
