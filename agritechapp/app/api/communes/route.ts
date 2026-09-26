import { NextResponse } from 'next/server';
import { db } from '../../../db';
import { communes } from '../../../db/schema';

// GET /api/communes
export async function GET() {
  try {
    const data = await db.select({ id: communes.id, nom: communes.nom, departement: communes.departement }).from(communes);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
