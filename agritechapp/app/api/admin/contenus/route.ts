import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../db';
import { contenus } from '../../../../db/schema';
import { asc } from 'drizzle-orm';
import { z } from 'zod';

const createContenuSchema = z.object({
  type: z.enum(['ravageur', 'reglementation']),
  titre: z.string().min(2, 'Le titre doit contenir au moins 2 caractères'),
  texte: z.string().optional(),
  pictogramme: z.string().optional(),
});

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(contenus)
      .orderBy(asc(contenus.type), asc(contenus.titre));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Erreur liste contenus:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = createContenuSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { type, titre, texte, pictogramme } = parsed.data;

    const [created] = await db
      .insert(contenus)
      .values({
        type,
        titre,
        texte: texte ?? null,
        pictogramme: pictogramme ?? null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Erreur création contenu:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
