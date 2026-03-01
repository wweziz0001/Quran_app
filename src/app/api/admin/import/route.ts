import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// API URLs for trusted sources
const SOURCES = {
  alquran: 'https://api.alquran.cloud/v1',
  quranCom: 'https://api.quran.com/api/v4',
  cdn: 'https://cdn.islamic.network/quran/audio/128',
};

// GET - Show import status and available sources
export async function GET() {
  try {
    // Check current data counts
    const [surahsCount, ayahsCount, tafsirCount, recitersCount, recitationsCount, recitationAyahsCount] = await Promise.all([
      db.surah.count(),
      db.ayah.count(),
      db.tafsirEntry.count(),
      db.reciter.count(),
      db.recitation.count(),
      db.recitationAyah.count(),
    ]);

    return NextResponse.json({
      success: true,
      currentData: {
        surahs: surahsCount,
        ayahs: ayahsCount,
        tafsirEntries: tafsirCount,
        reciters: recitersCount,
        recitations: recitationsCount,
        recitationAyahs: recitationAyahsCount,
      },
      sources: {
        surahs: {
          name: 'AlQuran Cloud API',
          url: SOURCES.alquran,
          description: 'مصدر موثوق لبيانات السور والآيات',
        },
        ayahs: {
          name: 'AlQuran Cloud API',
          url: SOURCES.alquran,
          description: 'بيانات الآيات الكاملة مع النصوص المتعددة',
        },
        tafsir: {
          name: 'Quran.com Tafsir API',
          url: SOURCES.quranCom,
          description: 'مجموعة من التفاسير المعتمدة',
        },
        reciters: {
          name: 'AlQuran Cloud API',
          url: SOURCES.alquran,
          description: 'قائمة القراء والصوتيات المعتمدة',
        },
      },
    });
  } catch (error) {
    console.error('Error checking import status:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في التحقق من حالة البيانات' },
      { status: 500 }
    );
  }
}

// POST - Import data from trusted sources
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, reciterId } = body; // 'surahs', 'ayahs', 'tafsir', 'reciters', 'all', 'audio'

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'يجب تحديد نوع البيانات للاستيراد' },
        { status: 400 }
      );
    }

    let result: { imported: number; message: string } = { imported: 0, message: '' };

    switch (type) {
      case 'surahs':
        result = await importSurahs();
        break;
      case 'ayahs':
        result = await importAyahs();
        break;
      case 'missing-ayahs':
        result = await importMissingAyahs();
        break;
      case 'tafsir':
        result = await importTafsir();
        break;
      case 'reciters':
        result = await importReciters();
        break;
      case 'audio':
        result = await importAudioFiles(reciterId);
        break;
      case 'all':
        const surahsResult = await importSurahs();
        const ayahsResult = await importAyahs();
        const recitersResult = await importReciters();
        result = {
          imported: surahsResult.imported + ayahsResult.imported + recitersResult.imported,
          message: `تم استيراد: ${surahsResult.message}، ${ayahsResult.message}، ${recitersResult.message}`,
        };
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'نوع بيانات غير معروف' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في الاستيراد: ' + String(error) },
      { status: 500 }
    );
  }
}

// Import Surahs from AlQuran Cloud
async function importSurahs(): Promise<{ imported: number; message: string }> {
  try {
    const response = await fetch(`${SOURCES.alquran}/surah`);
    const data = await response.json();
    
    if (!data.data) {
      throw new Error('لم يتم استلام بيانات السور');
    }

    let imported = 0;
    
    for (const surah of data.data) {
      await db.surah.upsert({
        where: { number: surah.number },
        create: {
          number: surah.number,
          nameArabic: surah.name,
          nameEnglish: surah.englishName,
          nameTransliteration: surah.englishNameTranslation,
          revelationType: surah.revelationType === 'Meccan' ? 'meccan' : 'medinan',
          totalAyahs: surah.numberOfAyahs,
          pageNumberStart: 1,
          juzNumberStart: 1,
        },
        update: {
          nameArabic: surah.name,
          nameEnglish: surah.englishName,
          nameTransliteration: surah.englishNameTranslation,
          revelationType: surah.revelationType === 'Meccan' ? 'meccan' : 'medinan',
          totalAyahs: surah.numberOfAyahs,
        },
      });
      imported++;
    }

    return { imported, message: `تم استيراد ${imported} سورة` };
  } catch (error) {
    console.error('Error importing surahs:', error);
    throw error;
  }
}

