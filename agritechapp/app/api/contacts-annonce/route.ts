import { NextResponse } from 'next/server';
import { db } from '../../../db';
import { contacts_annonce } from '../../../db/schema';
import { z } from 'zod';

const Schema = z.object({
  annonce_id: z.number().int().positive(),
  producteur_id: z.number().int().positive(),
  message: z.string().optional(),
  quantite_proposee: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 422 });
  }
  const inserted = await db.insert(contacts_annonce).values(parsed.data).returning();
  return NextResponse.json({ success: true, data: inserted[0] }, { status: 201 });
}
