import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import Database from 'better-sqlite3';

// GET - List all image mushaf editions
export async function GET() {
  try {
    const editions = await db.imageMushafEdition.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { 
            ImageMushafPage: true, 
            ImageMushafAyah: true, 
            ImageMushafSurah: true,
            ImageMushafWord: true,
            ImageMushafLine: true,
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
      width: edition.width,
      height: edition.height,
      totalPages: edition.totalPages,
      isDefault: edition.isDefault,
      isActive: edition.isActive,
      createdAt: edition.createdAt.toISOString(),
      stats: {
        pages: edition._count.ImageMushafPage,
        ayat: edition._count.ImageMushafAyah,
        surahs: edition._count.ImageMushafSurah,
        words: edition._count.ImageMushafWord,
        lines: edition._count.ImageMushafLine,
      },
    }));

    return NextResponse.json({
      success: true,
      data: editionsWithStats,
    });
  } catch (error) {
    console.error('Error fetching image mushaf editions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch image mushaf editions' },
      { status: 500 }
    );
  }
}

// POST - Create a new image mushaf edition with optional DB import
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const nameArabic = formData.get('nameArabic') as string;
    const nameEnglish = formData.get('nameEnglish') as string;
    const description = formData.get('description') as string | null;
    const slug = formData.get('slug') as string || nameEnglish.toLowerCase().replace(/\s+/g, '-');
    const narration = parseInt(formData.get('narration') as string) || 1;
    const width = parseInt(formData.get('width') as string) || 1024;
    const height = parseInt(formData.get('height') as string) || 1656;
    const totalPages = parseInt(formData.get('totalPages') as string) || 604;
    const sourceUrl = formData.get('sourceUrl') as string | null;
    const isDefault = formData.get('isDefault') === 'true';
    const dbFile = formData.get('dbFile') as File | null;

    // Validation
    if (!nameArabic || !nameEnglish) {
      return NextResponse.json(
        { success: false, error: 'Name (Arabic) and Name (English) are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingEdition = await db.imageMushafEdition.findUnique({
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
      await db.imageMushafEdition.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create edition
    const edition = await db.imageMushafEdition.create({
      data: {
        slug,
        nameArabic,
        nameEnglish,
        description,
        narration,
        width,
        height,
        totalPages,
        sourceUrl,
        isDefault,
        isActive: true,
      },
    });

    // Import database if provided
    if (dbFile && dbFile.size > 0) {
      const tempDir = path.join(process.cwd(), 'temp');
      await mkdir(tempDir, { recursive: true });
      const tempDbPath = path.join(tempDir, `image-mushaf-${edition.id}.db`);

      const dbBytes = await dbFile.arrayBuffer();
      const dbBuffer = Buffer.from(dbBytes);
      await writeFile(tempDbPath, dbBuffer);

      console.log('Starting import from DB file...');
      const importResult = await importImageDatabase(edition.id, tempDbPath);
      console.log('Import result:', importResult);

      // Clean up temp file
      if (existsSync(tempDbPath)) {
        await unlink(tempDbPath);
      }

      return NextResponse.json({
        success: true,
        message: `تم إنشاء مصحف الصور بنجاح. تم استيراد ${importResult.surahs} سورة، ${importResult.ayat} آية، ${importResult.words} كلمة، ${importResult.lines} سطر`,
        data: {
          id: edition.id,
          slug: edition.slug,
          nameArabic: edition.nameArabic,
          nameEnglish: edition.nameEnglish,
        },
        importResult,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء مصحف الصور بنجاح',
      data: {
        id: edition.id,
        slug: edition.slug,
        nameArabic: edition.nameArabic,
        nameEnglish: edition.nameEnglish,
      },
    });
  } catch (error) {
    console.error('Error creating image mushaf edition:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create image mushaf edition';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete an image mushaf edition
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
    const existingEdition = await db.imageMushafEdition.findUnique({
      where: { id },
    });

    if (!existingEdition) {
      return NextResponse.json(
        { success: false, error: 'Edition not found' },
        { status: 404 }
      );
    }

    // Delete associated image files
    const imagesDir = path.join(process.cwd(), 'public', 'upload', 'mushaf-pages', id);
    if (existsSync(imagesDir)) {
      const { rmSync } = await import('fs');
      rmSync(imagesDir, { recursive: true, force: true });
    }

    // Delete edition (cascade will delete pages, words, lines)
    await db.imageMushafEdition.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف مصحف الصور بنجاح',
    });
  } catch (error) {
    console.error('Error deleting image mushaf edition:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete image mushaf edition' },
      { status: 500 }
    );
  }
}