// Import Ayahs from AlQuran Cloud - Surah by Surah
async function importAyahs(): Promise<{ imported: number; message: string }> {
  try {
    // Get all surahs first
    const surahsResponse = await fetch(`${SOURCES.alquran}/surah`);
    const surahsData = await surahsResponse.json();
    
    if (!surahsData.data) {
      throw new Error('لم يتم استلام قائمة السور');
    }

    let imported = 0;
    const surahs = surahsData.data;
    
    // Import ayahs for each surah
    for (const surah of surahs) {
      try {
        // Fetch ayahs for this surah
        const ayahsResponse = await fetch(`${SOURCES.alquran}/surah/${surah.number}`);
        const ayahsData = await ayahsResponse.json();
        
        if (!ayahsData.data || !ayahsData.data.ayahs) {
          console.log(`No ayahs data for surah ${surah.number}`);
          continue;
        }

        const ayahs = ayahsData.data.ayahs;
        
        for (const ayah of ayahs) {
          try {
            // Handle sajdah field - can be false or an object { id, recommended, obligatory }
            const sajdahValue = typeof ayah.sajda === 'object' && ayah.sajda !== null;
            const sajdahType = sajdahValue && ayah.sajda.obligatory ? 'obligatory' : 
                              sajdahValue && ayah.sajda.recommended ? 'recommended' : null;

            await db.ayah.upsert({
              where: {
                surahId_ayahNumber: {
                  surahId: surah.number,
                  ayahNumber: ayah.numberInSurah,
                },
              },
              create: {
                surahId: surah.number,
                ayahNumber: ayah.numberInSurah,
                ayahNumberGlobal: ayah.number,
                textArabic: ayah.text,
                textUthmani: ayah.text,
                pageNumber: ayah.page || 1,
                juzNumber: ayah.juz || 1,
                hizbNumber: ayah.hizbQuarter ? Math.ceil(ayah.hizbQuarter / 4) : 1,
                rubNumber: ayah.hizbQuarter || 1,
                sajdah: sajdahValue,
                sajdahType: sajdahType,
              },
              update: {
                textArabic: ayah.text,
                textUthmani: ayah.text,
                pageNumber: ayah.page || 1,
                juzNumber: ayah.juz || 1,
                sajdah: sajdahValue,
                sajdahType: sajdahType,
              },
            });
            imported++;
          } catch (ayahError) {
            console.error(`Error importing ayah ${ayah.numberInSurah} of surah ${surah.number}:`, ayahError);
          }
        }
        
        console.log(`Imported ${ayahs.length} ayahs from surah ${surah.number} (${surah.name})`);
      } catch (surahError) {
        console.error(`Error importing surah ${surah.number}:`, surahError);
      }
    }

    return { imported, message: `تم استيراد ${imported} آية` };
  } catch (error) {
    console.error('Error importing ayahs:', error);
    throw error;
  }
}

