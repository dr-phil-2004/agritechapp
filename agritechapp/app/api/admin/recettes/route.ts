import { NextResponse } from 'next/server';
import { db } from '../../../../db';
import { ventes_declarees, annonces, profils } from '../../../../db/schema';
import { eq, sum } from 'drizzle-orm';

export async function GET() {
  const [totaux] = await db
    .select({
      total_montant: sum(ventes_declarees.montant),
      total_redevance: sum(ventes_declarees.redevance),
    })
    .from(ventes_declarees);

  const details = await db
    .select({
      id: ventes_declarees.id,
      numero_recu: ventes_declarees.numero_recu,
      montant: ventes_declarees.montant,
      redevance: ventes_declarees.redevance,
      created_at: ventes_declarees.created_at,
      produit: annonces.produit,
      acheteur_nom: profils.nom,
    })
    .from(ventes_declarees)
    .innerJoin(annonces, eq(ventes_declarees.annonce_id, annonces.id))
    .innerJoin(profils, eq(ventes_declarees.acheteur_id, profils.id))
    .orderBy(ventes_declarees.created_at);

  return NextResponse.json({
    success: true,
    data: {
      total_montant: Number(totaux?.total_montant ?? 0),
      total_redevance: Number(totaux?.total_redevance ?? 0),
      ventes: details,
    },
  });
}
