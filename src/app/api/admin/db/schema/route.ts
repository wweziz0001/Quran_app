import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Relation {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'one-to-many' | 'many-to-one' | 'one-to-one';
}

export async function GET() {
  try {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

    const relations: Relation[] = [];
    const models: { name: string; fields: { name: string; type: string; isRelation: boolean }[] }[] = [];

    // Parse models
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let modelMatch;

    while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
      const modelName = modelMatch[1];
      const modelBody = modelMatch[2];
      const fields: { name: string; type: string; isRelation: boolean }[] = [];

      // Parse fields and relations
      const lines = modelBody.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();

        // Skip comments, indexes, and unique constraints
        if (trimmed.startsWith('//') || trimmed.startsWith('@@') || trimmed.startsWith('@@') || !trimmed) {
          continue;
        }

        // Match field definition: fieldName Type @relation(fields: [field], references: [ref])
        const relationMatch = trimmed.match(/(\w+)\s+(\w+).*@relation\(fields:\s*\[(\w+)\],\s*references:\s*\[(\w+)\]/);
        if (relationMatch) {
          const [, fieldName, fieldType, fromColumn, toColumn] = relationMatch;

          // Determine relation type
          const isArray = modelBody.includes(`${fieldType}[]`) || modelBody.includes(`${fieldType} `);
          const isOptional = trimmed.includes('?');

          relations.push({
            fromTable: modelName,
            fromColumn: fromColumn,
            toTable: fieldType,
            toColumn: toColumn,
            type: isArray ? 'one-to-many' : 'many-to-one',
          });

          fields.push({ name: fieldName, type: fieldType, isRelation: true });
        }

        // Match regular fields
        const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)/);
        if (fieldMatch && !trimmed.includes('@relation')) {
          fields.push({ name: fieldMatch[1], type: fieldMatch[2], isRelation: false });
        }
      }

      models.push({ name: modelName, fields });
    }

    return NextResponse.json({
      success: true,
      models: models,
      relations: relations,
    });
  } catch (error) {
    console.error('Error parsing schema:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to parse Prisma schema' },
      { status: 500 }
    );
  }
}
