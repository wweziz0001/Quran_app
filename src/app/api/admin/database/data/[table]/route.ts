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
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const searchColumn = searchParams.get('searchColumn') || '';

    // First try Prisma model
    const modelInfo = Prisma.dmmf.datamodel.models.find(
      m => m.name.toLowerCase() === table.toLowerCase() || m.name === table
    );

    if (modelInfo) {
      const modelName = modelInfo.name;
      const tableName = modelName.charAt(0).toLowerCase() + modelName.slice(1) as keyof typeof db;

      // Build where clause for search
      let where: Record<string, unknown> = {};
      if (search && searchColumn) {
        const field = modelInfo.fields.find(f => f.name === searchColumn);
        if (field) {
          if (field.type === 'String') {
            where[searchColumn] = { contains: search };
          } else if (field.type === 'Int' || field.type === 'BigInt') {
            const num = parseInt(search);
            if (!isNaN(num)) {
              where[searchColumn] = { equals: num };
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
        skip: offset,
        take: limit,
        orderBy: { id: 'asc' },
      });

      return NextResponse.json({
        success: true,
        data,
        total,
        fields: modelInfo.fields.map(f => ({
          name: f.name,
          type: f.type,
          nullable: !f.isRequired,
          primaryKey: f.isId,
        })),
      });
    }

    // Fallback to raw SQL for non-Prisma tables
    // Get table info
    const tableInfoQuery = `PRAGMA table_info(${table})`;
    const tableInfo = await db.$queryRawUnsafe(tableInfoQuery) as any[];
    
    const columns = tableInfo.map(col => ({
      name: col.name,
      type: col.type,
      nullable: col.notnull === 0,
      primaryKey: col.pk === 1,
    }));

    // Build search condition
    let whereClause = '';
    const queryParams: any[] = [];
    if (search && searchColumn) {
      whereClause = `WHERE ${searchColumn} LIKE ?`;
      queryParams.push(`%${search}%`);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`;
    const countResult = await db.$queryRawUnsafe(countQuery, ...queryParams) as any[];
    const total = Number(countResult[0]?.count || 0);

    // Get data with pagination
    const dataQuery = `SELECT * FROM ${table} ${whereClause} LIMIT ? OFFSET ?`;
    const data = await db.$queryRawUnsafe(dataQuery, ...queryParams, limit, offset);

    return NextResponse.json({
      success: true,
      data,
      total,
      fields: columns,
    });
  } catch (error) {
    console.error('Error fetching table data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch table data: ' + String(error) },
      { status: 500 }
    );
  }
}

// POST - Insert new row
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    const body = await request.json();

    // Build INSERT query
    const columns = Object.keys(body);
    const values = Object.values(body);
    const placeholders = values.map(() => '?').join(', ');
    
    const insertQuery = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    await db.$executeRawUnsafe(insertQuery, ...values);

    return NextResponse.json({
      success: true,
      message: 'Row inserted successfully',
    });
  } catch (error) {
    console.error('Error inserting row:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to insert row: ' + String(error) },
      { status: 500 }
    );
  }
}
