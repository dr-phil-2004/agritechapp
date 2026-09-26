import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../db';
import { alertes, envois, signalements, ravageurs } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

// GET /api/alertes/producteur?producteur_id=X
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const producteurId = parseInt(searchParams.get('producteur_id') ?? '', 10);

    if (isNaN(producteurId)) {
      return NextResponse.json(
        { success: false, error: 'producteur_id requis' },
        { status: 400 }
      );
    }

    // Récupérer les envois du producteur avec les détails de l'alerte et du signalement
    const rows = await db
      .select({
        alerte_id: alertes.id,
        alerte_created_at: alertes.created_at,
        rayon_km: alertes.rayon_km,
        recommandation: alertes.recommandation,
        signalement_id: signalements.id,
        signalement_statut: signalements.statut,
        gravite: signalements.gravite,
        photo_url: signalements.photo_url,
        position: signalements.position,
        ravageur_nom: ravageurs.nom,
        ravageur_pictogramme: ravageurs.pictogramme,
        envoi_canal: envois.canal,
        envoi_statut: envois.statut,
        envoi_sent_at: envois.sent_at,
      })
      .from(envois)
      .innerJoin(alertes, eq(envois.alerte_id, alertes.id))
      .innerJoin(signalements, eq(alertes.signalement_id, signalements.id))
      .leftJoin(ravageurs, eq(signalements.ravageur_id, ravageurs.id))
      .where(eq(envois.destinataire_id, producteurId))
      .orderBy(alertes.created_at);

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
