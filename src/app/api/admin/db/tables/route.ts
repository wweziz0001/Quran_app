import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    // Get all table names from SQLite
    const tablesResult = await db.$queryRaw<Array<{ name: string; type: string }>>`
      SELECT name, type FROM sqlite_master 
      WHERE type IN ('table', 'view') 
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '_prisma_migrations'
      ORDER BY name
    `;

    // Return tables quickly without counts and columns (they can be fetched separately)
    const tables = tablesResult.map((table) => ({
      name: table.name,
      type: table.type as 'table' | 'view',
      rowCount: 0, // Will be fetched on demand
      sizeBytes: 0,
      columns: [], // Will be fetched on demand
    }));

    return NextResponse.json({
      success: true,
      tables,
    });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}
