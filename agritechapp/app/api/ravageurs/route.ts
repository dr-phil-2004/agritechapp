import { NextResponse } from 'next/server';
import { db } from '../../../db';
import { ravageurs } from '../../../db/schema';

// GET /api/ravageurs — liste des ravageurs pour le formulaire de qualification
export async function GET() {
  try {
    const data = await db.select().from(ravageurs);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
