import { NextResponse } from 'next/server';

export async function POST() {
  // In a stateless JWT system, logout is handled client-side
  // This endpoint exists for future token blacklisting if needed
  return NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });
}
