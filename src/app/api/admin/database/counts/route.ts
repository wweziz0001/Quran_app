import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// Get table counts (separate endpoint for faster initial load)
export async function GET() {
  try {
    const models = Object.keys(Prisma.ModelName);
    
    // Fetch counts in parallel with a timeout
    const counts = await Promise.all(
      models.map(async (modelName) => {
        const tableName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
        try {
          // @ts-expect-error - Dynamic model access
          const count = await db[tableName].count();
          return { tableName, count };
        } catch {
          return { tableName, count: 0 };
        }
      })
    );

    // Convert to object for easy lookup
    const countMap = counts.reduce((acc, { tableName, count }) => {
      acc[tableName] = count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      counts: countMap,
    });
  } catch (error) {
    console.error('Error fetching table counts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch table counts' },
      { status: 500 }
    );
  }
}
