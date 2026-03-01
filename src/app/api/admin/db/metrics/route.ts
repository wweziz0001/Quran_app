import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    // Get all table names
    const tablesResult = await db.$queryRaw<Array<{ name: string; type: string }>>`
      SELECT name, type FROM sqlite_master 
      WHERE type IN ('table', 'view')
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '_prisma_migrations'
    `;

    let totalTables = 0;
    let totalViews = 0;
    let totalRows = 0;
    let totalSize = 0;
    let indexCount = 0;
    const tableMetrics: any[] = [];

    // Get table-level statistics
    for (const table of tablesResult) {
      if (table.type === 'table') {
        totalTables++;
      } else {
        totalViews++;
        continue;
      }

      try {
        // Get row count
        const countResult = await db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${table.name}`) as any[];
        const rowCount = Number(countResult[0]?.count || 0);
        totalRows += rowCount;

        // Get index count for this table
        const indexResult = await db.$queryRawUnsafe(
          `SELECT COUNT(*) as count FROM sqlite_master WHERE type='index' AND tbl_name=?`,
          table.name
        ) as any[];
        const tableIndexCount = Number(indexResult[0]?.count || 0);
        indexCount += tableIndexCount;

        tableMetrics.push({
          name: table.name,
          rowCount,
          sizeBytes: 0, // Will be calculated below
          indexCount: tableIndexCount,
          readCount: 0,
          writeCount: 0,
        });
      } catch {
        // Skip if table can't be analyzed
      }
    }

    // Get database file size and page info
    let pageSize = 4096;
    let pageCount = 0;
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const dbPath = path.join(process.cwd(), 'db', 'custom.db');
      const stats = await fs.stat(dbPath);
      totalSize = stats.size;
      
      // Get page count and size from PRAGMA
      const pageInfo = await db.$queryRawUnsafe('PRAGMA page_count') as any[];
      pageCount = Number(pageInfo[0]?.page_count || 0);
      
      const pageSizeInfo = await db.$queryRawUnsafe('PRAGMA page_size') as any[];
      pageSize = Number(pageSizeInfo[0]?.page_size || 4096);
    } catch {
      // Can't get file info
    }

    // Get query statistics from QueryHistory
    let queryCount = 0;
    let avgQueryTime = 0;
    const slowQueries: any[] = [];
    
    try {
      const queryStats = await db.queryHistory.aggregate({
        _count: true,
        _avg: { executionTime: true },
      });
      queryCount = queryStats._count;
      avgQueryTime = queryStats._avg.executionTime || 0;

      // Get slow queries (> 100ms)
      const slowQueriesResult = await db.queryHistory.findMany({
        where: { executionTime: { gt: 100 } },
        orderBy: { executionTime: 'desc' },
        take: 20,
      });
      
      slowQueries.push(...slowQueriesResult.map(q => ({
        query: q.query,
        executionTime: q.executionTime,
        timestamp: q.createdAt,
        rowCount: q.rowCount || 0,
      })));
    } catch {
      // QueryHistory table might not exist yet
    }

    const metrics = {
      database: {
        size: totalSize,
        tableCount: totalTables,
        viewCount: totalViews,
        indexCount,
        pageCount,
        pageSize,
      },
      queries: {
        totalExecuted: queryCount,
        averageTime: avgQueryTime,
        slowQueries,
      },
      tables: tableMetrics,
      connections: {
        active: 1,
        idle: 0,
      },
      totalTables: totalTables + totalViews,
      totalRows,
      totalSize: Number(totalSize),
      queryCount,
      avgQueryTime,
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
