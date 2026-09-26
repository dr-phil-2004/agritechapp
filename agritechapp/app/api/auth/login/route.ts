import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../src/domains/auth/auth-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, phone, code, email, password } = body;

    const authService = new AuthService();
    let result;

    if (type === 'phone') {
      result = await authService.loginWithPhoneCode(phone, code);
    } else if (type === 'email') {
      result = await authService.loginWithEmailPassword(email, password);
    } else {
      return NextResponse.json(
        { error: 'Type de connexion invalide' },
        { status: 400 }
      );
    }

    if (result.success) {
      return NextResponse.json({ success: true, user: result.user });
    } else {
      return NextResponse.json(
        { error: result.error, blocked: result.blocked },
        { status: 401 }
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Login error:', msg);
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
