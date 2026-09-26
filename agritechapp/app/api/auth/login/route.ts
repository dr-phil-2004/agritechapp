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
    const e = error as any;
    const details = {
      message: e?.message ?? String(error),
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      dbUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@') : 'NOT SET',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'NOT SET',
    };
    console.error('Login error:', details);
    return NextResponse.json({ error: JSON.stringify(details) }, { status: 500 });
  }
}
