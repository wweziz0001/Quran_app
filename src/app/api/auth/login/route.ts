import { NextRequest, NextResponse } from 'next/server';

// Service port
const USERS_SERVICE_PORT = 3005;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Call users-service for login
    const response = await fetch(`http://localhost:${USERS_SERVICE_PORT}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Invalid credentials' },
        { status: response.status === 401 ? 401 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        token: data.data.token,
        user: {
          id: data.data.user.id,
          email: data.data.user.email,
          name: data.data.user.name,
          role: data.data.user.role,
        },
      },
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to login' },
      { status: 500 }
    );
  }
}
