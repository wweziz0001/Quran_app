import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// PUT - Update a record (supports single column update)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  try {
    const { table, id } = await params;
    const body = await request.json();

    // Get model info
    const modelInfo = Prisma.dmmf.datamodel.models.find(
      m => m.name.toLowerCase() === table.toLowerCase() || m.name === table
    );

    if (!modelInfo) {
      // Try raw SQL for non-Prisma tables
      const { column, value, primaryKey } = body;
      
      if (!primaryKey || !column) {
        return NextResponse.json(
          { success: false, error: 'Column and primaryKey are required for raw SQL update' },
          { status: 400 }
        );
      }

      // Use raw SQL
      const updateValue = value === '' ? null : value;
      const updateQuery = `UPDATE ${table} SET ${column} = ? WHERE ${primaryKey} = ?`;
      
      await db.$executeRawUnsafe(updateQuery, updateValue, id);

      // Log to audit
      try {
        await db.auditLog.create({
          data: {
            action: 'UPDATE',
            resourceType: 'table',
            resourceName: table,
            resourceId: String(id),
            query: `UPDATE ${table} SET ${column} = ? WHERE ${primaryKey} = ${id}`,
            details: JSON.stringify({ column, oldValue: null, newValue: updateValue }),
            status: 'success',
          },
        });
      } catch {
        // Audit log failed, but update succeeded
      }

      return NextResponse.json({
        success: true,
        message: 'Row updated successfully',
      });
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

    // Support single column update
    let updateData: Record<string, unknown> = {};
    
    if (body.column && body.primaryKey) {
      // Single column update mode
      updateData[body.column] = body.value === '' ? null : body.value;
    } else {
      // Full update mode
      for (const field of modelInfo.fields) {
        if (field.name in body && field.kind === 'scalar') {
          let value = body[field.name];
          
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
    }

    // Parse ID based on field type
    const parsedId = idField.type === 'Int' ? parseInt(id) : id;

    // @ts-expect-error - Dynamic model access
    const updated = await db[tableName].update({
      where: { [idField.name]: parsedId },
      data: updateData,
    });

    // Log to audit
    try {
      await db.auditLog.create({
        data: {
          action: 'UPDATE',
          resourceType: 'table',
          resourceName: table,
          resourceId: String(id),
          details: JSON.stringify({ updatedFields: Object.keys(updateData) }),
          status: 'success',
        },
      });
    } catch {
      // Audit log failed, but update succeeded
    }

    return NextResponse.json({
      success: true,
      message: 'Row updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update: ' + String(error) },
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
    const body = await request.json();

    // Get model info
    const modelInfo = Prisma.dmmf.datamodel.models.find(
      m => m.name.toLowerCase() === table.toLowerCase() || m.name === table
    );

    if (!modelInfo) {
      // Try raw SQL for non-Prisma tables
      const { primaryKey } = body;
      
      if (!primaryKey) {
        return NextResponse.json(
          { success: false, error: 'primaryKey is required for raw SQL delete' },
          { status: 400 }
        );
      }

      // Use raw SQL
      const deleteQuery = `DELETE FROM ${table} WHERE ${primaryKey} = ?`;
      await db.$executeRawUnsafe(deleteQuery, id);

      // Log to audit
      try {
        await db.auditLog.create({
          data: {
            action: 'DELETE',
            resourceType: 'table',
            resourceName: table,
            resourceId: String(id),
            query: `DELETE FROM ${table} WHERE ${primaryKey} = ${id}`,
            status: 'success',
          },
        });
      } catch {
        // Audit log failed, but delete succeeded
      }

      return NextResponse.json({
        success: true,
        message: 'Row deleted successfully',
      });
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

    // Log to audit
    try {
      await db.auditLog.create({
        data: {
          action: 'DELETE',
          resourceType: 'table',
          resourceName: table,
          resourceId: String(id),
          status: 'success',
        },
      });
    } catch {
      // Audit log failed, but delete succeeded
    }

    return NextResponse.json({
      success: true,
      message: 'Row deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete: ' + String(error) },
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
      // Try raw SQL
      const result = await db.$queryRawUnsafe(`SELECT * FROM ${table} LIMIT 1`) as any[];
      return NextResponse.json({
        success: true,
        data: result[0] || null,
      });
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
      { success: false, error: 'Failed to fetch record: ' + String(error) },
      { status: 500 }
    );
  }
}
