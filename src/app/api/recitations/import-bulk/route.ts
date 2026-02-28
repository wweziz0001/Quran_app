import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Import audio files from URL pattern
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reciterId, urlPattern, ayahFrom, ayahTo, quality } = body;

    // Validation
    if (!reciterId) {
      return NextResponse.json(
        { success: false, error: 'معرف القارئ مطلوب' },
        { status: 400 }
      );
    }

    if (!urlPattern || !urlPattern.includes('{ayah_id}')) {
      return NextResponse.json(
        { success: false, error: 'نمط URL يجب أن يحتوي على {ayah_id}' },
        { status: 400 }
      );
    }

    // Get reciter
    const reciter = await db.reciter.findUnique({
      where: { id: reciterId },
    });

    if (!reciter) {
      return NextResponse.json(
        { success: false, error: 'القارئ غير موجود' },
        { status: 404 }
      );
    }

    const from = ayahFrom || 1;
    const to = ayahTo || 6236;

    if (from < 1 || to > 6236 || from > to) {
      return NextResponse.json(
        { success: false, error: 'نطاق الآيات غير صالح (1-6236)' },
        { status: 400 }
      );
    }

    // Get all ayahs in the specified range
    const ayahs = await db.ayah.findMany({
      where: {
        ayahNumberGlobal: {
          gte: from,
          lte: to,
        },
      },
      select: {
        id: true,
        ayahNumberGlobal: true,
        surahId: true,
        ayahNumber: true,
      },
      orderBy: { ayahNumberGlobal: 'asc' },
    });

    if (ayahs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'لم يتم العثور على آيات في النطاق المحدد' },
        { status: 404 }
      );
    }

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Import audio for each ayah
    for (const ayah of ayahs) {
      try {
        // Check if audio already exists for this ayah and reciter
        const existing = await db.recitationAyah.findFirst({
          where: {
            ayahId: ayah.id,
            Recitation: {
              reciterId: reciter.id,
            },
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Build audio URL from pattern
        const audioUrl = urlPattern.replace('{ayah_id}', String(ayah.ayahNumberGlobal));

        // Create or get recitation record for this surah
        let recitation = await db.recitation.findFirst({
          where: {
            surahId: ayah.surahId,
            reciterId: reciter.id,
          },
        });

        if (!recitation) {
          recitation = await db.recitation.create({
            data: {
              surahId: ayah.surahId,
              reciterId: reciter.id,
              style: 'murattal',
              bitrate: quality === 'lossless' ? 320 : quality === 'high' ? 192 : quality === 'medium' ? 128 : 64,
              format: 'mp3',
              audioUrl: '',
              isActive: true,
            },
          });
        }

        // Create recitation ayah
        await db.recitationAyah.create({
          data: {
            recitationId: recitation.id,
            ayahId: ayah.id,
            startTime: 0,
            endTime: 0,
            audioUrl: audioUrl,
            durationMs: null,
          },
        });

        imported++;

        // Log progress every 500 ayahs
        if (imported % 500 === 0) {
          console.log(`Progress: ${imported}/${ayahs.length} ayahs imported...`);
        }
      } catch (err) {
        errors++;
        if (errors < 10) {
          console.error(`Error importing audio for ayah ${ayah.ayahNumberGlobal}:`, err);
        }
      }

      // Small delay every 100 ayahs to avoid overwhelming the database
      if ((imported + skipped) % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    console.log(`\nCompleted: ${imported} imported, ${skipped} skipped, ${errors} errors`);

    return NextResponse.json({
      success: true,
      data: {
        imported,
        skipped,
        errors,
        total: ayahs.length,
      },
      message: `تم استيراد ${imported} ملف صوتي، تم تخطي ${skipped} ملف موجود مسبقاً`,
    });
  } catch (error) {
    console.error('Error in bulk import:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في استيراد الملفات الصوتية: ' + String(error) },
      { status: 500 }
    );
  }
}
