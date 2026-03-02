import { NextRequest, NextResponse } from 'next/server';

// Service ports
const QURAN_SERVICE_PORT = 3001;
const TAFSIR_SERVICE_PORT = 3004;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const surahNumber = parseInt(id, 10);

    if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
      return NextResponse.json(
        { success: false, error: 'Invalid surah number' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const translation = searchParams.get('translation') || 'en-sahih';

    // Fetch surah info and ayahs from quran-service
    const [surahResponse, ayahsResponse] = await Promise.all([
      fetch(`http://localhost:${QURAN_SERVICE_PORT}/surahs/${surahNumber}`),
      fetch(`http://localhost:${QURAN_SERVICE_PORT}/surahs/${surahNumber}/ayahs?limit=300`),
    ]);

    const surahData = await surahResponse.json();
    const ayahsData = await ayahsResponse.json();

    if (!surahData.success) {
      return NextResponse.json(
        { success: false, error: surahData.error || 'Surah not found' },
        { status: 404 }
      );
    }

    // Fetch translations for all ayahs from tafsir-service
    const ayahIds = ayahsData.data?.map((a: { id: number }) => a.id) || [];
    const translationPromises = ayahIds.map((ayahId: number) =>
      fetch(`http://localhost:${TAFSIR_SERVICE_PORT}/translations/ayah/${ayahId}?sourceId=${translation}`)
        .then(r => r.json())
        .catch(() => ({ success: false, data: [] }))
    );

    const translationsResults = await Promise.all(translationPromises);
    const translationsMap = new Map<number, { text: string; sourceName: string } | null>();

    ayahIds.forEach((ayahId: number, index: number) => {
      const result = translationsResults[index];
      if (result.success && result.data?.length > 0) {
        const t = result.data[0];
        translationsMap.set(ayahId, {
          text: t.text,
          sourceName: t.TranslationSource?.name || 'Unknown',
        });
      } else {
        translationsMap.set(ayahId, null);
      }
    });

    // Transform data to match expected format
    const surah = surahData.data;
    const ayahs = ayahsData.data || [];

    return NextResponse.json({
      success: true,
      data: {
        id: surah.id,
        number: surah.number,
        nameArabic: surah.nameArabic,
        nameEnglish: surah.nameEnglish,
        nameTransliteration: surah.nameTransliteration,
        revelationType: surah.revelationType,
        totalAyahs: surah.totalAyahs,
        pageNumberStart: surah.pageNumberStart,
        juzNumberStart: surah.juzNumberStart,
        description: surah.description,
        ayahs: ayahs.map((a: { id: number; ayahNumber: number; ayahNumberGlobal: number; textArabic: string; textUthmani: string | null; pageNumber: number | null; juzNumber: number | null; hizbNumber: number | null; sajdah: boolean }) => ({
          id: a.id,
          ayahNumber: a.ayahNumber,
          ayahNumberGlobal: a.ayahNumberGlobal,
          textArabic: a.textArabic,
          textUthmani: a.textUthmani,
          pageNumber: a.pageNumber,
          juzNumber: a.juzNumber,
          hizbNumber: a.hizbNumber,
          sajdah: a.sajdah,
          translation: translationsMap.get(a.id) || null,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching surah:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch surah' },
      { status: 500 }
    );
  }
}
