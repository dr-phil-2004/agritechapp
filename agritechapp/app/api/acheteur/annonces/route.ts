import { NextResponse } from 'next/server';
import { db } from '../../../../db';
import { annonces, contacts_annonce } from '../../../../db/schema';
import { eq, count } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const acheteur_id = Number(searchParams.get('acheteur_id'));
  if (!acheteur_id) {
    return NextResponse.json({ success: false, error: 'acheteur_id requis' }, { status: 400 });
  }

  const result = await db
    .select({
      id: annonces.id,
      produit: annonces.produit,
      description: annonces.description,
      quantite: annonces.quantite,
      unite: annonces.unite,
      prix: annonces.prix,
      statut: annonces.statut,
      created_at: annonces.created_at,
      nb_contacts: count(contacts_annonce.id),
    })
    .from(annonces)
    .leftJoin(contacts_annonce, eq(contacts_annonce.annonce_id, annonces.id))
    .where(eq(annonces.acheteur_id, acheteur_id))
    .groupBy(annonces.id);

  return NextResponse.json({ success: true, data: result });
}
