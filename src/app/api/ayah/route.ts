import { NextRequest, NextResponse } from 'next/server';

// Service ports
const QURAN_SERVICE_PORT = 3001;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surahId = searchParams.get('surahId');
    const surahNumber = searchParams.get('surahNumber');
    const ayahNumber = searchParams.get('ayahNumber');
    const pageNumber = searchParams.get('page');
    const juzNumber = searchParams.get('juz');

    // Build query params for quran-service
    const params = new URLSearchParams();
    if (surahId) params.set('surahId', surahId);
    if (juzNumber) params.set('juz', juzNumber);
    if (pageNumber) params.set('page', pageNumber);

    // Call quran-service
    const response = await fetch(`http://localhost:${QURAN_SERVICE_PORT}/ayahs?${params.toString()}`);
    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to fetch ayahs' },
        { status: 500 }
      );
    }

    // Transform data to match expected format
    const ayahs = (data.data || []).map((a: {
      id: number;
      surahId: number;
      ayahNumber: number;
      ayahNumberGlobal: number;
      textArabic: string;
      textUthmani: string | null;
      textIndopak: string | null;
      pageNumber: number | null;
      juzNumber: number | null;
      hizbNumber: number | null;
      rubNumber: number | null;
      sajdah: boolean;
      sajdahType: string | null;
      wordCount: number | null;
      letterCount: number | null;
      Surah?: { nameArabic: string; nameEnglish: string };
    }) => ({
      id: String(a.id),
      surahId: a.surahId,
      numberInSurah: a.ayahNumber,
      numberGlobal: a.ayahNumberGlobal,
      textArabic: a.textArabic,
      textUthmani: a.textUthmani,
      textIndopak: a.textIndopak,
      pageNumber: a.pageNumber,
      juzNumber: a.juzNumber,
      hizbNumber: a.hizbNumber,
      rubNumber: a.rubNumber,
      sajdah: a.sajdah,
      sajdahType: a.sajdahType,
      wordCount: a.wordCount,
      letterCount: a.letterCount,
      surah: a.Surah ? {
        nameArabic: a.Surah.nameArabic,
        nameEnglish: a.Surah.nameEnglish,
      } : null,
    }));

    // Filter by surahNumber if provided (client-side filter since service uses surahId)
    let filteredAyahs = ayahs;
    if (surahNumber) {
      // Need to get ayahs for this surah number
      const surahResponse = await fetch(`http://localhost:${QURAN_SERVICE_PORT}/surahs/${surahNumber}`);
      const surahData = await surahResponse.json();
      if (surahData.success && surahData.data) {
        const surahIdFromNumber = surahData.data.id;
        filteredAyahs = ayahs.filter((a: { surahId: number }) => a.surahId === surahIdFromNumber);
      }
    }

    // Filter by ayahNumber if provided
    if (ayahNumber) {
      filteredAyahs = filteredAyahs.filter(
        (a: { numberInSurah: number }) => a.numberInSurah === parseInt(ayahNumber, 10)
      );
    }

    return NextResponse.json({
      success: true,
      data: filteredAyahs,
    });
  } catch (error) {
    console.error('Error fetching ayahs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ayahs' },
      { status: 500 }
    );
  }
}
