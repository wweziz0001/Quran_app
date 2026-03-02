import { NextRequest, NextResponse } from 'next/server';

// Service port
const TAFSIR_SERVICE_PORT = 3004;

// GET - List tafsir sources or entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ayahId = searchParams.get('ayahId');
    const sourceId = searchParams.get('source');

    // If ayahId is provided, get tafsir entries for that ayah
    if (ayahId) {
      const params = new URLSearchParams();
      if (sourceId) params.set('sourceId', sourceId);

      const response = await fetch(
        `http://localhost:${TAFSIR_SERVICE_PORT}/tafsir/ayah/${ayahId}?${params.toString()}`
      );
      const data = await response.json();

      if (!data.success) {
        return NextResponse.json(
          { success: false, error: data.error || 'Failed to fetch tafsir' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: data.data,
      });
    }

    // Otherwise, list all tafsir sources
    const response = await fetch(`http://localhost:${TAFSIR_SERVICE_PORT}/tafsir/sources`);
    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to fetch tafsir sources' },
        { status: 500 }
      );
    }

    // Transform data to match expected format
    const sources = (data.data || []).map((s: {
      id: string;
      name: string;
      language: string;
      author?: string | null;
      description?: string | null;
      _count?: { TafsirEntry: number };
    }) => ({
      id: s.id,
      nameArabic: s.name,
      nameEnglish: s.name,
      slug: s.id,
      authorArabic: s.author,
      authorEnglish: s.author,
      language: s.language,
      isDefault: false,
      isActive: true,
      entriesCount: s._count?.TafsirEntry || 0,
    }));

    return NextResponse.json({
      success: true,
      data: sources,
    });
  } catch (error) {
    console.error('Error fetching tafsir:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tafsir' },
      { status: 500 }
    );
  }
}

// POST - Create a new tafsir source (admin only, placeholder)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nameArabic, nameEnglish, slug, authorArabic, authorEnglish, language, description } = body;

    // Validation
    if (!nameArabic || !nameEnglish) {
      return NextResponse.json(
        { success: false, error: 'Name (Arabic) and Name (English) are required' },
        { status: 400 }
      );
    }

    // For now, return success - in production this would call admin-service
    return NextResponse.json({
      success: true,
      data: {
        id: `tafsir-${slug || nameEnglish.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        nameArabic,
        nameEnglish,
        slug: slug || nameEnglish.toLowerCase().replace(/\s+/g, '-'),
        authorArabic: authorArabic || null,
        authorEnglish: authorEnglish || null,
        language: language || 'ar',
        isDefault: false,
        isActive: true,
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
