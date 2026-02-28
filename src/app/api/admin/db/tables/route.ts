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

    // Get row counts for each table
    const tables = await Promise.all(
      tablesResult.map(async (table) => {
        try {
          const countResult = await db.$queryRaw<Array<{ count: number }>>`
            SELECT COUNT(*) as count FROM ${Prisma.raw(table.name)}
          `;
          const rowCount = countResult[0]?.count || 0;

          // Get column info
          const columnsResult = await db.$queryRaw<Array<{
            name: string;
            type: string;
            notnull: number;
            dflt_value: string | null;
            pk: number;
          }>>`
            PRAGMA table_info(${Prisma.raw(table.name)})
          `;

          const columns = columnsResult.map(col => ({
            name: col.name,
            type: col.type,
            nullable: col.notnull === 0,
            defaultValue: col.dflt_value,
            primaryKey: col.pk > 0,
          }));

          // Get table size (approximate for SQLite)
          const sizeResult = await db.$queryRaw<Array<{ pgsize: number }>>`
            SELECT pgsize FROM dbstat WHERE name = ${table.name} LIMIT 1
          `.catch(() => []);

          const sizeBytes = sizeResult[0]?.pgsize || 0;

          return {
            name: table.name,
            type: table.type as 'table' | 'view',
            rowCount,
            sizeBytes,
            columns,
          };
        } catch {
          return {
            name: table.name,
            type: table.type as 'table' | 'view',
            rowCount: 0,
            sizeBytes: 0,
            columns: [],
          };
        }
      })
    );

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