// Import only missing ayahs
async function importMissingAyahs(): Promise<{ imported: number; message: string }> {
  try {
    // Get expected ayah counts from API
    const surahsResponse = await fetch(`${SOURCES.alquran}/surah`);
    const surahsData = await surahsResponse.json();
    
    if (!surahsData.data) {
      return { imported: 0, message: 'فشل في الحصول على بيانات السور من API' };
    }

    const apiSurahs = surahsData.data;
    let imported = 0;
    const missingSurahs: { number: number; expected: number; name: string }[] = [];

    // Check each surah for missing ayahs
    for (const apiSurah of apiSurahs) {
      const actualCount = await db.ayah.count({
        where: { surahId: apiSurah.number }
      });

      if (actualCount < apiSurah.numberOfAyahs) {
        missingSurahs.push({
          number: apiSurah.number,
          expected: apiSurah.numberOfAyahs,
          name: apiSurah.name
        });
        console.log(`Surah ${apiSurah.number} (${apiSurah.name}): Missing ${apiSurah.numberOfAyahs - actualCount} ayahs`);
      }
    }

    if (missingSurahs.length === 0) {
      return { imported: 0, message: 'لا توجد آيات ناقصة' };
    }

    // Import missing ayahs for each incomplete surah
    for (const missingSurah of missingSurahs) {
      try {
        const ayahsResponse = await fetch(`${SOURCES.alquran}/surah/${missingSurah.number}`);
        const ayahsData = await ayahsResponse.json();
        
        if (!ayahsData.data || !ayahsData.data.ayahs) {
          console.log(`No ayahs data for surah ${missingSurah.number}`);
          continue;
        }

        const ayahs = ayahsData.data.ayahs;
        
        for (const ayah of ayahs) {
          try {
            // Check if this ayah already exists
            const existing = await db.ayah.findUnique({
              where: {
                surahId_ayahNumber: {
                  surahId: missingSurah.number,
                  ayahNumber: ayah.numberInSurah,
                },
              },
            });

            if (existing) continue; // Skip existing ayahs

            // Handle sajdah field - can be false or an object { id, recommended, obligatory }
            const sajdahValue = typeof ayah.sajda === 'object' && ayah.sajda !== null;
            const sajdahType = sajdahValue && ayah.sajda.obligatory ? 'obligatory' : 
                              sajdahValue && ayah.sajda.recommended ? 'recommended' : null;

            await db.ayah.create({
              data: {
                surahId: missingSurah.number,
                ayahNumber: ayah.numberInSurah,
                ayahNumberGlobal: ayah.number,
                textArabic: ayah.text,
                textUthmani: ayah.text,
                pageNumber: ayah.page || 1,
                juzNumber: ayah.juz || 1,
                hizbNumber: ayah.hizbQuarter ? Math.ceil(ayah.hizbQuarter / 4) : 1,
                rubNumber: ayah.hizbQuarter || 1,
                sajdah: sajdahValue,
                sajdahType: sajdahType,
              },
            });
            imported++;
            console.log(`Added missing ayah ${ayah.numberInSurah} from surah ${missingSurah.number}`);
          } catch (ayahError) {
            console.error(`Error importing ayah ${ayah.numberInSurah} of surah ${missingSurah.number}:`, ayahError);
          }
        }
      } catch (surahError) {
        console.error(`Error importing missing ayahs for surah ${missingSurah.number}:`, surahError);
      }
    }

    // Update totalAyahs fields to reflect actual counts
    for (const missingSurah of missingSurahs) {
      const actualCount = await db.ayah.count({
        where: { surahId: missingSurah.number }
      });
      await db.surah.update({
        where: { number: missingSurah.number },
        data: { totalAyahs: actualCount }
      });
    }

    return { imported, message: `تم استيراد ${imported} آية ناقصة` };
  } catch (error) {
    console.error('Error importing missing ayahs:', error);
    throw error;
  }
}

// Import Tafsir entries
async function importTafsir(): Promise<{ imported: number; message: string }> {
  try {
    // First, ensure we have a tafsir source
    let source = await db.tafsirSource.findFirst({
      where: { slug: 'ibn-kathir' },
    });

    if (!source) {
      source = await db.tafsirSource.create({
        data: {
          id: 'tafsir-ibn-kathir',
          nameArabic: 'تفسير ابن كثير',
          nameEnglish: 'Tafsir Ibn Kathir',
          slug: 'ibn-kathir',
          authorArabic: 'عماد الدين ابن كثير',
          authorEnglish: 'Ismail ibn Kathir',
          language: 'ar',
          isDefault: true,
          isActive: true,
          updatedAt: new Date(),
        },
      });
    }

    return { 
      imported: 1, 
      message: 'تم إنشاء مصدر التفسير. البيانات الكاملة تحتاج لمصدر خارجي.' 
    };
  } catch (error) {
    console.error('Error importing tafsir:', error);
    throw error;
  }
}

// Import Reciters from AlQuran Cloud API
async function importReciters(): Promise<{ imported: number; message: string }> {
  try {
    console.log('Fetching audio editions from AlQuran Cloud API...');
    
    // Fetch audio editions from AlQuran Cloud API
    const response = await fetch(`${SOURCES.alquran}/edition/format/audio`);
    const data = await response.json();
    
    if (!data.data) {
      throw new Error('لم يتم استلام بيانات القراء من API');
    }

    // Filter only Arabic verse-by-verse reciters
    const arabicReciters = data.data.filter((edition: { 
      identifier: string; 
      language: string; 
      type: string;
      name: string;
      englishName: string;
    }) => 
      edition.language === 'ar' && 
      (edition.type === 'versebyverse' || edition.type === 'translation')
    );

    console.log(`Found ${arabicReciters.length} Arabic audio editions`);

    let imported = 0;
    let updated = 0;
    
    for (const reciter of arabicReciters) {
      // Create a slug from the identifier
      const slug = reciter.identifier.replace(/^ar\./, '').replace(/-/g, '_');
      
      // Check if reciter already exists
      const existing = await db.reciter.findFirst({
        where: {
          OR: [
            { apiIdentifier: reciter.identifier },
            { slug: slug }
          ]
        }
      });

      if (existing) {
        // Update existing reciter
        await db.reciter.update({
          where: { id: existing.id },
          data: {
            apiIdentifier: reciter.identifier,
            nameArabic: reciter.name,
            nameEnglish: reciter.englishName,
            hasHighQuality: true,
            hasGapless: false,
          }
        });
        updated++;
      } else {
        // Create new reciter
        await db.reciter.create({
          data: {
            slug: slug,
            apiIdentifier: reciter.identifier,
            nameArabic: reciter.name,
            nameEnglish: reciter.englishName,
            hasHighQuality: true,
            hasGapless: false,
            popularity: imported + 1,
            isActive: true,
          }
        });
        imported++;
      }
    }

    return { imported: imported + updated, message: `تم استيراد ${imported} قارئ وتحديث ${updated} قارئ` };
  } catch (error) {
    console.error('Error importing reciters:', error);
    throw error;
  }
}

