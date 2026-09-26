import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../db';
import { alertes, envois } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

// DELETE /api/alertes/[id]
// Supprime une alerte et tous ses envois associés
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const alerteId = parseInt(id, 10);
    if (isNaN(alerteId)) {
      return NextResponse.json({ success: false, error: 'id invalide' }, { status: 400 });
    }

    // Vérifier que l'alerte existe
    const [alerte] = await db.select({ id: alertes.id }).from(alertes).where(eq(alertes.id, alerteId));
    if (!alerte) {
      return NextResponse.json({ success: false, error: 'Alerte introuvable' }, { status: 404 });
    }

    // Supprimer les envois d'abord (contrainte FK)
    await db.delete(envois).where(eq(envois.alerte_id, alerteId));

    // Supprimer l'alerte
    await db.delete(alertes).where(eq(alertes.id, alerteId));

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
