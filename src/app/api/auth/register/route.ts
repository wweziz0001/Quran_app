import { NextRequest, NextResponse } from 'next/server';

// Service port
const USERS_SERVICE_PORT = 3005;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Call users-service for registration
    const response = await fetch(`http://localhost:${USERS_SERVICE_PORT}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();

    if (!data.success) {
      const status = data.error?.includes('already') ? 409 : 500;
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to register' },
        { status }
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
    console.error('Error registering:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register' },
      { status: 500 }
    );
  }
}