// Import Audio Files (Verse-by-Verse) from AlQuran Cloud CDN
async function importAudioFiles(reciterId?: string): Promise<{ imported: number; message: string }> {
  try {
    // Get reciter(s) from database
    let reciters;
    if (reciterId) {
      const reciter = await db.reciter.findUnique({
        where: { id: reciterId }
      });
      if (!reciter || !reciter.apiIdentifier) {
        return { imported: 0, message: `القارئ غير موجود أو لا يملك معرف API` };
      }
      reciters = [reciter];
    } else {
      // Get all reciters with API identifiers
      reciters = await db.reciter.findMany({
        where: { 
          apiIdentifier: { not: null },
          isActive: true 
        }
      });
    }

    if (reciters.length === 0) {
      return { imported: 0, message: 'لا يوجد قراء مع معرفات API صالحة. قم باستيراد القراء أولاً.' };
    }

    let totalImported = 0;
    
    for (const reciter of reciters) {
      if (!reciter.apiIdentifier) continue;
      
      const result = await importAudioForReciter(reciter);
      totalImported += result.imported;
    }

    return { imported: totalImported, message: `تم استيراد ${totalImported} ملف صوتي للآيات` };
  } catch (error) {
    console.error('Error importing audio files:', error);
    throw error;
  }
}

// Import audio for a specific reciter
async function importAudioForReciter(
  reciter: { id: string; apiIdentifier: string; nameArabic: string; nameEnglish: string }
): Promise<{ imported: number; message: string }> {
  console.log(`\n=== Importing audio for: ${reciter.nameArabic} (${reciter.apiIdentifier}) ===`);

  // Get all ayahs from database
  const ayahs = await db.ayah.findMany({
    select: { id: true, ayahNumberGlobal: true, surahId: true, ayahNumber: true },
    orderBy: { ayahNumberGlobal: 'asc' }
  });

  console.log(`Total ayahs to process: ${ayahs.length}`);
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  // Import audio for each ayah
  for (let i = 0; i < ayahs.length; i++) {
    const ayah = ayahs[i];
    if (!ayah.ayahNumberGlobal) continue;

    try {
      // Check if audio already exists for this ayah and reciter
      const existing = await db.recitationAyah.findFirst({
        where: {
          ayahId: ayah.id,
          Recitation: {
            reciterId: reciter.id,
          }
        }
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Build audio URL from CDN
      // Format: https://cdn.islamic.network/quran/audio/128/{identifier}/{ayahNumberGlobal}.mp3
      const audioUrl = `${SOURCES.cdn}/${reciter.apiIdentifier}/${ayah.ayahNumberGlobal}.mp3`;
      
      // Create or get recitation record for this surah
      let recitation = await db.recitation.findFirst({
        where: {
          surahId: ayah.surahId,
          reciterId: reciter.id,
        }
      });

      if (!recitation) {
        recitation = await db.recitation.create({
          data: {
            id: `${reciter.id}-${ayah.surahId}-${Date.now()}`,
            surahId: ayah.surahId,
            reciterId: reciter.id,
            style: 'murattal',
            bitrate: 128,
            format: 'mp3',
            audioUrl: '',
            isActive: true,
            updatedAt: new Date(),
          }
        });
      }

      // Create recitation ayah
      await db.recitationAyah.create({
        data: {
          id: `${reciter.id}-${ayah.id}-${Date.now()}`,
          recitationId: recitation.id,
          ayahId: ayah.id,
          startTime: 0,
          endTime: 0,
          audioUrl: audioUrl,
          durationMs: null,
        }
      });

      imported++;
      
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
    if ((i + 1) % 100 === 0) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  console.log(`\nCompleted: ${imported} imported, ${skipped} skipped, ${errors} errors`);
  return { imported, message: `تم استيراد ${imported} ملف صوتي للقارئ ${reciter.nameArabic}` };
}
