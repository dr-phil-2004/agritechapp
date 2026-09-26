import { NextRequest, NextResponse } from 'next/server';
import { SignalementService } from '../../../../../src/domains/signalements/service';
import { signalementStatusSchema, graviteSchema } from '../../../../../src/domains/signalements/schemas';

const service = new SignalementService();

// PATCH /api/signalements/:id/statut
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const signalementId = parseInt(id, 10);

    if (isNaN(signalementId)) {
      return NextResponse.json(
        { success: false, error: 'Identifiant invalide' },
        { status: 400 }
      );
    }

    const body = await request.json() as unknown;

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { success: false, error: 'Corps de requête invalide' },
        { status: 400 }
      );
    }

    const { statut, conseiller_id, gravite, ravageur_id } = body as Record<string, unknown>;

    const statutParsed = signalementStatusSchema.safeParse(statut);
    if (!statutParsed.success) {
      return NextResponse.json(
        { success: false, error: 'Statut invalide' },
        { status: 400 }
      );
    }

    const result = await service.updateStatut(signalementId, statutParsed.data, {
      conseillerId: typeof conseiller_id === 'number' ? conseiller_id : undefined,
      gravite: graviteSchema.safeParse(gravite).success
        ? (gravite as string)
        : undefined,
      ravageur_id: typeof ravageur_id === 'number' ? ravageur_id : undefined,
    });

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 422 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
