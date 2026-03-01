import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const surahs = await db.surah.findMany({
      orderBy: { number: 'asc' },
      include: {
        _count: {
          select: { Ayah: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: surahs.map(s => ({
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
        ayahCount: s._count.Ayah,
      })),
    });
  } catch (error) {
    console.error('Error fetching surahs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch surahs' },
      { status: 500 }
    );
  }
}
