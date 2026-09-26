import { NextRequest, NextResponse } from 'next/server';
import { triggerZoneAlert } from '../../../src/domains/alertes';

// POST /api/alertes — déclenche une alerte de zone depuis un signalement confirmé
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { signalement_id?: unknown; conseiller_id?: unknown; recommandation?: unknown };

    const signalementId = typeof body.signalement_id === 'number' ? body.signalement_id : NaN;
    const conseillerId = typeof body.conseiller_id === 'number' ? body.conseiller_id : 1; // 1 = Serge (démo)
    const recommandation = typeof body.recommandation === 'string' ? body.recommandation.trim() || undefined : undefined;

    if (isNaN(signalementId)) {
      return NextResponse.json({ success: false, error: 'signalement_id requis' }, { status: 400 });
    }

    const result = await triggerZoneAlert(signalementId, conseillerId, recommandation);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 422 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
