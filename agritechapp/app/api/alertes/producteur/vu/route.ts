import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { envois } from '../../../../../db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// PATCH /api/alertes/producteur/vu?producteur_id=X
// Marque tous les envois non lus de ce producteur comme vus (vu_at = now)
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const producteurId = parseInt(searchParams.get('producteur_id') ?? '', 10);

    if (isNaN(producteurId)) {
      return NextResponse.json({ success: false, error: 'producteur_id requis' }, { status: 400 });
    }

    await db
      .update(envois)
      .set({ vu_at: sql`now()` })
      .where(
        and(
          eq(envois.destinataire_id, producteurId),
          eq(envois.statut, 'envoye'),
          isNull(envois.vu_at)
        )
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
