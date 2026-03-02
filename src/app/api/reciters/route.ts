import { NextRequest, NextResponse } from 'next/server';

// Service port
const RECITER_SERVICE_PORT = 3006;

// GET - List all reciters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const includeInactive = searchParams.get('all') === 'true';

    // Build query params for reciter-service
    const params = new URLSearchParams();
    params.set('limit', '100');
    if (search) params.set('search', search);

    // Call reciter-service
    const response = await fetch(`http://localhost:${RECITER_SERVICE_PORT}/reciters?${params.toString()}`);
    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to fetch reciters' },
        { status: 500 }
      );
    }

    // Transform and filter data
    let reciters = (data.data || []).map((r: {
      id: string;
      nameArabic: string;
      nameEnglish: string;
      slug?: string;
      bio?: string | null;
      imageUrl?: string | null;
      country?: string | null;
      hasHighQuality?: boolean;
      hasGapless?: boolean;
      popularity?: number;
      isActive?: boolean;
      _count?: { Recitation: number };
    }) => ({
      id: r.id,
      nameArabic: r.nameArabic,
      nameEnglish: r.nameEnglish,
      slug: r.slug || r.id,
      bio: r.bio,
      imageUrl: r.imageUrl,
      country: r.country,
      style: 'Hafs',
      biography: r.bio,
      hasHighQuality: r.hasHighQuality || false,
      hasGapless: r.hasGapless || false,
      popularity: r.popularity || 50,
      isActive: r.isActive !== false,
      isFeatured: (r.popularity || 50) >= 90,
      recitationsCount: r._count?.Recitation || 0,
    }));

    // Filter inactive if not requesting all
    if (!includeInactive) {
      reciters = reciters.filter((r: { isActive: boolean }) => r.isActive);
    }

    return NextResponse.json({
      success: true,
      data: reciters,
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
    if (!nameArabic || !nameEnglish) {
      return NextResponse.json(
        { success: false, error: 'Name (Arabic) and Name (English) are required' },
        { status: 400 }
      );
    }

    // Call reciter-service to create
    const response = await fetch(`http://localhost:${RECITER_SERVICE_PORT}/reciters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nameEnglish,
        nameArabic: nameArabic || nameEnglish,
        bio: biography,
        country,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to create reciter' },
        { status: 500 }
      );
    }

    const reciter = data.data;

    return NextResponse.json({
      success: true,
      data: {
        id: reciter.id,
        nameArabic: reciter.nameArabic,
        nameEnglish: reciter.nameEnglish,
        slug: reciter.slug || reciter.id,
        country: reciter.country,
        isActive: reciter.isActive !== false,
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
