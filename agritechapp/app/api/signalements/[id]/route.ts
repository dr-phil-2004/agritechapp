import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../db';
import { signalements, alertes, envois } from '../../../../db/schema';
import { eq, inArray } from 'drizzle-orm';

// DELETE /api/signalements/[id]
// Supprime un signalement avec ses alertes et envois associés
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const signalementId = parseInt(id, 10);
    if (isNaN(signalementId)) {
      return NextResponse.json({ success: false, error: 'id invalide' }, { status: 400 });
    }

    // Récupérer les alertes liées
    const alertesLiees = await db
      .select({ id: alertes.id })
      .from(alertes)
      .where(eq(alertes.signalement_id, signalementId));

    if (alertesLiees.length > 0) {
      const alerteIds = alertesLiees.map((a) => a.id);
      await db.delete(envois).where(inArray(envois.alerte_id, alerteIds));
      await db.delete(alertes).where(inArray(alertes.id, alerteIds));
    }

    await db.delete(signalements).where(eq(signalements.id, signalementId));

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
