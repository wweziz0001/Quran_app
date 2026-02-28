import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    // Get all table names
    const tablesResult = await db.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master 
      WHERE type = 'table' 
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '_prisma_migrations'
    `;

    let totalTables = tablesResult.length;
    let totalRows = 0;
    let totalSize = 0;

    // Count rows and size for each table
    for (const table of tablesResult) {
      try {
        const countResult = await db.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*) as count FROM ${Prisma.raw(table.name)}
        `;
        totalRows += countResult[0]?.count || 0;
      } catch {
        // Skip if table can't be counted
      }
    }

    // Get database file size
    try {
      const sizeResult = await db.$queryRaw<Array<{ pgsize: number }>>`
        SELECT SUM(pgsize) as pgsize FROM dbstat
      `;
      totalSize = sizeResult[0]?.pgsize || 0;
    } catch {
      // dbstat might not be available
    }

    // Get query statistics from QueryHistory
    const queryStats = await db.queryHistory.aggregate({
      _count: true,
      _avg: { executionTime: true },
    });

    const metrics = {
      totalTables,
      totalRows,
      totalSize,
      queryCount: queryStats._count,
      avgQueryTime: queryStats._avg.executionTime || 0,
    };

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
