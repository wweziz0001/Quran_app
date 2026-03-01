import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET - Fetch data from a specific table
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const searchField = searchParams.get('searchField') || '';

    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Table name is required' },
        { status: 400 }
      );
    }

    // Get model info from Prisma DMMF
    const modelInfo = Prisma.dmmf.datamodel.models.find(
      m => m.name.toLowerCase() === table.toLowerCase() || 
           m.name === table
    );

    if (!modelInfo) {
      return NextResponse.json(
        { success: false, error: 'Table not found' },
        { status: 404 }
      );
    }

    const modelName = modelInfo.name;
    const tableName = modelName.charAt(0).toLowerCase() + modelName.slice(1);

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
      { success: false, error: 'Failed to fetch table data' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a record
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { table, id } = body;

    if (!table || !id) {
      return NextResponse.json(
        { success: false, error: 'Table name and ID are required' },
        { status: 400 }
      );
    }

    // Get model info
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
    const tableName = modelName.charAt(0).toLowerCase() + modelName.slice(1);

    // Find the ID field
    const idField = modelInfo.fields.find(f => f.isId);
    if (!idField) {
      return NextResponse.json(
        { success: false, error: 'No ID field found' },
        { status: 400 }
      );
    }

    // Delete the record
    // @ts-expect-error - Dynamic model access
    await db[tableName].delete({
      where: { [idField.name]: id },
    });

    return NextResponse.json({
      success: true,
      message: 'Record deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete record: ' + String(error) },
      { status: 500 }
    );
  }
}

// PUT - Update a record
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { table, id, data } = body;

    if (!table || !id || !data) {
      return NextResponse.json(
        { success: false, error: 'Table name, ID, and data are required' },
        { status: 400 }
      );
    }

    // Get model info
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
    const tableName = modelName.charAt(0).toLowerCase() + modelName.slice(1);

    // Find the ID field
    const idField = modelInfo.fields.find(f => f.isId);
    if (!idField) {
      return NextResponse.json(
        { success: false, error: 'No ID field found' },
        { status: 400 }
      );
    }

    // Filter out relation fields and readonly fields
    const updateData: Record<string, unknown> = {};
    for (const field of modelInfo.fields) {
      if (field.name in data && field.kind === 'scalar') {
        let value = data[field.name];
        
        // Convert empty strings to null for optional fields
        if (value === '' && !field.isRequired) {
          value = null;
        }
        
        // Handle date fields
        if (field.type === 'DateTime' && value) {
          value = new Date(value);
        }
        
        // Handle boolean fields
        if (field.type === 'Boolean' && typeof value === 'string') {
          value = value === 'true';
        }
        
        // Handle int fields
        if (field.type === 'Int' && typeof value === 'string' && value !== '') {
          value = parseInt(value);
        }
        
        // Handle float fields
        if (field.type === 'Float' && typeof value === 'string' && value !== '') {
          value = parseFloat(value);
        }
        
        updateData[field.name] = value;
      }
    }

    // Update the record
    // @ts-expect-error - Dynamic model access
    const updated = await db[tableName].update({
      where: { [idField.name]: id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Record updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update record: ' + String(error) },
      { status: 500 }
    );
  }
}

// POST - Create a new record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { table, data } = body;

    if (!table || !data) {
      return NextResponse.json(
        { success: false, error: 'Table name and data are required' },
        { status: 400 }
      );
    }

    // Get model info
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
    const tableName = modelName.charAt(0).toLowerCase() + modelName.slice(1);

    // Filter and prepare data
    const createData: Record<string, unknown> = {};
    for (const field of modelInfo.fields) {
      if (field.name in data && field.kind === 'scalar' && !field.hasDefaultValue) {
        let value = data[field.name];
        
        // Convert empty strings to null for optional fields
        if (value === '' && !field.isRequired) {
          value = null;
        }
        
        // Handle date fields
        if (field.type === 'DateTime' && value) {
          value = new Date(value);
        }
        
        // Handle boolean fields
        if (field.type === 'Boolean' && typeof value === 'string') {
          value = value === 'true';
        }
        
        // Handle int fields
        if (field.type === 'Int' && typeof value === 'string' && value !== '') {
          value = parseInt(value);
        }
        
        // Handle float fields
        if (field.type === 'Float' && typeof value === 'string' && value !== '') {
          value = parseFloat(value);
        }
        
        createData[field.name] = value;
      }
    }

    // Create the record
    // @ts-expect-error - Dynamic model access
    const created = await db[tableName].create({
      data: createData,
    });

    return NextResponse.json({
      success: true,
      message: 'Record created successfully',
      data: created,
    });
  } catch (error) {
    console.error('Error creating record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create record: ' + String(error) },
      { status: 500 }
    );
  }
}
