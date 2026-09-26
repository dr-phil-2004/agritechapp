import { NextResponse } from 'next/server';
import { db } from '../../../db';
import { commandes, contacts_annonce, annonces } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const Schema = z.object({
  contact_id: z.number().int().positive(),
  montant: z.number().int().positive(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 422 });
  }

  const [contact] = await db.select().from(contacts_annonce).where(eq(contacts_annonce.id, parsed.data.contact_id));
  if (!contact) {
    return NextResponse.json({ success: false, error: 'Contact introuvable' }, { status: 404 });
  }

  const [annonce] = await db.select().from(annonces).where(eq(annonces.id, contact.annonce_id));
  if (!annonce) {
    return NextResponse.json({ success: false, error: 'Annonce introuvable' }, { status: 404 });
  }

  await db.update(contacts_annonce).set({ statut: 'accepte' }).where(eq(contacts_annonce.id, contact.id));

  const [inserted] = await db.insert(commandes).values({
    contact_id: contact.id,
    annonce_id: contact.annonce_id,
    producteur_id: contact.producteur_id,
    acheteur_id: annonce.acheteur_id,
    montant: parsed.data.montant,
    statut: 'paiement_bloque',
  }).returning();

  return NextResponse.json({ success: true, data: inserted }, { status: 201 });
}
