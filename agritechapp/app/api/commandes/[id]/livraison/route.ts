import { NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { commandes, ventes_declarees } from '../../../../../db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const commandeId = Number(id);

  const [commande] = await db.select().from(commandes).where(eq(commandes.id, commandeId));
  if (!commande) {
    return NextResponse.json({ success: false, error: 'Commande introuvable' }, { status: 404 });
  }
  if (commande.statut !== 'paiement_bloque') {
    return NextResponse.json({ success: false, error: 'Statut invalide' }, { status: 400 });
  }

  await db.update(commandes)
    .set({ statut: 'termine', livraison_confirme_at: new Date() })
    .where(eq(commandes.id, commandeId));

  const redevance = Math.round(commande.montant * 0.01);
  const numeroRecu = `RECV-${new Date().getFullYear()}-${String(commandeId).padStart(4, '0')}`;

  const [vente] = await db.insert(ventes_declarees).values({
    commande_id: commandeId,
    annonce_id: commande.annonce_id,
    acheteur_id: commande.acheteur_id,
    producteur_id: commande.producteur_id,
    montant: commande.montant,
    redevance,
    numero_recu: numeroRecu,
  }).returning();

  return NextResponse.json({ success: true, data: vente });
}
