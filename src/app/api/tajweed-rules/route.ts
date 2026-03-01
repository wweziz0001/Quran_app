// src/app/api/tajweed-rules/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/tajweed-rules - Get all tajweed rules
export async function GET() {
  try {
    const rules = await db.tajweedRule.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Group by category
    const byCategory = rules.reduce((acc, rule) => {
      const category = rule.category || 'OTHER';
      if (!acc[category]) acc[category] = [];
      acc[category].push(rule);
      return acc;
    }, {} as Record<string, typeof rules>);

    return NextResponse.json({
      success: true,
      data: rules,
      byCategory,
    });
  } catch (error) {
    console.error('Error fetching tajweed rules:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tajweed rules' },
      { status: 500 }
    );
  }
}
