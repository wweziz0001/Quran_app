import { NextRequest, NextResponse } from 'next/server';

// Service ports
const AUDIO_SERVICE_PORT = 3002;
const QURAN_SERVICE_PORT = 3001;

// GET - List recitations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surahId = searchParams.get('surahId');
    const reciterId = searchParams.get('reciterId');
    const ayahId = searchParams.get('ayahId');
    const verseGlobal = searchParams.get('verseGlobal');

    // If looking for specific verse by global number
    if (verseGlobal && reciterId) {
      const globalNum = parseInt(verseGlobal, 10);

      // Find the ayah by global number from quran-service
      const ayahResponse = await fetch(`http://localhost:${QURAN_SERVICE_PORT}/ayahs?limit=7000`);
      const ayahData = await ayahResponse.json();

      if (!ayahData.success) {
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch ayahs',
        }, { status: 500 });
      }

      const ayah = ayahData.data?.find((a: { ayahNumberGlobal: number }) => a.ayahNumberGlobal === globalNum);

      if (!ayah) {
        return NextResponse.json({
          success: false,
          error: 'Verse not found',
        }, { status: 404 });
      }

      // Get recitations from audio-service
      const recitationsResponse = await fetch(`http://localhost:${AUDIO_SERVICE_PORT}/recitations?reciterId=${reciterId}`);
      const recitationsData = await recitationsResponse.json();

      if (!recitationsData.success) {
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch recitations',
        }, { status: 500 });
      }

      // Find recitation for this surah
      const recitation = recitationsData.data?.find((r: { surahId: number }) => r.surahId === ayah.surahId);

      if (recitation) {
        return NextResponse.json({
          success: true,
          data: [{
            id: `${recitation.id}-${ayah.id}`,
            reciterId: recitation.reciterId,
            ayahId: ayah.id,
            surahId: ayah.surahId,
            verseGlobal: ayah.ayahNumberGlobal,
            ayahNumber: ayah.ayahNumber,
            audioUrl: recitation.audioUrl,
            audioFormat: recitation.format,
            duration: recitation.durationSeconds,
            quality: recitation.bitrate >= 192 ? 'high' : 'medium',
            isActive: true,
            surahName: ayah.Surah?.nameEnglish,
            surahNameArabic: ayah.Surah?.nameArabic,
            reciter: recitation.Reciter,
          }],
        });
      }

      return NextResponse.json({
        success: false,
        error: 'No recitation found for this verse and reciter',
      }, { status: 404 });
    }

    // Get recitations from audio-service
    const params = new URLSearchParams();
    if (reciterId) params.set('reciterId', reciterId);
    params.set('limit', '200');

    const response = await fetch(`http://localhost:${AUDIO_SERVICE_PORT}/recitations?${params.toString()}`);
    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to fetch recitations' },
        { status: 500 }
      );
    }

    // Transform data to match expected format
    let recitations = (data.data || []).map((r: {
      id: string;
      surahId: number;
      reciterId: string;
      style: string | null;
      bitrate: number;
      format: string;
      audioUrl: string | null;
      durationSeconds: number | null;
      fileSize: number | null;
      isActive: boolean;
      Reciter?: { id: string; nameArabic: string; nameEnglish: string; slug?: string };
      _count?: { RecitationAyah: number };
    }) => ({
      id: r.id,
      surahId: r.surahId,
      reciterId: r.reciterId,
      style: r.style,
      bitrate: r.bitrate,
      format: r.format,
      audioUrl: r.audioUrl,
      duration: r.durationSeconds,
      fileSize: r.fileSize,
      quality: r.bitrate >= 192 ? 'high' : 'medium',
      isActive: r.isActive,
      reciter: r.Reciter,
      ayahCount: r._count?.RecitationAyah || 0,
    }));

    // Filter by surahId if provided
    if (surahId) {
      recitations = recitations.filter((r: { surahId: number }) => r.surahId === parseInt(surahId, 10));
    }

    return NextResponse.json({
      success: true,
      data: recitations,
    });
  } catch (error) {
    console.error('Error fetching recitations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recitations' },
      { status: 500 }
    );
  }
}
