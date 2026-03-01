// src/app/api/tajweed-rules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Force recompilation for Prisma client update

// GET /api/tajweed-rules - Get all tajweed rules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    if (code) {
      const rule = await db.tajweedRule.findUnique({
        where: { code },
      });

      if (!rule) {
        return NextResponse.json(
          { success: false, error: 'Tajweed rule not found' },
          { status: 404 }
        );
      }

      // Parse examples JSON if exists
      const data = {
        ...rule,
        examples: rule.examples ? JSON.parse(rule.examples) : null,
      };

      return NextResponse.json({ success: true, data });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (category) where.category = category;
    if (activeOnly) where.isActive = true;

    const rules = await db.tajweedRule.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    // Parse examples
    const data = rules.map((rule) => ({
      ...rule,
      examples: rule.examples ? JSON.parse(rule.examples) : null,
    }));

    // Get categories
    const categories = await db.tajweedRule.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { id: true },
    });

    return NextResponse.json({
      success: true,
      data,
      categories: categories.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
      count: data.length,
    });
  } catch (error) {
    console.error('Tajweed rules GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tajweed rules' },
      { status: 500 }
    );
  }
}

// POST /api/tajweed-rules - Create tajweed rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nameArabic, nameEnglish, code, description, color, examples, category, sortOrder, isActive } = body;

    if (!nameArabic || !nameEnglish || !code) {
      return NextResponse.json(
        { success: false, error: 'nameArabic, nameEnglish, and code are required' },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await db.tajweedRule.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Tajweed rule with this code already exists' },
        { status: 409 }
      );
    }

    const rule = await db.tajweedRule.create({
      data: {
        nameArabic,
        nameEnglish,
        code,
        description,
        color,
        examples: examples ? JSON.stringify(examples) : null,
        category,
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...rule,
        examples: rule.examples ? JSON.parse(rule.examples) : null,
      },
    });
  } catch (error) {
    console.error('Tajweed rules POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create tajweed rule' },
      { status: 500 }
    );
  }
}

// PATCH /api/tajweed-rules - Update tajweed rule
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, ...updateData } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'code is required' },
        { status: 400 }
      );
    }

    // Prepare update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = { ...updateData };
    if (updateData.examples !== undefined) {
      data.examples = updateData.examples ? JSON.stringify(updateData.examples) : null;
    }

    const rule = await db.tajweedRule.update({
      where: { code },
      data,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...rule,
        examples: rule.examples ? JSON.parse(rule.examples) : null,
      },
    });
  } catch (error) {
    console.error('Tajweed rules PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update tajweed rule' },
      { status: 500 }
    );
  }
}

// DELETE /api/tajweed-rules - Delete tajweed rule
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'code is required' },
        { status: 400 }
      );
    }

    await db.tajweedRule.delete({
      where: { code },
    });

    return NextResponse.json({ success: true, message: 'Tajweed rule deleted' });
  } catch (error) {
    console.error('Tajweed rules DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete tajweed rule' },
      { status: 500 }
    );
  }
}
