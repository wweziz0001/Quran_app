import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// Execute SQL query (SELECT only for safety)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    // Trim and normalize the query
    const normalizedQuery = query.trim();

    // Security: Only allow SELECT, PRAGMA, and EXPLAIN queries
    const allowedPatterns = [
      /^SELECT\s+/i,
      /^PRAGMA\s+/i,
      /^EXPLAIN\s+/i,
      /^WITH\s+/i, // CTE queries
    ];

    const isAllowed = allowedPatterns.some(pattern => pattern.test(normalizedQuery));

    if (!isAllowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'فقط أوامر SELECT و PRAGMA و EXPLAIN مسموح بها للأمان',
          errorEn: 'Only SELECT, PRAGMA, and EXPLAIN queries are allowed for security'
        },
        { status: 403 }
      );
    }

    // Block dangerous keywords even in SELECT
    const dangerousKeywords = [
      /\bDROP\s+/i,
      /\bDELETE\s+/i,
      /\bTRUNCATE\s+/i,
      /\bINSERT\s+/i,
      /\bUPDATE\s+/i,
      /\bALTER\s+/i,
      /\bCREATE\s+/i,
      /\bGRANT\s+/i,
      /\bREVOKE\s+/i,
    ];

    const hasDangerousKeyword = dangerousKeywords.some(pattern => pattern.test(normalizedQuery));

    if (hasDangerousKeyword) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'تم اكتشاف كلمات مفتاحية خطرة في الاستعلام',
          errorEn: 'Dangerous keywords detected in query'
        },
        { status: 403 }
      );
    }

    // Execute the query using Prisma's $queryRaw
    let results: unknown;
    const startTime = Date.now();

    try {
      // Use $queryRaw for SELECT queries
      results = await db.$queryRawUnsafe(normalizedQuery);
    } catch (queryError) {
      console.error('SQL Query Error:', queryError);
      
      let errorMessage = 'خطأ في تنفيذ الاستعلام';
      
      if (queryError instanceof Prisma.PrismaClientKnownRequestError) {
        errorMessage = queryError.message;
      } else if (queryError instanceof Error) {
        errorMessage = queryError.message;
      }

      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          query: normalizedQuery
        },
        { status: 400 }
      );
    }

    const executionTime = Date.now() - startTime;

    // Process results
    let columns: string[] = [];
    let rows: Record<string, unknown>[] = [];
    let rowCount = 0;

    if (Array.isArray(results)) {
      rows = results as Record<string, unknown>[];
      rowCount = rows.length;
      
      if (rowCount > 0) {
        columns = Object.keys(rows[0]);
      }
    } else if (results && typeof results === 'object') {
      rows = [results as Record<string, unknown>];
      rowCount = 1;
      columns = Object.keys(results);
    }

    return NextResponse.json({
      success: true,
      data: {
        columns,
        rows,
        rowCount,
        executionTime,
        query: normalizedQuery,
      },
    });

  } catch (error) {
    console.error('SQL Execution Error:', error);
    
    let errorMessage = 'حدث خطأ غير متوقع';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// Get query history (stored in memory for this session)
const queryHistory: { query: string; timestamp: Date; success: boolean }[] = [];

export async function GET() {
  try {
    // Get table names and their row counts
    const models = Object.keys(Prisma.ModelName);
    
    const tableInfo = await Promise.all(
      models.map(async (modelName) => {
        const tableName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
        try {
          // @ts-expect-error - Dynamic model access
          const count = await db[tableName].count();
          return { name: tableName, count };
        } catch {
          return { name: tableName, count: 0 };
        }
      })
    );

    return NextResponse.json({
      success: true,
      tables: tableInfo,
      history: queryHistory.slice(-20), // Last 20 queries
    });
  } catch (error) {
    console.error('Error getting SQL info:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get database info' },
      { status: 500 }
    );
  }
}
