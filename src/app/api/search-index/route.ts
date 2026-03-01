// src/app/api/search-index/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/search-index - Get search indices
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ayahId = searchParams.get('ayahId');
    const language = searchParams.get('language') || 'ar';
    const limit = parseInt(searchParams.get('limit') || '100');

    if (ayahId) {
      const index = await db.searchIndex.findUnique({
        where: { ayahId: parseInt(ayahId) },
        include: { Ayah: true },
      });

      if (!index) {
        return NextResponse.json(
          { success: false, error: 'Search index not found' },
          { status: 404 }
        );
      }

      // Parse embedding from JSON string if exists
      const data = {
        ...index,
        embedding: index.embedding ? JSON.parse(index.embedding) : null,
      };

      return NextResponse.json({ success: true, data });
    }

    const indices = await db.searchIndex.findMany({
      where: { language },
      take: limit,
      orderBy: { lastIndexed: 'desc' },
    });

    // Parse embeddings
    const data = indices.map((index) => ({
      ...index,
      embedding: index.embedding ? JSON.parse(index.embedding) : null,
    }));

    return NextResponse.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('Search index GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch search indices' },
      { status: 500 }
    );
  }
}

// POST /api/search-index - Create or update search index
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ayahId, content, contentNormalized, embedding, embeddingModel, language } = body;

    if (!ayahId || !content) {
      return NextResponse.json(
        { success: false, error: 'ayahId and content are required' },
        { status: 400 }
      );
    }

    // Check if ayah exists
    const ayah = await db.ayah.findUnique({
      where: { id: ayahId },
    });

    if (!ayah) {
      return NextResponse.json(
        { success: false, error: 'Ayah not found' },
        { status: 404 }
      );
    }

    const index = await db.searchIndex.upsert({
      where: { ayahId },
      update: {
        content,
        contentNormalized,
        embedding: embedding ? JSON.stringify(embedding) : null,
        embeddingModel,
        language: language || 'ar',
        lastIndexed: new Date(),
      },
      create: {
        ayahId,
        content,
        contentNormalized,
        embedding: embedding ? JSON.stringify(embedding) : null,
        embeddingModel,
        language: language || 'ar',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...index,
        embedding: index.embedding ? JSON.parse(index.embedding) : null,
      },
    });
  } catch (error) {
    console.error('Search index POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create search index' },
      { status: 500 }
    );
  }
}

// DELETE /api/search-index - Delete search index
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ayahId = searchParams.get('ayahId');

    if (!ayahId) {
      return NextResponse.json(
        { success: false, error: 'ayahId is required' },
        { status: 400 }
      );
    }

    await db.searchIndex.delete({
      where: { ayahId: parseInt(ayahId) },
    });

    return NextResponse.json({ success: true, message: 'Search index deleted' });
  } catch (error) {
    console.error('Search index DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete search index' },
      { status: 500 }
    );
  }
}
