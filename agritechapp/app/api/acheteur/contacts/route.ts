import { NextResponse } from 'next/server';
import { db } from '../../../../db';
import { contacts_annonce, annonces, profils } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const acheteur_id = Number(searchParams.get('acheteur_id'));
  if (!acheteur_id) {
    return NextResponse.json({ success: false, error: 'acheteur_id requis' }, { status: 400 });
  }

  const result = await db
    .select({
      contact_id: contacts_annonce.id,
      statut_contact: contacts_annonce.statut,
      message: contacts_annonce.message,
      quantite_proposee: contacts_annonce.quantite_proposee,
      contact_created_at: contacts_annonce.created_at,
      annonce_id: annonces.id,
      produit: annonces.produit,
      prix: annonces.prix,
      unite: annonces.unite,
      producteur_id: profils.id,
      producteur_nom: profils.nom,
      producteur_telephone: profils.telephone,
    })
    .from(contacts_annonce)
    .innerJoin(annonces, eq(contacts_annonce.annonce_id, annonces.id))
    .innerJoin(profils, eq(contacts_annonce.producteur_id, profils.id))
    .where(eq(annonces.acheteur_id, acheteur_id));

  return NextResponse.json({ success: true, data: result });
}
