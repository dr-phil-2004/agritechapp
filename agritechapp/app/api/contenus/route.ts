import { NextResponse } from 'next/server';
import { db } from '../../../db';
import { contenus } from '../../../db/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(contenus)
      .orderBy(asc(contenus.type), asc(contenus.titre));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Erreur liste contenus publique:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
