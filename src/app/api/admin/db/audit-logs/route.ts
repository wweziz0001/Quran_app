import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List audit logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resourceType');
    const userId = searchParams.get('userId');

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;
    if (userId) where.userId = userId;

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await db.auditLog.count({ where });

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

// GET stats
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate } = body;

    const where: Record<string, unknown> = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    // Get action counts
    const actionCounts = await db.auditLog.groupBy({
      by: ['action'],
      where,
      _count: true,
    });

    // Get resource type counts
    const resourceCounts = await db.auditLog.groupBy({
      by: ['resourceType'],
      where,
      _count: true,
    });

    // Get status counts
    const statusCounts = await db.auditLog.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    return NextResponse.json({
      success: true,
      stats: {
        actionCounts: actionCounts.map(a => ({ action: a.action, count: a._count })),
        resourceCounts: resourceCounts.map(r => ({ resourceType: r.resourceType, count: r._count })),
        statusCounts: statusCounts.map(s => ({ status: s.status, count: s._count })),
      },
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit stats' },
      { status: 500 }
    );
  }
}
