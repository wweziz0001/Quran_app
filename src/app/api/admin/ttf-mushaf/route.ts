import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import initSqlJs from 'sql.js';

// GET - List all TTF mushaf editions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const editionId = searchParams.get('editionId');

    // If editionId is provided, get single edition with fonts
    if (editionId) {
      const edition = await db.ttfMushafEdition.findUnique({
        where: { id: editionId },
        include: {
          _count: {
            select: { 
              TtfMushafPage: true, 
              TtfMushafAyah: true, 
              TtfMushafSurah: true,
              TtfMushafWord: true,
              TtfDiscriminator: true,
            },
          },
          TtfMushafPage: {
            select: { pageNumber: true, fileName: true, fileSize: true },
            orderBy: { pageNumber: 'asc' },
            take: 20,
          },
        },
      });

      if (!edition) {
        return NextResponse.json({ success: false, error: 'Edition not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: {
          ...edition,
          stats: {
            fonts: edition._count.TtfMushafPage,
            ayat: edition._count.TtfMushafAyah,
            surahs: edition._count.TtfMushafSurah,
            words: edition._count.TtfMushafWord,
            discriminators: edition._count.TtfDiscriminator,
          },
          _count: undefined,
        },
      });
    }

    // List all editions
    const editions = await db.ttfMushafEdition.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { 
            TtfMushafPage: true, 
            TtfMushafAyah: true, 
            TtfMushafSurah: true,
            TtfMushafWord: true,
            TtfDiscriminator: true,
          },
        },
      },
    });

    const editionsWithStats = editions.map((edition) => ({
      id: edition.id,
      slug: edition.slug,
      nameArabic: edition.nameArabic,
      nameEnglish: edition.nameEnglish,
      description: edition.description,
      narration: edition.narration,
      type: edition.type,
      totalPages: edition.totalPages,
      isDefault: edition.isDefault,
      isActive: edition.isActive,
      specialFontUrl: edition.specialFontUrl,
      createdAt: edition.createdAt.toISOString(),
      stats: {
        fonts: edition._count.TtfMushafPage,
        ayat: edition._count.TtfMushafAyah,
        surahs: edition._count.TtfMushafSurah,
        words: edition._count.TtfMushafWord,
        discriminators: edition._count.TtfDiscriminator,
      },
    }));

    return NextResponse.json({
      success: true,
      data: editionsWithStats,
    });
  } catch (error) {
    console.error('Error fetching TTF mushaf editions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch TTF mushaf editions' },
      { status: 500 }
    );
  }
}

