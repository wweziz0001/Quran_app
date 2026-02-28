import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET - Fetch data from a specific table
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const searchField = searchParams.get('searchField') || '';

    // Get model info from Prisma DMMF
    const modelInfo = Prisma.dmmf.datamodel.models.find(
      m => m.name.toLowerCase() === table.toLowerCase() || m.name === table
    );

    if (!modelInfo) {
      return NextResponse.json(
        { success: false, error: 'Table not found' },
        { status: 404 }
      );
    }

    const modelName = modelInfo.name;
    const tableName = modelName.charAt(0).toLowerCase() + modelName.slice(1) as keyof typeof db;

    // Build where clause for search
    let where: Record<string, unknown> = {};
    if (search && searchField) {
      const field = modelInfo.fields.find(f => f.name === searchField);
      if (field) {
        if (field.type === 'String') {
          where[searchField] = { contains: search };
        } else if (field.type === 'Int') {
          const num = parseInt(search);
          if (!isNaN(num)) {
            where[searchField] = { equals: num };
          }
        }
      }
    }

    // Get total count
    // @ts-expect-error - Dynamic model access
    const total = await db[tableName].count({ where });

    // Get paginated data
    // @ts-expect-error - Dynamic model access
    const data = await db[tableName].findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      fields: modelInfo.fields,
    });
  } catch (error) {
    console.error('Error fetching table data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch table data: ' + String(error) },
      { status: 500 }
    );
  }
}
