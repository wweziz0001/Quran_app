import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const bookmarks = await db.bookmark.findMany({
      where: { userId: user.id },
      include: {
        ayah: {
          include: {
            surah: {
              select: {
                id: true,
                number: true,
                nameArabic: true,
                nameEnglish: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: bookmarks,
    });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookmarks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { ayahId, type = 'BOOKMARK', note, color } = body;

    if (!ayahId) {
      return NextResponse.json(
        { success: false, error: 'Ayah ID is required' },
        { status: 400 }
      );
    }

    // Check if bookmark already exists
    const existing = await db.bookmark.findUnique({
      where: {
        userId_ayahId_type: {
          userId: user.id,
          ayahId,
          type,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Bookmark already exists' },
        { status: 409 }
      );
    }

    const bookmark = await db.bookmark.create({
      data: {
        userId: user.id,
        ayahId,
        type,
        note,
        color,
      },
      include: {
        ayah: {
          include: {
            surah: {
              select: {
                id: true,
                number: true,
                nameArabic: true,
                nameEnglish: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: bookmark,
    });
  } catch (error) {
    console.error('Error creating bookmark:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create bookmark' },
      { status: 500 }
    );
  }
}
