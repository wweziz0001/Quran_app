import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

// Get all tables and their structure (without counts for faster loading)
export async function GET() {
  try {
    // Get Prisma model names from the DMMF
    const models = Object.keys(Prisma.ModelName).map(name => ({
      name,
      displayName: formatModelName(name),
    }));

    // For each model, get its structure (without count for speed)
    const tables = models.map((model) => {
      const tableName = model.name.charAt(0).toLowerCase() + model.name.slice(1);

      // Get fields from Prisma DMMF
      const modelMapping = Prisma.dmmf.datamodel.models.find(
        m => m.name === model.name
      );

      const fields = modelMapping?.fields.map(field => ({
        name: field.name,
        type: field.type,
        kind: field.kind,
        isRequired: field.isRequired,
        isUnique: field.isUnique,
        isId: field.isId,
        hasDefault: field.hasDefaultValue,
        relationName: field.relationName || null,
      })) || [];

      return {
        ...model,
        tableName,
        count: 0, // Will be fetched on demand
        fields,
      };
    });

    return NextResponse.json({
      success: true,
      tables,
    });
  } catch (error) {
    console.error('Error fetching database structure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch database structure' },
      { status: 500 }
    );
  }
}

function formatModelName(name: string): string {
  // Convert camelCase to Title Case with spaces
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}
