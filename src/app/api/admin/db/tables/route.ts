import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
}

// Parse Prisma Schema for columns (faster than PRAGMA for each table)
function parsePrismaSchema(): Map<string, ColumnInfo[]> {
  const models = new Map<string, ColumnInfo[]>();

  try {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let modelMatch;

    const prismaScalars = ['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Bytes', 'Decimal', 'BigInt'];

    while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
      const modelName = modelMatch[1];
      const modelBody = modelMatch[2];
      const columns: ColumnInfo[] = [];
      const foreignKeys: Record<string, { table: string; column: string }> = {};

      const lines = modelBody.split('\n');
      let hasCompositePK = false;
      const compositePKFields: string[] = [];

      // Check for composite primary key
      const compositePKMatch = modelBody.match(/@@id\(\[([^\]]+)\]\)/);
      if (compositePKMatch) {
        hasCompositePK = true;
        compositePKFields.push(...compositePKMatch[1].split(',').map(f => f.trim()));
      }

      // First pass: collect all columns and foreign keys
      for (const line of lines) {
        const trimmed = line.trim();

        // Skip comments, indexes, and constraints
        if (trimmed.startsWith('//') || trimmed.startsWith('@@') || trimmed.startsWith('map') || !trimmed) {
          continue;
        }

        // Parse field definition
        const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\?)?/);
        if (fieldMatch) {
          const fieldName = fieldMatch[1];
          const fieldType = fieldMatch[2];
          const isOptional = !!fieldMatch[3];
          const isId = trimmed.includes('@id') || (hasCompositePK && compositePKFields.includes(fieldName));

          // Check if it's a relation field
          const isRelation = !prismaScalars.includes(fieldType) && /^[A-Z]/.test(fieldType);

          // Check for foreign key in relation
          const relationMatch = trimmed.match(/@relation\(fields:\s*\[(\w+)\],\s*references:\s*\[(\w+)\]/);
          if (relationMatch) {
            const fkColumn = relationMatch[1];
            const refColumn = relationMatch[2];
            foreignKeys[fkColumn] = { table: fieldType, column: refColumn };
          }

          if (!isRelation) {
            columns.push({
              name: fieldName,
              type: fieldType,
              nullable: isOptional,
              primaryKey: isId,
            });
          }
        }
      }

      // Second pass: add foreign keys to columns
      for (const col of columns) {
        if (foreignKeys[col.name]) {
          col.foreignKey = foreignKeys[col.name];
        }
      }

      models.set(modelName, columns);
    }
  } catch (error) {
    console.error('Error parsing Prisma schema:', error);
  }

  return models;
}

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

    // Parse Prisma Schema for columns (much faster than PRAGMA for each table)
    const schemaModels = parsePrismaSchema();

    // Get row counts in parallel
    const tables = await Promise.all(
      tablesResult.map(async (table) => {
        const columns = schemaModels.get(table.name) || [];
        
        // Get row count (this is fast in SQLite)
        let rowCount = 0;
        try {
          const countResult = await db.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM ${Prisma.raw(table.name)}`;
          rowCount = Number(countResult[0]?.count || 0);
        } catch {
          // Table might be empty or have issues
        }

        return {
          name: table.name,
          type: table.type as 'table' | 'view',
          rowCount,
          sizeBytes: 0,
          columns,
        };
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
