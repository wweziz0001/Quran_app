import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List recitations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surahId = searchParams.get('surahId');
    const reciterId = searchParams.get('reciterId');
    const ayahId = searchParams.get('ayahId');
    const verseGlobal = searchParams.get('verseGlobal');

    const where: Record<string, unknown> = { isActive: true };
    if (surahId) where.surahId = parseInt(surahId, 10);
    if (reciterId) where.reciterId = reciterId;

    // If looking for specific verse by global number
    if (verseGlobal && reciterId) {
      const globalNum = parseInt(verseGlobal, 10);
      
      // Find the ayah by global number
      const ayah = await db.ayah.findFirst({
        where: { ayahNumberGlobal: globalNum },
        include: {
          Surah: {
            select: {
              id: true,
              number: true,
              nameArabic: true,
              nameEnglish: true,
            },
          },
        },
      });

      if (!ayah) {
        return NextResponse.json({
          success: false,
          error: 'Verse not found',
        }, { status: 404 });
      }

      // Find recitation for this ayah
      const recitationAyahs = await db.recitationAyah.findMany({
        where: {
          ayahId: ayah.id,
          Recitation: { reciterId },
        },
        include: {
          Recitation: {
            include: {
              Reciter: true,
              Surah: true,
            },
          },
        },
      });

      // If we have specific ayah timing data
      if (recitationAyahs.length > 0) {
        return NextResponse.json({
          success: true,
          data: recitationAyahs.map(ra => ({
            id: ra.id,
            reciterId: ra.Recitation.reciterId,
            ayahId: ayah.id,
            surahId: ayah.surahId,
            verseGlobal: ayah.ayahNumberGlobal,
            ayahNumber: ayah.ayahNumber,
            audioUrl: ra.audioUrl || ra.Recitation.audioUrl,
            audioFormat: ra.Recitation.format,
            startTime: ra.startTime,
            endTime: ra.endTime,
            duration: ra.durationMs ? Math.floor(ra.durationMs / 1000) : null,
            quality: ra.Recitation.bitrate >= 192 ? 'high' : 'medium',
            isActive: true,
            surahName: ayah.Surah.nameEnglish,
            surahNameArabic: ayah.Surah.nameArabic,
            reciter: ra.Recitation.Reciter,
          })),
        });
      }

      // Fallback: get the surah recitation and return with timing estimate
      const surahRecitation = await db.recitation.findFirst({
        where: {
          reciterId,
          surahId: ayah.surahId,
          isActive: true,
        },
        include: {
          Reciter: true,
          Surah: true,
          RecitationAyah: {
            where: { ayahId: ayah.id },
          },
        },
      });

      if (surahRecitation) {
        const ra = surahRecitation.RecitationAyah[0];
        return NextResponse.json({
          success: true,
          data: [{
            id: `${surahRecitation.id}-${ayah.id}`,
            reciterId: surahRecitation.reciterId,
            ayahId: ayah.id,
            surahId: ayah.surahId,
            verseGlobal: ayah.ayahNumberGlobal,
            ayahNumber: ayah.ayahNumber,
            audioUrl: ra?.audioUrl || surahRecitation.audioUrl,
            audioFormat: surahRecitation.format,
            startTime: ra?.startTime || 0,
            endTime: ra?.endTime || 0,
            duration: ra?.durationMs ? Math.floor(ra.durationMs / 1000) : null,
            quality: surahRecitation.bitrate >= 192 ? 'high' : 'medium',
            isActive: true,
            surahName: ayah.Surah.nameEnglish,
            surahNameArabic: ayah.Surah.nameArabic,
            reciter: surahRecitation.Reciter,
          }],
        });
      }

      return NextResponse.json({
        success: false,
        error: 'No recitation found for this verse and reciter',
      }, { status: 404 });
    }

    // If looking for specific ayah recitations
    if (ayahId && reciterId) {
      const recitationAyahs = await db.recitationAyah.findMany({
        where: {
          ayahId: parseInt(ayahId, 10),
          Recitation: { reciterId },
        },
        include: {
          Recitation: {
            include: {
              Reciter: true,
              Surah: true,
            },
          },
          Ayah: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: recitationAyahs.map(ra => ({
          id: ra.id,
          reciterId: ra.Recitation.reciterId,
          ayahId: ra.ayahId,
          surahId: ra.Recitation.surahId,
          audioUrl: ra.audioUrl || ra.Recitation.audioUrl,
          audioFormat: ra.Recitation.format,
          duration: ra.durationMs ? Math.floor(ra.durationMs / 1000) : null,
          quality: ra.Recitation.bitrate >= 192 ? 'high' : 'medium',
          isActive: true,
          ayahNumber: ra.Ayah.ayahNumber,
          surahName: ra.Recitation.Surah.nameEnglish,
        })),
      });
    }

    // Get all recitation ayahs for a reciter (verse-level audio files)
    if (reciterId) {
      const recitationAyahs = await db.recitationAyah.findMany({
        where: {
          Recitation: { reciterId },
        },
        include: {
          Recitation: {
            include: {
              Reciter: {
                select: {
                  id: true,
                  nameArabic: true,
                  nameEnglish: true,
                  slug: true,
                },
              },
              Surah: {
                select: {
                  id: true,
                  number: true,
                  nameArabic: true,
                  nameEnglish: true,
                },
              },
            },
          },
          Ayah: {
            select: {
              id: true,
              ayahNumber: true,
              ayahNumberGlobal: true,
            },
          },
        },
        orderBy: [{ Ayah: { ayahNumberGlobal: 'asc' } }],
      });

      return NextResponse.json({
        success: true,
        data: recitationAyahs.map(ra => ({
          id: ra.id,
          recitationId: ra.recitationId,
          reciterId: ra.Recitation.reciterId,
          ayahId: ra.ayahId,
          surahId: ra.Recitation.surahId,
          ayahNumber: ra.Ayah.ayahNumber,
          verseGlobal: ra.Ayah.ayahNumberGlobal,
          audioUrl: ra.audioUrl,
          audioFormat: ra.Recitation.format,
          duration: ra.durationMs ? Math.floor(ra.durationMs / 1000) : null,
          quality: ra.Recitation.bitrate >= 192 ? 'high' : 'medium',
          isActive: true,
          surahName: ra.Recitation.Surah.nameEnglish,
          surahNameArabic: ra.Recitation.Surah.nameArabic,
          reciter: ra.Recitation.Reciter,
        })),
      });
    }

    // Get all recitations (surah-level)
    const recitations = await db.recitation.findMany({
      where,
      include: {
        Reciter: {
          select: {
            id: true,
            nameArabic: true,
            nameEnglish: true,
            slug: true,
          },
        },
        Surah: {
          select: {
            id: true,
            number: true,
            nameArabic: true,
            nameEnglish: true,
          },
        },
        _count: {
          select: { RecitationAyah: true },
        },
      },
      orderBy: [{ Surah: { number: 'asc' } }],
    });

    return NextResponse.json({
      success: true,
      data: recitations.map(r => ({
        id: r.id,
        surahId: r.surahId,
        reciterId: r.reciterId,
        style: r.style,
        bitrate: r.bitrate,
        format: r.format,
        audioUrl: r.audioUrl,
        audioUrlHd: r.audioUrlHd,
        duration: r.durationSeconds,
        fileSize: r.fileSize,
        quality: r.bitrate >= 192 ? 'high' : 'medium',
        isActive: r.isActive,
        surahName: r.Surah.nameEnglish,
        reciter: r.Reciter,
        surah: r.Surah,
        ayahCount: r._count.RecitationAyah,
      })),
    });
  } catch (error) {
    console.error('Error fetching recitations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recitations' },
      { status: 500 }
    );
  }
}

