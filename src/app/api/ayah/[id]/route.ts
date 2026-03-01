import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ayahId = parseInt(id, 10);
    const { searchParams } = new URL(request.url);
    const translation = searchParams.get('translation') || 'en-sahih';
    const tafsir = searchParams.get('tafsir');

    const ayah = await db.ayah.findUnique({
      where: { id: ayahId },
      include: {
        surah: true,
        translationEntries: {
          where: {
            source: { languageCode: translation },
          },
          include: {
            source: { select: { name: true, languageCode: true } },
          },
        },
        tafsirEntries: tafsir
          ? {
              where: {
                source: { slug: tafsir },
              },
              include: {
                source: { select: { nameEnglish: true, nameArabic: true } },
              },
            }
          : undefined,
      },
    });

    if (!ayah) {
      return NextResponse.json(
        { success: false, error: 'Ayah not found' },
        { status: 404 }
      );
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
        surah: {
          id: ayah.surah.id,
          number: ayah.surah.number,
          nameArabic: ayah.surah.nameArabic,
          nameEnglish: ayah.surah.nameEnglish,
        },
        translation: ayah.translationEntries[0]
          ? {
              text: ayah.translationEntries[0].text,
              source: ayah.translationEntries[0].source,
            }
          : null,
        tafsir: ayah.tafsirEntries?.[0] || null,
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
