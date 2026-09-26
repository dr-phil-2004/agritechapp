import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../src/domains/auth/auth-service';

const authService = new AuthService();

// POST /api/auth/register-producteur — inscription assistée par le conseiller (§ 6 bis)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      nom?: string;
      telephone?: string;
      code?: string;
      langue?: string;
      a_smartphone?: boolean;
      commune_id?: number | null;
      position?: string | null;
      inscrit_par?: number;
    };

    const { nom, telephone, code, langue, a_smartphone, commune_id, position, inscrit_par } = body;

    if (!nom?.trim() || !telephone || !code || !langue) {
      return NextResponse.json(
        { success: false, error: 'Champs requis : nom, telephone, code, langue' },
        { status: 400 }
      );
    }

    if (code.length < 6 || !/^\d+$/.test(code)) {
      return NextResponse.json(
        { success: false, error: 'Le code doit contenir exactement 6 chiffres' },
        { status: 400 }
      );
    }

    const result = await authService.createProducerAccount(
      telephone,
      code,
      nom.trim(),
      langue,
      a_smartphone ?? true,
      commune_id ?? null,
      position ?? null,
      inscrit_par ?? null
    );

    if (result.success) {
      return NextResponse.json({ success: true, user: result.user });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 422 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
