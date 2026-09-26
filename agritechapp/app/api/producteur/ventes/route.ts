import { NextResponse } from 'next/server';
import { db } from '../../../../db';
import { ventes_declarees, annonces, profils } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const producteur_id = Number(searchParams.get('producteur_id'));
  if (!producteur_id) {
    return NextResponse.json({ success: false, error: 'producteur_id requis' }, { status: 400 });
  }

  const result = await db
    .select({
      id: ventes_declarees.id,
      montant: ventes_declarees.montant,
      redevance: ventes_declarees.redevance,
      numero_recu: ventes_declarees.numero_recu,
      created_at: ventes_declarees.created_at,
      produit: annonces.produit,
      quantite: annonces.quantite,
      unite: annonces.unite,
      acheteur_nom: profils.nom,
      acheteur_telephone: profils.telephone,
    })
    .from(ventes_declarees)
    .innerJoin(annonces, eq(ventes_declarees.annonce_id, annonces.id))
    .innerJoin(profils, eq(ventes_declarees.acheteur_id, profils.id))
    .where(eq(ventes_declarees.producteur_id, producteur_id));

  return NextResponse.json({ success: true, data: result });
}
