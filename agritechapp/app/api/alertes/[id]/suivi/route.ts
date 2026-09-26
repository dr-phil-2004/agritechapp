import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { alertes, envois, profils } from '../../../../../db/schema';
import { eq } from 'drizzle-orm';

// GET /api/alertes/[id]/suivi
// Retourne les envois d'une alerte avec le statut de réception et de lecture
export async function GET(
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
    const [alerte] = await db.select().from(alertes).where(eq(alertes.id, alerteId));
    if (!alerte) {
      return NextResponse.json({ success: false, error: 'Alerte introuvable' }, { status: 404 });
    }

    // Récupérer les envois avec les infos producteur
    const rows = await db
      .select({
        envoi_id: envois.id,
        destinataire_id: envois.destinataire_id,
        nom: profils.nom,
        telephone: profils.telephone,
        canal: envois.canal,
        langue: envois.langue,
        statut: envois.statut,
        sent_at: envois.sent_at,
        vu_at: envois.vu_at,
      })
      .from(envois)
      .innerJoin(profils, eq(envois.destinataire_id, profils.id))
      .where(eq(envois.alerte_id, alerteId))
      .orderBy(envois.sent_at);

    // Grouper par catégorie
    const recu = rows.filter((r) => r.statut === 'envoye' && !r.vu_at);
    const vu   = rows.filter((r) => r.statut === 'envoye' && !!r.vu_at);
    const echec = rows.filter((r) => r.statut === 'echoue');

    return NextResponse.json({
      success: true,
      alerte_id: alerteId,
      total: rows.length,
      recu,
      vu,
      echec,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
