// Domaine Alertes — déclenche une alerte de zone après confirmation d'un signalement

import { db } from '../../../db';
import { alertes, envois, signalements } from '../../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { SimulatedGateway } from '../../infrastructure/notifications/simulated-gateway';

const RAYON_KM = 10;
const RAYON_M = RAYON_KM * 1000;

export interface AlertResult {
  success: boolean;
  alerte_id?: number;
  producers_notified?: number;
  error?: string;
}

type ProducerRow = {
  id: number;
  nom: string;
  telephone: string;
  langue: string;
  a_smartphone: boolean;
};

/**
 * Déclenche une alerte de zone à partir d'un signalement confirmé.
 * - Trouve les producteurs dans le rayon via PostGIS.
 * - Envoie SMS ou appel vocal selon le profil (§ 6 CLAUDE.md).
 * - Journalise chaque envoi dans la table `envois`.
 */
export async function triggerZoneAlert(
  signalementId: number,
  conseillerId: number,
  recommandation?: string
): Promise<AlertResult> {
  // 1. Charger le signalement
  const [sig] = await db
    .select()
    .from(signalements)
    .where(eq(signalements.id, signalementId));

  if (!sig) {
    return { success: false, error: 'Signalement introuvable' };
  }

  // 2. Producteurs dans le rayon via PostGIS ST_DWithin
  // Position stockée en WKT text → ST_GeomFromText
  const rows = await db.execute<ProducerRow>(sql`
    SELECT id, nom, telephone, langue, a_smartphone
    FROM profils
    WHERE role = 'producteur'
      AND position IS NOT NULL
      AND ST_DWithin(
        ST_GeomFromText(position, 4326)::geography,
        ST_GeomFromText(${sig.position}, 4326)::geography,
        ${RAYON_M}
      )
  `);

  // 3. Créer l'enregistrement d'alerte
  const [alerte] = await db
    .insert(alertes)
    .values({
      signalement_id: signalementId,
      rayon_km: RAYON_KM,
      declenchee_par: conseillerId,
      recommandation: recommandation ?? null,
    })
    .returning();

  // 4. Notifier chaque producteur
  const gateway = new SimulatedGateway();
  let producersNotified = 0;

  const message = `⚠️ Alerte phytosanitaire dans votre zone. Consultez AgriVeille pour les conseils.`;
  const audioFallback = '/audio/alerte-fr.mp3'; // URL placeholder — audio réel géré dans le back-office (§ 5)

  for (const producer of rows) {
    const canal = producer.a_smartphone ? 'sms' : 'appel';
    const langue = (['fr', 'fon', 'bariba'].includes(producer.langue) ? producer.langue : 'fr') as 'fr' | 'fon' | 'bariba';

    let statutEnvoi: 'envoye' | 'echoue' = 'echoue';

    try {
      if (producer.a_smartphone) {
        await gateway.sendSms(producer.telephone, message);
      } else {
        await gateway.placeVoiceCall(producer.telephone, audioFallback, langue);
      }
      statutEnvoi = 'envoye';
      producersNotified++;
    } catch {
      // log conservé dans envois avec statut 'echoue'
    }

    await db.insert(envois).values({
      alerte_id: alerte.id,
      destinataire_id: producer.id,
      canal,
      langue,
      statut: statutEnvoi,
    });
  }

  return {
    success: true,
    alerte_id: alerte.id,
    producers_notified: producersNotified,
  };
}
