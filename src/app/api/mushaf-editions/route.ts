import { NextResponse } from 'next/server';

// Quran Service port
const QURAN_SERVICE_PORT = 3001;

export async function GET() {
  try {
    // Call quran-service for mushaf editions
    const response = await fetch(`http://localhost:${QURAN_SERVICE_PORT}/mushafs`);
    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to fetch mushaf editions' },
        { status: 500 }
      );
    }

    // Transform data to match expected format
    const editions = (data.data || []).map((e: {
      id: string;
      name: string;
      description: string | null;
      style: string | null;
      linesPerPage: number;
      isDefault: boolean;
    }) => ({
      id: e.id,
      nameArabic: e.name,
      nameEnglish: e.name,
      slug: e.id,
      type: e.style || 'image',
      description: e.description,
      isDefault: e.isDefault,
      isActive: true,
      linesPerPage: e.linesPerPage,
    }));

    return NextResponse.json({
      success: true,
      data: editions,
    });
  } catch (error) {
    console.error('Error fetching mushaf editions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch mushaf editions' },
      { status: 500 }
    );
  }
}
