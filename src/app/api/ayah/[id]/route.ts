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
    const ayahId = parseInt(id, 10);

    if (isNaN(ayahId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ayah ID' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const translation = searchParams.get('translation') || 'en-sahih';
    const tafsir = searchParams.get('tafsir');

    // Fetch ayah from quran-service
    const ayahResponse = await fetch(`http://localhost:${QURAN_SERVICE_PORT}/ayahs/${ayahId}`);
    const ayahData = await ayahResponse.json();

    if (!ayahData.success) {
      return NextResponse.json(
        { success: false, error: ayahData.error || 'Ayah not found' },
        { status: 404 }
      );
    }

    const ayah = ayahData.data;

    // Fetch translation from tafsir-service
    let translationData = null;
    try {
      const translationResponse = await fetch(
        `http://localhost:${TAFSIR_SERVICE_PORT}/translations/ayah/${ayahId}?sourceId=${translation}`
      );
      const translationResult = await translationResponse.json();
      if (translationResult.success && translationResult.data?.length > 0) {
        const t = translationResult.data[0];
        translationData = {
          text: t.text,
          source: {
            name: t.TranslationSource?.name || 'Unknown',
            languageCode: t.TranslationSource?.language || 'en',
          },
        };
      }
    } catch {
      // Translation not available
    }

    // Fetch tafsir if requested
    let tafsirData = null;
    if (tafsir) {
      try {
        const tafsirResponse = await fetch(
          `http://localhost:${TAFSIR_SERVICE_PORT}/tafsir/ayah/${ayahId}?sourceId=${tafsir}`
        );
        const tafsirResult = await tafsirResponse.json();
        if (tafsirResult.success && tafsirResult.data?.length > 0) {
          tafsirData = tafsirResult.data[0];
        }
      } catch {
        // Tafsir not available
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: ayah.id,
        ayahNumber: ayah.ayahNumber,
        ayahNumberGlobal: ayah.ayahNumberGlobal,
        textArabic: ayah.textArabic,
        textUthmani: ayah.textUthmani,
        pageNumber: ayah.pageNumber,
        juzNumber: ayah.juzNumber,
        hizbNumber: ayah.hizbNumber,
        sajdah: ayah.sajdah,
        surah: ayah.Surah ? {
          id: ayah.Surah.id,
          number: ayah.Surah.number,
          nameArabic: ayah.Surah.nameArabic,
          nameEnglish: ayah.Surah.nameEnglish,
        } : null,
        translation: translationData,
        tafsir: tafsirData,
      },
    });
  } catch (error) {
    console.error('Error fetching ayah:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ayah' },
      { status: 500 }
    );
  }
}
