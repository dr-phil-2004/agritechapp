import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { contenus, contenus_audio } from '../../../../../db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contenuId = parseInt(id, 10);

    if (isNaN(contenuId)) {
      return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
    }

    // Delete associated audio files first (cascade)
    await db.delete(contenus_audio).where(eq(contenus_audio.contenu_id, contenuId));

    // Delete the contenu
    const deleted = await db
      .delete(contenus)
      .where(eq(contenus.id, contenuId))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Fiche introuvable' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression contenu:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
