import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List all reciters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const includeInactive = searchParams.get('all') === 'true';

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

    const reciters = await db.reciter.findMany({
      where,
      orderBy: [
        { popularity: 'desc' },
        { nameEnglish: 'asc' },
      ],
      include: {
        _count: {
          select: { Recitation: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: reciters.map(r => ({
        id: r.id,
        nameArabic: r.nameArabic,
        nameEnglish: r.nameEnglish,
        slug: r.slug,
        apiIdentifier: r.apiIdentifier,
        bio: r.bio,
        imageUrl: r.imageUrl,
        country: r.country,
        style: 'Hafs', // Default style
        biography: r.bio,
        hasHighQuality: r.hasHighQuality,
        hasGapless: r.hasGapless,
        popularity: r.popularity,
        isActive: r.isActive,
        isFeatured: r.popularity >= 90, // Featured if popularity >= 90
        recitationsCount: r._count.Recitation,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching reciters:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reciters' },
      { status: 500 }
    );
  }
}

// POST - Create a new reciter
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nameArabic, nameEnglish, slug, country, style, biography, isActive, isFeatured } = body;

    // Validation
    if (!nameArabic || !nameEnglish || !slug) {
      return NextResponse.json(
        { success: false, error: 'Name (Arabic), Name (English), and Slug are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingReciter = await db.reciter.findUnique({
      where: { slug },
    });

    if (existingReciter) {
      return NextResponse.json(
        { success: false, error: 'A reciter with this slug already exists' },
        { status: 400 }
      );
    }

    // Create reciter
    const reciter = await db.reciter.create({
      data: {
        nameArabic,
        nameEnglish,
        slug,
        country: country || null,
        bio: biography || null,
        isActive: isActive ?? true,
        popularity: isFeatured ? 90 : 50,
        hasHighQuality: false,
        hasGapless: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: reciter.id,
        nameArabic: reciter.nameArabic,
        nameEnglish: reciter.nameEnglish,
        slug: reciter.slug,
        country: reciter.country,
        isActive: reciter.isActive,
        recitationsCount: 0,
      },
    });
  } catch (error) {
    console.error('Error creating reciter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create reciter' },
      { status: 500 }
    );
  }
}
