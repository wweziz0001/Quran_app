import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// Dangerous patterns that should be blocked
const BLOCKED_PATTERNS = [
  /DROP\s+DATABASE/i,
  /DROP\s+SCHEMA/i,
  /DROP\s+TABLE/i,
  /DROP\s+INDEX/i,
  /DROP\s+TRIGGER/i,
  /DROP\s+VIEW/i,
  /GRANT\s+/i,
  /REVOKE\s+/i,
  /CREATE\s+USER/i,
  /ALTER\s+USER/i,
  /ATTACH\s+DATABASE/i,
  /DETACH\s+DATABASE/i,
];

// Patterns that require warning
const WARNING_PATTERNS = [
  /DELETE\s+FROM/i,
  /TRUNCATE/i,
  /UPDATE\s+\w+\s+SET/i,
  /ALTER\s+TABLE/i,
];

interface QueryValidation {
  valid: boolean;
  error?: string;
  warning?: string;
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'DDL' | 'OTHER';
}

function validateQuery(query: string): QueryValidation {
  const trimmedQuery = query.trim().toUpperCase();
  
  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(query)) {
      return {
        valid: false,
        error: `Query contains blocked pattern: ${pattern.source}`,
        queryType: 'OTHER',
      };
    }
  }
  
  // Determine query type
  let queryType: QueryValidation['queryType'] = 'OTHER';
  if (trimmedQuery.startsWith('SELECT') || trimmedQuery.startsWith('WITH')) {
    queryType = 'SELECT';
  } else if (trimmedQuery.startsWith('INSERT')) {
    queryType = 'INSERT';
  } else if (trimmedQuery.startsWith('UPDATE')) {
    queryType = 'UPDATE';
  } else if (trimmedQuery.startsWith('DELETE')) {
    queryType = 'DELETE';
  } else if (/^(CREATE|ALTER|DROP)/.test(trimmedQuery)) {
    queryType = 'DDL';
  }
  
  // Check for warnings
  for (const pattern of WARNING_PATTERNS) {
    if (pattern.test(query)) {
      return {
        valid: true,
        warning: `Query contains potentially destructive operation`,
        queryType,
      };
    }
  }
  
  return { valid: true, queryType };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, params } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    // Validate query
    const validation = validateQuery(query);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Execute query
    const startTime = performance.now();
    
    try {
      // Use raw query for flexibility
      let result: unknown;
      
      if (params && Array.isArray(params)) {
        result = await db.$queryRawUnsafe(query, ...params);
      } else {
        result = await db.$queryRawUnsafe(query);
      }
      
      const executionTime = performance.now() - startTime;

      // Handle different result types
      if (Array.isArray(result)) {
        // SELECT query
        const columns = result.length > 0 
          ? Object.keys(result[0]).map(key => ({
              name: key,
              type: typeof (result as Record<string, unknown>[])[0][key],
            }))
          : [];

        return NextResponse.json({
          success: true,
          data: result,
          columns,
          rowCount: result.length,
          executionTime,
          queryType: validation.queryType,
          warning: validation.warning,
        });
      } else {
        // DDL or other queries
        return NextResponse.json({
          success: true,
          data: [],
          columns: [],
          rowCount: 0,
          executionTime,
          queryType: validation.queryType,
          warning: validation.warning,
        });
      }
    } catch (queryError) {
      const executionTime = performance.now() - startTime;
      
      return NextResponse.json({
        success: false,
        error: queryError instanceof Error ? queryError.message : 'Query execution failed',
        executionTime,
      });
    }
  } catch (error) {
    console.error('Query API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for safe queries (SELECT only)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json(
      { success: false, error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  // Only allow SELECT queries via GET
  const trimmedQuery = query.trim().toUpperCase();
  if (!trimmedQuery.startsWith('SELECT') && !trimmedQuery.startsWith('WITH')) {
    return NextResponse.json(
      { success: false, error: 'Only SELECT queries allowed via GET' },
      { status: 400 }
    );
  }

  const validation = validateQuery(query);
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 400 }
    );
  }

  try {
    const startTime = performance.now();
    const result = await db.$queryRawUnsafe(query);
    const executionTime = performance.now() - startTime;

    const columns = Array.isArray(result) && result.length > 0
      ? Object.keys(result[0]).map(key => ({
          name: key,
          type: typeof (result as Record<string, unknown>[])[0][key],
        }))
      : [];

    return NextResponse.json({
      success: true,
      data: result,
      columns,
      rowCount: Array.isArray(result) ? result.length : 0,
      executionTime,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Query failed',
    });
  }
}