// POST - Create a new TTF mushaf edition with DB and fonts
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const nameArabic = formData.get('nameArabic') as string;
    const nameEnglish = formData.get('nameEnglish') as string;
    const description = formData.get('description') as string | null;
    const slug = formData.get('slug') as string || nameEnglish.toLowerCase().replace(/\s+/g, '-');
    const narration = parseInt(formData.get('narration') as string) || 1;
    const type = (formData.get('type') as string) || 'uthmani';
    const totalPages = parseInt(formData.get('totalPages') as string) || 604;
    const sourceUrl = formData.get('sourceUrl') as string | null;
    const isDefault = formData.get('isDefault') === 'true';

    const dbFile = formData.get('dbFile') as File | null;
    const fontFiles = formData.getAll('fontFiles') as File[];
    const specialFontFile = formData.get('specialFontFile') as File | null;

    // Validation
    if (!nameArabic || !nameEnglish) {
      return NextResponse.json(
        { success: false, error: 'Name (Arabic) and Name (English) are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingEdition = await db.ttfMushafEdition.findUnique({
      where: { slug },
    });

    if (existingEdition) {
      return NextResponse.json(
        { success: false, error: 'An edition with this slug already exists' },
        { status: 400 }
      );
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await db.ttfMushafEdition.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create edition
    const edition = await db.ttfMushafEdition.create({
      data: {
        slug,
        nameArabic,
        nameEnglish,
        description,
        narration,
        type,
        totalPages,
        sourceUrl,
        isDefault,
        isActive: true,
      },
    });

    // Import database if provided
    let importResult = { surahs: 0, ayat: 0, words: 0, discriminators: 0 };
    
    if (dbFile && dbFile.size > 0) {
      const tempDir = path.join(process.cwd(), 'temp');
      await mkdir(tempDir, { recursive: true });
      const tempDbPath = path.join(tempDir, `ttf-mushaf-${edition.id}.db`);

      const dbBytes = await dbFile.arrayBuffer();
      const dbBuffer = Buffer.from(dbBytes);
      await writeFile(tempDbPath, dbBuffer);

      console.log('Starting TTF import...');
      importResult = await importTtfDatabase(edition.id, tempDbPath);
      console.log('TTF Import result:', importResult);

      // Clean up temp file
      if (existsSync(tempDbPath)) {
        await unlink(tempDbPath);
      }
    }

    // Save font files
    const fontsDir = path.join(process.cwd(), 'public', 'fonts', 'ttf', edition.id);
    await mkdir(fontsDir, { recursive: true });

    let fontsImported = 0;
    for (const fontFile of fontFiles) {
      if (fontFile.size === 0) continue;

      const fileName = fontFile.name;
      // Extract page number from filename (p001.ttf, 001.ttf, page1.ttf, etc.)
      const match = fileName.match(/p?0*(\d+)\.ttf$/i);
      const pageNumber = match ? parseInt(match[1]) : 0;

      if (pageNumber > 0 && pageNumber <= totalPages) {
        const fontPath = path.join(fontsDir, fileName);
        const fontBytes = await fontFile.arrayBuffer();
        const fontBuffer = Buffer.from(fontBytes);
        await writeFile(fontPath, fontBuffer);

        // Check if page already exists
        const existingPage = await db.ttfMushafPage.findUnique({
          where: { editionId_pageNumber: { editionId: edition.id, pageNumber } },
        });

        if (existingPage) {
          // Update existing
          await db.ttfMushafPage.update({
            where: { id: existingPage.id },
            data: {
              fontUrl: `/fonts/ttf/${edition.id}/${fileName}`,
              fileName,
              fileSize: fontFile.size,
            },
          });
        } else {
          // Create new
          await db.ttfMushafPage.create({
            data: {
              editionId: edition.id,
              pageNumber,
              fontUrl: `/fonts/ttf/${edition.id}/${fileName}`,
              fileName,
              fileSize: fontFile.size,
            },
          });
        }
        fontsImported++;
      }
    }

    // Save special font file (for surah names and bismillah - 000.ttf)
    let specialFontImported = false;
    if (specialFontFile && specialFontFile.size > 0) {
      const specialFontName = '000.ttf';
      const specialFontPath = path.join(fontsDir, specialFontName);
      const specialFontBytes = await specialFontFile.arrayBuffer();
      const specialFontBuffer = Buffer.from(specialFontBytes);
      await writeFile(specialFontPath, specialFontBuffer);

      await db.ttfMushafEdition.update({
        where: { id: edition.id },
        data: {
          specialFontUrl: `/fonts/ttf/${edition.id}/${specialFontName}`,
          specialFontName: specialFontFile.name,
          specialFontSize: specialFontFile.size,
        },
      });
      specialFontImported = true;
    }

    return NextResponse.json({
      success: true,
      message: `تم إنشاء مصحف TTF بنجاح. تم استيراد ${importResult.surahs} سورة، ${importResult.ayat} آية، ${importResult.words} كلمة، ${importResult.discriminators} تمييز، ${fontsImported} ملف خط${specialFontImported ? '، وملف الخط الخاص' : ''}`,
      data: {
        id: edition.id,
        slug: edition.slug,
        nameArabic: edition.nameArabic,
        nameEnglish: edition.nameEnglish,
      },
      importResult: {
        ...importResult,
        fontsImported,
        specialFontImported,
      },
    });
  } catch (error) {
    console.error('Error creating TTF mushaf edition:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create TTF mushaf edition';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete a TTF mushaf edition
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Edition ID is required' },
        { status: 400 }
      );
    }

    // Check if edition exists
    const existingEdition = await db.ttfMushafEdition.findUnique({
      where: { id },
    });

    if (!existingEdition) {
      return NextResponse.json(
        { success: false, error: 'Edition not found' },
        { status: 404 }
      );
    }

    // Delete font files directory
    const fontsDir = path.join(process.cwd(), 'public', 'fonts', 'ttf', id);
    if (existsSync(fontsDir)) {
      const { rmSync } = await import('fs');
      rmSync(fontsDir, { recursive: true, force: true });
    }

    // Delete edition (cascade will delete pages, words, discriminators)
    await db.ttfMushafEdition.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف مصحف TTF بنجاح',
    });
  } catch (error) {
    console.error('Error deleting TTF mushaf edition:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete TTF mushaf edition' },
      { status: 500 }
    );
  }
}