// Import data from SQLite DB file - Picture Mushaf Structure
async function importImageDatabase(editionId: string, dbPath: string): Promise<{
  surahs: number;
  ayat: number;
  words: number;
  lines: number;
}> {
  const result = {
    surahs: 0,
    ayat: 0,
    words: 0,
    lines: 0,
  };

  try {
    // Open database with better-sqlite3
    const sqlDb = new Database(dbPath, { readonly: true, fileMustExist: true });

    // Import surahs
    try {
      const surahs = sqlDb.prepare('SELECT * FROM surahs').all() as any[];
      if (surahs.length > 0) {
        console.log(`Found ${surahs.length} surahs`);
        
        for (const row of surahs) {
          try {
            await db.imageMushafSurah.create({
              data: {
                editionId,
                id: Number(row.id) || Number(row[0]) || 0,
                name: String(row.name || row[1] || ''),
                ayatCount: Number(row.ayatCount || row.ayat_count || row[2]) || 0,
                makkyMadanya: Number(row.makkyMadanya || row.makky_madanya || row[3]) || 0,
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

    // Import ayat
    const ayahMap: Record<number, number> = {};
    try {
      const ayatRows = sqlDb.prepare('SELECT * FROM ayat').all() as any[];
      console.log(`Found ${ayatRows.length} ayat`);
      
      for (const row of ayatRows) {
        try {
          const ayahId = Number(row.id || row[0]) || 0;
          await db.imageMushafAyah.create({
            data: {
              editionId,
              id: ayahId,
              surahId: Number(row.surahId || row.surah_id || row[1]) || 0,
              ayah: Number(row.ayah || row.ayah_number || row[3]) || 0,
              page: Number(row.page || row.page_number || row[4]) || 0,
              quarter: Number(row.quarter || row[2]) || 0,
            },
          });
          ayahMap[ayahId] = ayahId;
          result.ayat++;
        } catch (e: any) {
          // Skip duplicate
        }
      }
    } catch (e) {
      console.log('Ayat table error:', e);
    }
    
    console.log(`Imported ${result.ayat} ayat`);

    // Import words
    try {
      const wordsRows = sqlDb.prepare('SELECT * FROM words').all() as any[];
      console.log(`Found ${wordsRows.length} words`);
      
      const wordBatch: any[] = [];

      for (const row of wordsRows) {
        const ayahId = Number(row.ayahId || row.ayah_id || row[1]);
        
        if (!ayahMap[ayahId]) continue;
        
        wordBatch.push({
          editionId,
          ayahId: ayahId,
          id: Number(row.id || row[0]) || 0,
          lineNumber: Number(row.lineNumber || row.line_number || row.line || row[2]) || 0,
          wordNumber: Number(row.wordNumber || row.word_number || row.word || row[3]) || 0,
          discriminator: 0,
          minX: Number(row.minX || row.min_x || row[4]) || 0,
          maxX: Number(row.maxX || row.max_x || row[5]) || 0,
          minY: Number(row.minY || row.min_y || row[6]) || 0,
          maxY: Number(row.maxY || row.max_y || row[7]) || 0,
        });

        if (wordBatch.length >= 1000) {
          try {
            await db.imageMushafWord.createMany({ data: wordBatch, skipDuplicates: true });
            result.words += wordBatch.length;
          } catch (e: any) {
            console.error('Word batch error:', e.message);
          }
          wordBatch.length = 0;
        }
      }

      if (wordBatch.length > 0) {
        try {
          await db.imageMushafWord.createMany({ data: wordBatch, skipDuplicates: true });
          result.words += wordBatch.length;
        } catch (e: any) {
          console.error('Word final batch error:', e.message);
        }
      }
      
      console.log(`Imported ${result.words} words`);
    } catch (e) {
      console.log('Words table error:', e);
    }

    // Import lines
    try {
      const linesRows = sqlDb.prepare('SELECT * FROM lines').all() as any[];
      console.log(`Found ${linesRows.length} lines`);
      
      const lineBatch: any[] = [];

      for (const row of linesRows) {
        const ayahId = Number(row.ayahId || row.ayah_id || row[1]);
        
        if (!ayahMap[ayahId]) continue;
        
        lineBatch.push({
          editionId,
          ayahId: ayahId,
          id: Number(row.id || row[0]) || 0,
          lineNumber: Number(row.lineNumber || row.line_number || row.line || row[2]) || 0,
          minX: Number(row.minX || row.min_x || row[3]) || 0,
          maxX: Number(row.maxX || row.max_x || row[4]) || 0,
          minY: Number(row.minY || row.min_y || row[5]) || 0,
          maxY: Number(row.maxY || row.max_y || row[6]) || 0,
        });

        if (lineBatch.length >= 1000) {
          try {
            await db.imageMushafLine.createMany({ data: lineBatch, skipDuplicates: true });
            result.lines += lineBatch.length;
          } catch (e: any) {
            console.error('Line batch error:', e.message);
          }
          lineBatch.length = 0;
        }
      }

      if (lineBatch.length > 0) {
        try {
          await db.imageMushafLine.createMany({ data: lineBatch, skipDuplicates: true });
          result.lines += lineBatch.length;
        } catch (e: any) {
          console.error('Line final batch error:', e.message);
        }
      }
      
      console.log(`Imported ${result.lines} lines`);
    } catch (e) {
      console.log('Lines table error:', e);
    }

    // Close database
    sqlDb.close();

    console.log('Final import result:', result);
  } catch (error) {
    console.error('Import error:', error);
  }

  return result;
}
