import { NextResponse } from 'next/server';

// Quran Service port
const QURAN_SERVICE_PORT = 3001;

export async function GET() {
  try {
    // Call quran-service directly from server side
    const response = await fetch(`http://localhost:${QURAN_SERVICE_PORT}/surahs`);
    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to fetch surahs' },
        { status: 500 }
      );
    }

    // Transform data to match expected format
    const surahs = data.data.map((s: { id: number; number: number; nameArabic: string; nameEnglish: string; nameTransliteration: string | null; revelationType: string; totalAyahs: number; pageNumberStart: number | null; juzNumberStart: number | null; description: string | null; _count?: { Ayah: number } }) => ({
      id: s.id,
      number: s.number,
      nameArabic: s.nameArabic,
      nameEnglish: s.nameEnglish,
      nameTransliteration: s.nameTransliteration,
      revelationType: s.revelationType,
      totalAyahs: s.totalAyahs,
      pageNumberStart: s.pageNumberStart,
      juzNumberStart: s.juzNumberStart,
      description: s.description,
      ayahCount: s._count?.Ayah || s.totalAyahs,
    }));

    return NextResponse.json({
      success: true,
      data: surahs,
    });
  } catch (error) {
    console.error('Error fetching surahs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch surahs' },
      { status: 500 }
    );
  }
}
