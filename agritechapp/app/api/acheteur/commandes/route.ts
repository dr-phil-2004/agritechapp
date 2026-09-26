import { NextResponse } from 'next/server';
import { db } from '../../../../db';
import { commandes, annonces, profils } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const acheteur_id = Number(searchParams.get('acheteur_id'));
  if (!acheteur_id) {
    return NextResponse.json({ success: false, error: 'acheteur_id requis' }, { status: 400 });
  }

  const result = await db
    .select({
      id: commandes.id,
      montant: commandes.montant,
      statut: commandes.statut,
      created_at: commandes.created_at,
      livraison_confirme_at: commandes.livraison_confirme_at,
      produit: annonces.produit,
      producteur_nom: profils.nom,
    })
    .from(commandes)
    .innerJoin(annonces, eq(commandes.annonce_id, annonces.id))
    .innerJoin(profils, eq(commandes.producteur_id, profils.id))
    .where(eq(commandes.acheteur_id, acheteur_id));

  return NextResponse.json({ success: true, data: result });
}
