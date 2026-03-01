import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Relation {
  fromTable: string;  // Actual table name (from @@map)
  fromModel: string;  // Prisma model name
  fromColumn: string;
  toTable: string;    // Actual table name (from @@map)
  toModel: string;    // Prisma model name
  toColumn: string;
  type: 'one-to-many' | 'many-to-one' | 'one-to-one';
}

interface ModelInfo {
  name: string;       // Prisma model name
  tableName: string;  // Actual table name (from @@map)
  fields: {
    name: string;
    type: string;
    isRelation: boolean;
    isForeignKey: boolean;
  }[];
}

export async function GET() {
  try {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

    const relations: Relation[] = [];
    const models: ModelInfo[] = [];
    const modelToTable = new Map<string, string>(); // Map model name to table name

    const prismaScalars = ['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Bytes', 'Decimal', 'BigInt'];

    // First pass: collect all models and their table mappings
    const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
    let modelMatch;

    while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
      const modelName = modelMatch[1];
      const modelBody = modelMatch[2];

      // Get actual table name from @@map or use model name
      let tableName = modelName;
      const mapMatch = modelBody.match(/@@map\(["']([^"']+)["']\)/);
      if (mapMatch) {
        tableName = mapMatch[1];
      }

      modelToTable.set(modelName, tableName);
    }

    // Second pass: parse fields and relations
    modelRegex.lastIndex = 0; // Reset regex

    while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
      const modelName = modelMatch[1];
      const modelBody = modelMatch[2];
      const tableName = modelToTable.get(modelName) || modelName;
      const fields: ModelInfo['fields'] = [];

      const lines = modelBody.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip comments, indexes, and constraints
        if (trimmed.startsWith('//') || trimmed.startsWith('@@') || !trimmed) {
          continue;
        }

        // Match field definition
        const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\?)?/);
        if (!fieldMatch) continue;

        const fieldName = fieldMatch[1];
        const fieldType = fieldMatch[2];
        const isOptional = !!fieldMatch[3];
        const isScalar = prismaScalars.includes(fieldType);
        const isRelation = !isScalar && /^[A-Z]/.test(fieldType);

        // Check for foreign key relation
        const relationMatch = trimmed.match(/@relation\(fields:\s*\[(\w+)\],\s*references:\s*\[(\w+)\]/);
        if (relationMatch) {
          const fromColumn = relationMatch[1];
          const toColumn = relationMatch[2];
          const toModel = fieldType;
          const toTable = modelToTable.get(toModel) || toModel;

          // Determine relation type
          const isArray = modelBody.includes(`${fieldType}[]`);
          
          relations.push({
            fromTable: tableName,
            fromModel: modelName,
            fromColumn,
            toTable,
            toModel,
            toColumn,
            type: isArray ? 'one-to-many' : 'many-to-one',
          });

          fields.push({ name: fieldName, type: fieldType, isRelation: true, isForeignKey: true });
        } else if (isRelation) {
          // Non-foreign-key relation (virtual field)
          fields.push({ name: fieldName, type: fieldType, isRelation: true, isForeignKey: false });
        } else {
          // Scalar field
          fields.push({ name: fieldName, type: fieldType, isRelation: false, isForeignKey: false });
        }
      }

      models.push({ name: modelName, tableName, fields });
    }

    return NextResponse.json({
      success: true,
      models,
      relations,
      stats: {
        totalModels: models.length,
        totalRelations: relations.length,
      },
    });
  } catch (error) {
    console.error('Error parsing schema:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to parse Prisma schema' },
      { status: 500 }
    );
  }
}
