import { NextRequest, NextResponse } from 'next/server';
import { triggerZoneAlert } from '../../../src/domains/alertes';

const LANGUES_AUDIO = ['fr', 'fon', 'bariba'];

// Seuls les fichiers déposés dans le Storage du projet peuvent être diffusés aux producteurs
function estUrlStockageInterne(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  try {
    const parsed = new URL(url);
    const parsedBase = new URL(base);
    return (
      parsed.protocol === 'https:' &&
      parsed.host === parsedBase.host &&
      parsed.pathname.startsWith('/storage/v1/object/public/notes-vocales/')
    );
  } catch {
    return false;
  }
}

// POST /api/alertes — déclenche une alerte de zone depuis un signalement confirmé
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { signalement_id?: unknown; conseiller_id?: unknown; recommandation?: unknown; audio_url?: unknown; audio_langue?: unknown };

    const signalementId = typeof body.signalement_id === 'number' ? body.signalement_id : NaN;
    const conseillerId = typeof body.conseiller_id === 'number' ? body.conseiller_id : 1; // 1 = Serge (démo)
    const recommandation = typeof body.recommandation === 'string' ? body.recommandation.trim() || undefined : undefined;
    const audioUrl = typeof body.audio_url === 'string' ? body.audio_url.trim() || undefined : undefined;
    const audioLangue = typeof body.audio_langue === 'string' ? body.audio_langue.trim() || undefined : undefined;

    if (isNaN(signalementId)) {
      return NextResponse.json({ success: false, error: 'signalement_id requis' }, { status: 400 });
    }

    if (audioUrl && !estUrlStockageInterne(audioUrl)) {
      return NextResponse.json({ success: false, error: 'audio_url invalide' }, { status: 400 });
    }

    if (audioLangue && !LANGUES_AUDIO.includes(audioLangue)) {
      return NextResponse.json({ success: false, error: 'audio_langue invalide' }, { status: 400 });
    }

    const result = await triggerZoneAlert(signalementId, conseillerId, recommandation, audioUrl, audioLangue);

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
