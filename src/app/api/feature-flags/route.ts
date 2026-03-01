// src/app/api/feature-flags/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/feature-flags - Get all feature flags
export async function GET() {
  try {
    const flags = await db.featureFlag.findMany({
      orderBy: { key: 'asc' },
    });

    // Convert to object for easy lookup
    const flagsMap = flags.reduce((acc, flag) => {
      acc[flag.key] = {
        enabled: flag.enabled,
        rollout: flag.rollout,
        name: flag.name,
      };
      return acc;
    }, {} as Record<string, { enabled: boolean; rollout: number; name: string }>);

    return NextResponse.json({
      success: true,
      data: flagsMap,
      flags: flags,
    });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feature flags' },
      { status: 500 }
    );
  }
}

// POST /api/feature-flags - Update feature flag
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, enabled, rollout } = body;

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Key is required' },
        { status: 400 }
      );
    }

    const flag = await db.featureFlag.update({
      where: { key },
      data: {
        ...(enabled !== undefined && { enabled }),
        ...(rollout !== undefined && { rollout }),
      },
    });

    return NextResponse.json({ success: true, data: flag });
  } catch (error) {
    console.error('Error updating feature flag:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update feature flag' },
      { status: 500 }
    );
  }
}
