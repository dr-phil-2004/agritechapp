import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../src/domains/auth/auth-service';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('E-mail invalide'),
  nom: z.string().min(2, 'Nom requis'),
  langue: z.enum(['fr', 'fon', 'bariba']),
  commune_id: z.number().int().positive().nullable().optional(),
  inscrit_par: z.number().int().positive(),
});

// POST /api/admin/conseillers
// Crée un compte conseiller (action réservée à l'admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as unknown;
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const { email, nom, langue, commune_id, inscrit_par } = parsed.data;

    const authService = new AuthService();
    const result = await authService.createConseillerAccount(
      email,
      nom,
      langue,
      commune_id ?? null,
      inscrit_par
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 422 });
    }

    return NextResponse.json({ success: true, user: result.user }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