// Import data from SQLite DB file - TTF Mushaf Structure
async function importTtfDatabase(editionId: string, dbPath: string): Promise<{
  surahs: number;
  ayat: number;
  words: number;
  discriminators: number;
}> {
  const result = {
    surahs: 0,
    ayat: 0,
    words: 0,
    discriminators: 0,
  };

  try {
    // Initialize SQL.js
    const SQL = await initSqlJs();
    
    // Read the database file
    const { readFile } = await import('fs/promises');
    const fileBuffer = await readFile(dbPath);
    const sqlDb = new SQL.Database(new Uint8Array(fileBuffer));

    // Import surahs
    try {
      const surahs = sqlDb.exec('SELECT * FROM surahs');
      if (surahs.length > 0 && surahs[0].values) {
        console.log(`Found ${surahs[0].values.length} surahs`);
        
        for (const row of surahs[0].values) {
          try {
            await db.ttfMushafSurah.create({
              data: {
                editionId,
                id: Number(row[0]) || 0,
                name: String(row[1] || ''),
                ayatCount: Number(row[2]) || 0,
                makkyMadanya: Number(row[3]) || 0,
              },
            });
            result.surahs++;
          } catch (e: any) {
            // Skip duplicate
          }
        }
      }
    } catch (e) {
      console.log('Surahs table error:', e);
    }

    // Import discriminators
    try {
      const discriminators = sqlDb.exec('SELECT * FROM discriminators');
      if (discriminators.length > 0 && discriminators[0].values) {
        console.log(`Found ${discriminators[0].values.length} discriminators`);
        
        for (const row of discriminators[0].values) {
          try {
            await db.ttfDiscriminator.create({
              data: {
                editionId,
                id: Number(row[0]) || 0,
                enabled: Number(row[1]) === 1,
                comment: row[2] ? String(row[2]) : null,
              },
            });
            result.discriminators++;
          } catch (e: any) {
            // Skip duplicate
          }
        }
      }
    } catch (e) {
      console.log('Discriminators table error:', e);
    }

    // Import ayat - TTF structure: id, surah, quarter, page, ayah, words_count, glyphs_count
    const ayatResult = sqlDb.exec('SELECT * FROM ayat');
    const ayahMap: Record<number, number> = {};

    if (ayatResult.length > 0 && ayatResult[0].values) {
      console.log(`Found ${ayatResult[0].values.length} ayat`);
      
      for (const row of ayatResult[0].values) {
        try {
          const ayahId = Number(row[0]) || 0;
          await db.ttfMushafAyah.create({
            data: {
              editionId,
              id: ayahId,
              surahId: Number(row[1]) || 0,
              ayah: Number(row[4]) || 0,
              page: Number(row[3]) || 0,
              quarter: Number(row[2]) || 0,
              wordsCount: Number(row[5]) || 0,
              glyphsCount: Number(row[6]) || 0,
            },
          });
          ayahMap[ayahId] = ayahId;
          result.ayat++;
        } catch (e: any) {
          // Skip duplicate
        }
      }
      
      console.log(`Imported ${result.ayat} ayat`);
    }

    // Import words - TTF structure: id, ayah_id, line, word, discriminator, text
    try {
      const wordsResult = sqlDb.exec('SELECT * FROM words');
      
      if (wordsResult.length > 0 && wordsResult[0].values) {
        console.log(`Found ${wordsResult[0].values.length} words`);
        
        const wordBatch: any[] = [];

        for (const row of wordsResult[0].values) {
          const ayahId = Number(row[1]);
          
          if (!ayahMap[ayahId]) continue;
          
          wordBatch.push({
            editionId,
            ayahId: ayahId,
            id: Number(row[0]) || 0,
            lineNumber: Number(row[2]) || 0,
            wordNumber: Number(row[3]) || 0,
            discriminator: Number(row[4]) || 0,
            text: String(row[5] || ''),
          });

          if (wordBatch.length >= 1000) {
            try {
              await db.ttfMushafWord.createMany({ data: wordBatch, skipDuplicates: true });
              result.words += wordBatch.length;
            } catch (e: any) {
              console.error('Word batch error:', e.message);
            }
            wordBatch.length = 0;
          }
        }

        if (wordBatch.length > 0) {
          try {
            await db.ttfMushafWord.createMany({ data: wordBatch, skipDuplicates: true });
            result.words += wordBatch.length;
          } catch (e: any) {
            console.error('Word final batch error:', e.message);
          }
        }
        
        console.log(`Imported ${result.words} words`);
      }
    } catch (e) {
      console.log('Words table error:', e);
    }

    // Close database
    sqlDb.close();

    console.log('Final import result:', result);
  } catch (error) {
    console.error('Import error:', error);
  }

  return result;
}
