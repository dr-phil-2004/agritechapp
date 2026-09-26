import { NextResponse } from 'next/server';
import { db } from '../../../../db';
import { signalements, alertes, envois } from '../../../../db/schema';
import { count, countDistinct, eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const [[signalementsEnCours], [alertesEnvoyees], [producteursPrevenus], [delaiMoyen]] =
      await Promise.all([
        db.select({ value: count() }).from(signalements).where(sql`${signalements.statut} NOT IN ('clos', 'rejete')`),
        db.select({ value: count() }).from(alertes),
        db.select({ value: countDistinct(envois.destinataire_id) }).from(envois),
        db.select({
          value: sql<number | null>`ROUND(AVG(EXTRACT(EPOCH FROM (${alertes.created_at} - ${signalements.created_at})) / 60))::integer`,
        }).from(alertes).innerJoin(signalements, eq(alertes.signalement_id, signalements.id)),
      ]);

    return NextResponse.json({
      signalements_en_cours: Number(signalementsEnCours?.value ?? 0),
      alertes_envoyees: Number(alertesEnvoyees?.value ?? 0),
      producteurs_prevenus: Number(producteursPrevenus?.value ?? 0),
      delai_moyen_min: delaiMoyen?.value ?? null,
    });
  } catch (error) {
    console.error('Erreur stats admin:', error);
    return NextResponse.json(
      {
        signalements_en_cours: 0,
        alertes_envoyees: 0,
        producteurs_prevenus: 0,
        delai_moyen_min: null,
      },
      { status: 500 }
    );
  }
}
