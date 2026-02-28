import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List all settings
export async function GET() {
  try {
    const settings = await db.appSetting.findMany({
      orderBy: { key: 'asc' },
    });

    return NextResponse.json({
      success: true,
      settings: settings.map(s => ({
        id: s.id,
        key: s.key,
        value: s.value,
        description: s.description,
        isPublic: s.isPublic,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT - Update a setting
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'Key and value are required' },
        { status: 400 }
      );
    }

    // Check if setting exists
    const existing = await db.appSetting.findUnique({
      where: { key },
    });

    if (existing) {
      // Update existing setting
      const updated = await db.appSetting.update({
        where: { key },
        data: { value: String(value) },
      });

      return NextResponse.json({
        success: true,
        setting: {
          id: updated.id,
          key: updated.key,
          value: updated.value,
          description: updated.description,
          isPublic: updated.isPublic,
        },
      });
    } else {
      // Create new setting
      const created = await db.appSetting.create({
        data: {
          key,
          value: String(value),
          description: '',
          isPublic: false,
        },
      });

      return NextResponse.json({
        success: true,
        setting: {
          id: created.id,
          key: created.key,
          value: created.value,
          description: created.description,
          isPublic: created.isPublic,
        },
      });
    }
  } catch (error) {
    console.error('Error updating setting:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update setting' },
      { status: 500 }
    );
  }
}

// POST - Bulk update settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings } = body as { settings: Array<{ key: string; value: string }> };

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { success: false, error: 'Settings array is required' },
        { status: 400 }
      );
    }

    // Update or create each setting
    for (const setting of settings) {
      const existing = await db.appSetting.findUnique({
        where: { key: setting.key },
      });

      if (existing) {
        await db.appSetting.update({
          where: { key: setting.key },
          data: { value: setting.value },
        });
      } else {
        await db.appSetting.create({
          data: {
            key: setting.key,
            value: setting.value,
            description: '',
            isPublic: false,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${settings.length} settings`,
    });
  } catch (error) {
    console.error('Error bulk updating settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
