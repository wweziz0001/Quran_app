import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// PUT - Update a record
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  try {
    const { table, id } = await params;
    const data = await request.json();

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
    const tableName = modelName.charAt(0).toLowerCase() + modelName.slice(1) as keyof typeof db;

    // Find the ID field
    const idField = modelInfo.fields.find(f => f.isId);
    if (!idField) {
      return NextResponse.json(
        { success: false, error: 'No ID field found' },
        { status: 400 }
      );
    }

    // Filter and prepare data
    const updateData: Record<string, unknown> = {};
    for (const field of modelInfo.fields) {
      if (field.name in data && field.kind === 'scalar') {
        let value = data[field.name];
        
        if (value === '' && !field.isRequired) {
          value = null;
        }
        
        if (field.type === 'DateTime' && value) {
          value = new Date(value);
        }
        
        if (field.type === 'Boolean' && typeof value === 'string') {
          value = value === 'true';
        }
        
        if (field.type === 'Int' && typeof value === 'string' && value !== '') {
          value = parseInt(value);
        }
        
        if (field.type === 'Float' && typeof value === 'string' && value !== '') {
          value = parseFloat(value);
        }
        
        updateData[field.name] = value;
      }
    }

    // Parse ID based on field type
    const parsedId = idField.type === 'Int' ? parseInt(id) : id;

    // @ts-expect-error - Dynamic model access
    const updated = await db[tableName].update({
      where: { [idField.name]: parsedId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'تم تحديث السجل بنجاح',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في تحديث السجل: ' + String(error) },
      { status: 500 }
    );
  }
}

// DELETE - Delete a record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  try {
    const { table, id } = await params;

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
    const tableName = modelName.charAt(0).toLowerCase() + modelName.slice(1) as keyof typeof db;

    // Find the ID field
    const idField = modelInfo.fields.find(f => f.isId);
    if (!idField) {
      return NextResponse.json(
        { success: false, error: 'No ID field found' },
        { status: 400 }
      );
    }

    // Parse ID based on field type
    const parsedId = idField.type === 'Int' ? parseInt(id) : id;

    // @ts-expect-error - Dynamic model access
    await db[tableName].delete({
      where: { [idField.name]: parsedId },
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف السجل بنجاح',
    });
  } catch (error) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في حذف السجل: ' + String(error) },
      { status: 500 }
    );
  }
}

// GET single record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  try {
    const { table, id } = await params;

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
    const tableName = modelName.charAt(0).toLowerCase() + modelName.slice(1) as keyof typeof db;

    // Find the ID field
    const idField = modelInfo.fields.find(f => f.isId);
    if (!idField) {
      return NextResponse.json(
        { success: false, error: 'No ID field found' },
        { status: 400 }
      );
    }

    // Parse ID based on field type
    const parsedId = idField.type === 'Int' ? parseInt(id) : id;

    // @ts-expect-error - Dynamic model access
    const record = await db[tableName].findUnique({
      where: { [idField.name]: parsedId },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Error fetching record:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في جلب السجل: ' + String(error) },
      { status: 500 }
    );
  }
}
