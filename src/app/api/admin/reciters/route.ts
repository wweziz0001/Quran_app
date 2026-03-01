import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

async function checkAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) return null;
  
  const user = await getUserFromToken(token);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'EDITOR')) {
    return null;
  }
  
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await checkAdmin(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const reciters = await db.reciter.findMany({
      orderBy: { nameEnglish: 'asc' },
      include: {
        _count: {
          select: { recitations: true },
        },
      },
    });

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

export async function POST(request: NextRequest) {
  try {
    const user = await checkAdmin(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin only' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nameArabic, nameEnglish, slug, bio, country, hasHighQuality, hasGapless } = body;

    if (!nameArabic || !nameEnglish || !slug) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const existing = await db.reciter.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Slug already exists' },
        { status: 409 }
      );
    }

    const reciter = await db.reciter.create({
      data: {
        nameArabic,
        nameEnglish,
        slug,
        bio,
        country,
        hasHighQuality: hasHighQuality || false,
        hasGapless: hasGapless || false,
      },
    });

    return NextResponse.json({
      success: true,
      data: reciter,
    });
  } catch (error) {
    console.error('Error creating reciter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create reciter' },
      { status: 500 }
    );
  }
}
