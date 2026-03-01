// src/app/api/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/analytics - Track event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      eventType,
      userId,
      surahId,
      ayahId,
      reciterId,
      sessionId,
      ipAddress,
      userAgent,
      metadata,
    } = body;

    const analytics = await db.analytics.create({
      data: {
        eventType,
        userId,
        surahId,
        ayahId,
        reciterId,
        sessionId,
        ipAddress,
        userAgent,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return NextResponse.json({ success: true, data: analytics });
  } catch (error) {
    // Don't fail the request if analytics fails
    console.error('Analytics error:', error);
    return NextResponse.json({ success: true });
  }
}

// GET /api/analytics - Get analytics summary
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('eventType');
    const days = parseInt(searchParams.get('days') || '7');

    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: any = {
      timestamp: { gte: since },
    };
    if (eventType) where.eventType = eventType;

    const events = await db.analytics.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 1000,
    });

    // Aggregate by event type
    const aggregated = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: {
        total: events.length,
        byType: aggregated,
        events: events.slice(0, 100),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
