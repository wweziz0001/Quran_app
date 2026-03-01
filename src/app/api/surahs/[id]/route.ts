import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const surahId = parseInt(id, 10);
    const { searchParams } = new URL(request.url);
    const translation = searchParams.get('translation') || 'en-sahih';

    const surah = await db.surah.findUnique({
      where: { id: surahId },
      include: {
        ayahs: {
          orderBy: { ayahNumber: 'asc' },
          include: {
            translationEntries: {
              where: {
                source: { languageCode: translation },
              },
              include: {
                source: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!surah) {
      return NextResponse.json(
        { success: false, error: 'Surah not found' },
        { status: 404 }
      );
    }

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
        ayahs: surah.ayahs.map(a => ({
          id: a.id,
          ayahNumber: a.ayahNumber,
          ayahNumberGlobal: a.ayahNumberGlobal,
          textArabic: a.textArabic,
          textUthmani: a.textUthmani,
          pageNumber: a.pageNumber,
          juzNumber: a.juzNumber,
          hizbNumber: a.hizbNumber,
          sajdah: a.sajdah,
          translation: a.translationEntries[0]
            ? {
                text: a.translationEntries[0].text,
                sourceName: a.translationEntries[0].source.name,
              }
            : null,
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
