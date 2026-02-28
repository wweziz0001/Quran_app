import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List tafsir sources or entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ayahId = searchParams.get('ayahId');
    const source = searchParams.get('source');
    const search = searchParams.get('search');
    const includeInactive = searchParams.get('all') === 'true';

    // If ayahId is provided, get tafsir entries for that ayah
    if (ayahId) {
      const where: Record<string, unknown> = { ayahId: parseInt(ayahId, 10) };
      if (source) where.source = { slug: source };

      const tafsirEntries = await db.tafsirEntry.findMany({
        where,
        include: {
          source: {
            select: {
              id: true,
              nameArabic: true,
              nameEnglish: true,
              slug: true,
              language: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: tafsirEntries,
      });
    }

    // Otherwise, list all tafsir sources
    const where: Record<string, unknown> = {};
    
    if (search) {
      where.OR = [
        { nameArabic: { contains: search } },
        { nameEnglish: { contains: search } },
        { slug: { contains: search } },
      ];
    }

    if (!includeInactive) {
      where.isActive = true;
    }

    const sources = await db.tafsirSource.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { nameEnglish: 'asc' },
      ],
      include: {
        _count: {
          select: { TafsirEntry: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: sources.map(s => ({
        id: s.id,
        nameArabic: s.nameArabic,
        nameEnglish: s.nameEnglish,
        slug: s.slug,
        authorArabic: s.authorArabic,
        authorEnglish: s.authorEnglish,
        language: s.language,
        isDefault: s.isDefault,
        isActive: s.isActive,
        entriesCount: s._count.TafsirEntry,
      })),
    });
  } catch (error) {
    console.error('Error fetching tafsir:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tafsir' },
      { status: 500 }
    );
  }
}

// POST - Create a new tafsir source
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      nameArabic, 
      nameEnglish, 
      slug, 
      authorArabic, 
      authorEnglish, 
      language, 
      description,
      isDefault, 
      isActive 
    } = body;

    // Validation
    if (!nameArabic || !nameEnglish || !slug) {
      return NextResponse.json(
        { success: false, error: 'Name (Arabic), Name (English), and Slug are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingSource = await db.tafsirSource.findUnique({
      where: { slug },
    });

    if (existingSource) {
      return NextResponse.json(
        { success: false, error: 'A tafsir source with this slug already exists' },
        { status: 400 }
      );
    }

    // If this is set as default, unset any existing default
    if (isDefault) {
      await db.tafsirSource.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create tafsir source
    const source = await db.tafsirSource.create({
      data: {
        nameArabic,
        nameEnglish,
        slug,
        authorArabic: authorArabic || null,
        authorEnglish: authorEnglish || null,
        language: language || 'ar',
        description: description || null,
        isDefault: isDefault ?? false,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: source.id,
        nameArabic: source.nameArabic,
        nameEnglish: source.nameEnglish,
        slug: source.slug,
        authorArabic: source.authorArabic,
        authorEnglish: source.authorEnglish,
        language: source.language,
        isDefault: source.isDefault,
        isActive: source.isActive,
        entriesCount: 0,
      },
    });
  } catch (error) {
    console.error('Error creating tafsir source:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create tafsir source' },
      { status: 500 }
    );
  }
}
