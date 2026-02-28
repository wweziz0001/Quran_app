import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List saved queries
export async function GET() {
  try {
    const queries = await db.savedQuery.findMany({
      orderBy: [
        { isFavorite: 'desc' },
        { useCount: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      queries,
    });
  } catch (error) {
    console.error('Error fetching saved queries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch saved queries' },
      { status: 500 }
    );
  }
}

// POST - Create saved query
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, query, description, tags } = body;

    if (!name || !query) {
      return NextResponse.json(
        { success: false, error: 'Name and query are required' },
        { status: 400 }
      );
    }

    const savedQuery = await db.savedQuery.create({
      data: {
        name,
        query,
        description,
        tags: tags ? JSON.stringify(tags) : null,
        createdBy: 'admin',
      },
    });

    return NextResponse.json({
      success: true,
      query: savedQuery,
    });
  } catch (error) {
    console.error('Error saving query:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save query' },
      { status: 500 }
    );
  }
}
