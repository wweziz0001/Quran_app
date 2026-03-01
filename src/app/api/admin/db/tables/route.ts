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

interface ModelInfo {
  modelName: string;
  tableName: string;
  columns: ColumnInfo[];
}

// Parse Prisma Schema for columns and map to actual table names
function parsePrismaSchema(): Map<string, ColumnInfo[]> {
  const tableToColumns = new Map<string, ColumnInfo[]>();

  try {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

    // Match each model block
    const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
    let modelMatch;

    const prismaScalars = ['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Bytes', 'Decimal', 'BigInt'];

    while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
      const modelName = modelMatch[1];
      const modelBody = modelMatch[2];
      const columns: ColumnInfo[] = [];
      const foreignKeys: Record<string, { table: string; column: string }> = {};
      const modelRelations: Record<string, string> = {}; // field name -> related model name

      // Get actual table name from @@map or use model name
      let tableName = modelName;
      const mapMatch = modelBody.match(/@@map\(["']([^"']+)["']\)/);
      if (mapMatch) {
        tableName = mapMatch[1];
      }

      const lines = modelBody.split('\n');
      let hasCompositePK = false;
      const compositePKFields: string[] = [];

      // Check for composite primary key
      const compositePKMatch = modelBody.match(/@@id\(\[([^\]]+)\]\)/);
      if (compositePKMatch) {
        hasCompositePK = true;
        compositePKFields.push(...compositePKMatch[1].split(',').map(f => f.trim()));
      }

      // First pass: collect relations
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('@@') || !trimmed) continue;

        // Check for relation field (not scalar type, starts with uppercase)
        const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\?)?/);
        if (fieldMatch) {
          const fieldName = fieldMatch[1];
          const fieldType = fieldMatch[2];
          
          if (!prismaScalars.includes(fieldType) && /^[A-Z]/.test(fieldType)) {
            modelRelations[fieldName] = fieldType;
          }
        }
      }

      // Second pass: collect columns and foreign keys
      for (const line of lines) {
        const trimmed = line.trim();

        // Skip comments, indexes, and constraints
        if (trimmed.startsWith('//') || trimmed.startsWith('@@') || !trimmed) {
          continue;
        }

        // Parse field definition
        const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\?)?/);
        if (fieldMatch) {
          const fieldName = fieldMatch[1];
          const fieldType = fieldMatch[2];
          const isOptional = !!fieldMatch[3];
          const isId = trimmed.includes('@id') || (hasCompositePK && compositePKFields.includes(fieldName));

          // Check if it's a scalar field (not a relation)
          const isScalar = prismaScalars.includes(fieldType);

          // Check for foreign key in relation
          const relationMatch = trimmed.match(/@relation\(fields:\s*\[(\w+)\],\s*references:\s*\[(\w+)\]/);
          if (relationMatch) {
            const fkColumn = relationMatch[1];
            const refColumn = relationMatch[2];
            const relatedModel = fieldType;
            foreignKeys[fkColumn] = { table: relatedModel, column: refColumn };
          }

          if (isScalar) {
            columns.push({
              name: fieldName,
              type: fieldType,
              nullable: isOptional,
              primaryKey: isId,
            });
          }
        }
      }

      // Third pass: add foreign keys to columns
      for (const col of columns) {
        if (foreignKeys[col.name]) {
          col.foreignKey = foreignKeys[col.name];
        }
      }

      // Store columns under the ACTUAL table name (from @@map or model name)
      tableToColumns.set(tableName, columns);
    }
  } catch (error) {
    console.error('Error parsing Prisma schema:', error);
  }

  return tableToColumns;
}

// Get all table names from database
async function getTableNames(): Promise<string[]> {
  const tablesResult = await db.$queryRaw<Array<{ name: string }>>`
    SELECT name FROM sqlite_master 
    WHERE type = 'table' 
    AND name NOT LIKE 'sqlite_%'
    AND name NOT LIKE '_prisma_migrations'
    ORDER BY name
  `;
  return tablesResult.map(t => t.name);
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

    // Parse Prisma Schema for columns (maps @@map names correctly)
    const schemaColumns = parsePrismaSchema();

    // Get row counts in parallel
    const tables = await Promise.all(
      tablesResult.map(async (table) => {
        // Look up columns using actual table name (from @@map)
        const columns = schemaColumns.get(table.name) || [];
        
        // Get row count
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
