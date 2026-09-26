import { NextResponse } from 'next/server';
import { db } from '../../../db';
import { annonces, profils } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export async function GET() {
  const result = await db
    .select({
      id: annonces.id,
      produit: annonces.produit,
      description: annonces.description,
      quantite: annonces.quantite,
      unite: annonces.unite,
      prix: annonces.prix,
      photo_url: annonces.photo_url,
      statut: annonces.statut,
      created_at: annonces.created_at,
      acheteur_nom: profils.nom,
      acheteur_telephone: profils.telephone,
    })
    .from(annonces)
    .innerJoin(profils, eq(annonces.acheteur_id, profils.id))
    .where(eq(annonces.statut, 'active'));
  return NextResponse.json({ success: true, data: result });
}

const CreateSchema = z.object({
  acheteur_id: z.number().int().positive(),
  produit: z.string().min(2),
  description: z.string().optional(),
  quantite: z.number().int().positive(),
  unite: z.string().optional(),
  prix: z.number().int().positive(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 422 });
  }
  const inserted = await db.insert(annonces).values(parsed.data).returning();
  return NextResponse.json({ success: true, data: inserted[0] }, { status: 201 });
}
