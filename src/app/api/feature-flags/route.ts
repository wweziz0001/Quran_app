// src/app/api/feature-flags/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/feature-flags - Get all feature flags
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const enabledOnly = searchParams.get('enabledOnly') === 'true';

    if (key) {
      const flag = await db.featureFlag.findUnique({
        where: { key },
      });

      if (!flag) {
        return NextResponse.json(
          { success: false, error: 'Feature flag not found' },
          { status: 404 }
        );
      }

      // Parse conditions JSON if exists
      const data = {
        ...flag,
        conditions: flag.conditions ? JSON.parse(flag.conditions) : null,
      };

      return NextResponse.json({ success: true, data });
    }

    const where = enabledOnly ? { enabled: true } : {};

    const flags = await db.featureFlag.findMany({
      where,
      orderBy: { key: 'asc' },
    });

    // Parse conditions
    const data = flags.map((flag) => ({
      ...flag,
      conditions: flag.conditions ? JSON.parse(flag.conditions) : null,
    }));

    return NextResponse.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('Feature flags GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feature flags' },
      { status: 500 }
    );
  }
}

// POST /api/feature-flags - Create feature flag
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, name, description, enabled, rollout, conditions } = body;

    if (!key || !name) {
      return NextResponse.json(
        { success: false, error: 'key and name are required' },
        { status: 400 }
      );
    }

    // Check if key already exists
    const existing = await db.featureFlag.findUnique({
      where: { key },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Feature flag with this key already exists' },
        { status: 409 }
      );
    }

    const flag = await db.featureFlag.create({
      data: {
        key,
        name,
        description,
        enabled: enabled ?? false,
        rollout: rollout ?? 100,
        conditions: conditions ? JSON.stringify(conditions) : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...flag,
        conditions: flag.conditions ? JSON.parse(flag.conditions) : null,
      },
    });
  } catch (error) {
    console.error('Feature flags POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create feature flag' },
      { status: 500 }
    );
  }
}

// PATCH /api/feature-flags - Update feature flag
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, name, description, enabled, rollout, conditions } = body;

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'key is required' },
        { status: 400 }
      );
    }

    const flag = await db.featureFlag.update({
      where: { key },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(enabled !== undefined && { enabled }),
        ...(rollout !== undefined && { rollout }),
        ...(conditions !== undefined && {
          conditions: conditions ? JSON.stringify(conditions) : null,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...flag,
        conditions: flag.conditions ? JSON.parse(flag.conditions) : null,
      },
    });
  } catch (error) {
    console.error('Feature flags PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update feature flag' },
      { status: 500 }
    );
  }
}

// DELETE /api/feature-flags - Delete feature flag
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'key is required' },
        { status: 400 }
      );
    }

    await db.featureFlag.delete({
      where: { key },
    });

    return NextResponse.json({ success: true, message: 'Feature flag deleted' });
  } catch (error) {
    console.error('Feature flags DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete feature flag' },
      { status: 500 }
    );
  }
}
