import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Import audio files from URL pattern (OPTIMIZED)
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

    console.log(`🚀 Starting optimized import for ${reciter.nameEnglish}...`);

    // 1. Get all ayahs in one query
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

    console.log(`📚 Found ${ayahs.length} ayahs`);

    // 2. Get all existing recitation ayahs for this reciter in one query
    const existingAudio = await db.recitationAyah.findMany({
      where: {
        Recitation: {
          reciterId: reciter.id,
        },
        ayahId: { in: ayahs.map(a => a.id) },
      },
      select: { ayahId: true },
    });
    const existingAyahIds = new Set(existingAudio.map(a => a.ayahId));
    console.log(`⏭️ Skipping ${existingAyahIds.size} existing`);

    // 3. Get or create recitations for all surahs (batch)
    const surahIds = [...new Set(ayahs.map(a => a.surahId))];
    let recitations = await db.recitation.findMany({
      where: {
        surahId: { in: surahIds },
        reciterId: reciter.id,
      },
    });
    const recitationMap = new Map(recitations.map(r => [r.surahId, r]));

    // Create missing recitations
    const missingSurahIds = surahIds.filter(s => !recitationMap.has(s));
    const bitrate = quality === 'lossless' ? 320 : quality === 'high' ? 192 : quality === 'medium' ? 128 : 64;

    if (missingSurahIds.length > 0) {
      const newRecitations = await db.recitation.createMany({
        data: missingSurahIds.map(surahId => ({
          id: `${reciter.id}-${surahId}-${Date.now()}`,
          surahId,
          reciterId: reciter.id,
          style: 'murattal',
          bitrate,
          format: 'mp3',
          audioUrl: '',
          isActive: true,
          updatedAt: new Date(),
        })),
        skipDuplicates: true,
      });
      console.log(`📝 Created ${newRecitations.count} new recitations`);

      // Re-fetch recitations
      recitations = await db.recitation.findMany({
        where: {
          surahId: { in: surahIds },
          reciterId: reciter.id,
        },
      });
      recitations.forEach(r => recitationMap.set(r.surahId, r));
    }

    // 4. Prepare batch insert
    const toImport = ayahs.filter(a => !existingAyahIds.has(a.id));
    console.log(`🎵 Importing ${toImport.length} audio files...`);

    const batchSize = 500;
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < toImport.length; i += batchSize) {
      const batch = toImport.slice(i, i + batchSize);

      const dataToInsert = batch.map(ayah => {
        const recitation = recitationMap.get(ayah.surahId);
        const audioUrl = urlPattern.replace('{ayah_id}', String(ayah.ayahNumberGlobal));
        return {
          id: `${reciter.id}-${ayah.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          recitationId: recitation!.id,
          ayahId: ayah.id,
          startTime: 0,
          endTime: 0,
          audioUrl,
          durationMs: null,
        };
      });

      try {
        await db.recitationAyah.createMany({
          data: dataToInsert,
          skipDuplicates: true,
        });
        imported += batch.length;
        console.log(`✅ Progress: ${imported}/${toImport.length}`);
      } catch (err) {
        errors += batch.length;
        console.error(`❌ Batch error:`, err);
      }
    }

    console.log(`\n🎉 Completed: ${imported} imported, ${existingAyahIds.size} skipped, ${errors} errors`);

    return NextResponse.json({
      success: true,
      data: {
        imported,
        skipped: existingAyahIds.size,
        errors,
        total: ayahs.length,
      },
      message: `تم استيراد ${imported} ملف صوتي، تم تخطي ${existingAyahIds.size} ملف موجود مسبقاً`,
    });
  } catch (error) {
    console.error('Error in bulk import:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في استيراد الملفات الصوتية: ' + String(error) },
      { status: 500 }
    );
  }
}
