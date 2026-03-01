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

    if (!eventType) {
      return NextResponse.json(
        { success: false, error: 'eventType is required' },
        { status: 400 }
      );
    }

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
    console.error('Analytics POST error:', error);
    return NextResponse.json({ success: true, message: 'Event logged' });
  }
}

// GET /api/analytics - Get analytics summary
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('eventType');
    const days = parseInt(searchParams.get('days') || '7');
    const userId = searchParams.get('userId');
    const surahId = searchParams.get('surahId');
    const limit = parseInt(searchParams.get('limit') || '1000');

    const since = new Date();
    since.setDate(since.getDate() - days);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      timestamp: { gte: since },
    };

    if (eventType) where.eventType = eventType;
    if (userId) where.userId = userId;
    if (surahId) where.surahId = parseInt(surahId);

    const events = await db.analytics.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    // Aggregate by event type
    const byType = events.reduce(
      (acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Aggregate by day
    const byDay = events.reduce(
      (acc, event) => {
        const day = event.timestamp.toISOString().split('T')[0];
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Aggregate by hour (for today)
    const today = new Date().toISOString().split('T')[0];
    const todaysEvents = events.filter(
      (e) => e.timestamp.toISOString().split('T')[0] === today
    );

    const byHour = todaysEvents.reduce(
      (acc, event) => {
        const hour = event.timestamp.getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );

    // Top surahs
    const surahCounts = events.reduce(
      (acc, event) => {
        if (event.surahId) {
          acc[event.surahId] = (acc[event.surahId] || 0) + 1;
        }
        return acc;
      },
      {} as Record<number, number>
    );

    const topSurahs = Object.entries(surahCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([surahId, count]) => ({ surahId: parseInt(surahId), count }));

    // Parse metadata
    const parsedEvents = events.slice(0, 100).map((e) => ({
      ...e,
      metadata: e.metadata ? JSON.parse(e.metadata) : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        total: events.length,
        byType,
        byDay,
        byHour,
        topSurahs,
        events: parsedEvents,
      },
    });
  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// DELETE /api/analytics - Clean old analytics
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const olderThanDays = parseInt(searchParams.get('olderThanDays') || '30');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await db.analytics.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} old analytics records`,
    });
  } catch (error) {
    console.error('Analytics DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clean analytics' },
      { status: 500 }
    );
  }
}