// DELETE - Delete recitations or single audio file
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reciterId = searchParams.get('reciterId');
    const recitationId = searchParams.get('recitationId');
    const recitationAyahId = searchParams.get('recitationAyahId');

    // Delete single RecitationAyah (single audio file)
    if (recitationAyahId) {
      await db.recitationAyah.delete({
        where: { id: recitationAyahId },
      });

      return NextResponse.json({
        success: true,
        data: { deleted: 1 },
      });
    }

    if (recitationId) {
      // Delete single recitation (surah level)
      await db.recitationAyah.deleteMany({
        where: { recitationId },
      });
      
      await db.recitation.delete({
        where: { id: recitationId },
      });

      return NextResponse.json({
        success: true,
        data: { deleted: 1 },
      });
    }

    if (reciterId) {
      // Delete all recitations for a reciter
      const recitations = await db.recitation.findMany({
        where: { reciterId },
        select: { id: true },
      });

      const recitationIds = recitations.map(r => r.id);

      // Delete all recitation ayahs first
      await db.recitationAyah.deleteMany({
        where: { recitationId: { in: recitationIds } },
      });

      // Delete all recitations
      const result = await db.recitation.deleteMany({
        where: { reciterId },
      });

      return NextResponse.json({
        success: true,
        data: { deleted: result.count },
      });
    }

    return NextResponse.json(
      { success: false, error: 'reciterId, recitationId, or recitationAyahId is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error deleting recitations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete recitations' },
      { status: 500 }
    );
  }
}
