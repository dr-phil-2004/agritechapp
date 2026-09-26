import { db } from '../../../db';
import { signalements } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { supabaseAdmin } from '../../infrastructure/supabase/admin-client';
import {
  SignalementStatus,
  TRANSITIONS_AUTORISEES,
} from './schemas';

export interface SignalementFilters {
  statut?: SignalementStatus;
  producteur_id?: number;
  zone?: string;
}

export interface CreateSignalementInput {
  producteur_id: number;
  lat: number;
  lng: number;
  canal_origine?: 'app' | 'web' | 'appel';
  photo?: Blob | File | null;
  audio?: Blob | File | null;
}

export interface SignalementResult {
  success: boolean;
  data?: typeof signalements.$inferSelect;
  error?: string;
}

export class SignalementService {
  /**
   * Crée un signalement : upload des médias, insertion en DB
   */
  async createSignalement(input: CreateSignalementInput): Promise<SignalementResult> {
    let photo_url: string | null = null;
    let audio_url: string | null = null;

    // Upload photo si présente
    if (input.photo) {
      const filename = `${Date.now()}-${input.producteur_id}-photo.jpg`;
      const { error } = await supabaseAdmin.storage
        .from('photos')
        .upload(filename, input.photo, { contentType: 'image/jpeg', upsert: false });

      if (error) {
        return { success: false, error: `Erreur upload photo : ${error.message}` };
      }

      const { data: urlData } = supabaseAdmin.storage
        .from('photos')
        .getPublicUrl(filename);
      photo_url = urlData.publicUrl;
    }

    // Upload note vocale si présente
    if (input.audio) {
      const filename = `${Date.now()}-${input.producteur_id}-audio.opus`;
      const { error } = await supabaseAdmin.storage
        .from('notes-vocales')
        .upload(filename, input.audio, { contentType: 'audio/ogg', upsert: false });

      if (error) {
        return { success: false, error: `Erreur upload audio : ${error.message}` };
      }

      const { data: urlData } = supabaseAdmin.storage
        .from('notes-vocales')
        .getPublicUrl(filename);
      audio_url = urlData.publicUrl;
    }

    // Position WKT — compatible avec l'index GIST ST_GeomFromText()
    const position = `POINT(${input.lng} ${input.lat})`;

    try {
      const [created] = await db
        .insert(signalements)
        .values({
          producteur_id: input.producteur_id,
          position,
          photo_url,
          audio_url,
          canal_origine: input.canal_origine ?? 'app',
          statut: 'signale',
        })
        .returning();

      return { success: true, data: created };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      return { success: false, error: `Erreur insertion : ${message}` };
    }
  }

  /**
   * Récupère les signalements avec filtres optionnels
   */
  async getSignalements(filters?: SignalementFilters): Promise<typeof signalements.$inferSelect[]> {
    if (filters?.statut) {
      return db
        .select()
        .from(signalements)
        .where(eq(signalements.statut, filters.statut));
    }

    if (filters?.producteur_id) {
      return db
        .select()
        .from(signalements)
        .where(eq(signalements.producteur_id, filters.producteur_id));
    }

    return db.select().from(signalements);
  }

  /**
   * Met à jour le statut d'un signalement avec validation des transitions
   */
  async updateStatut(
    id: number,
    statut: SignalementStatus,
    options?: { conseillerId?: number; gravite?: string; ravageur_id?: number }
  ): Promise<SignalementResult> {
    // Récupérer le signalement actuel
    const [existing] = await db
      .select()
      .from(signalements)
      .where(eq(signalements.id, id));

    if (!existing) {
      return { success: false, error: 'Signalement introuvable' };
    }

    // Valider la transition
    const currentStatut = existing.statut as SignalementStatus;
    const transitionsAutorisees = TRANSITIONS_AUTORISEES[currentStatut];

    if (!transitionsAutorisees.includes(statut)) {
      return {
        success: false,
        error: `Transition interdite : ${currentStatut} → ${statut}. Transitions autorisées : ${transitionsAutorisees.join(', ') || 'aucune'}`,
      };
    }

    // Préparer les champs à mettre à jour
    const updateValues: Record<string, unknown> = { statut };
    const now = new Date();

    if (statut === 'confirme') {
      updateValues.confirme_at = now;
      if (options?.conseillerId) updateValues.conseiller_id = options.conseillerId;
      if (options?.gravite) updateValues.gravite = options.gravite;
      if (options?.ravageur_id) updateValues.ravageur_id = options.ravageur_id;
    } else if (statut === 'traite') {
      updateValues.traite_at = now;
    } else if (statut === 'clos') {
      updateValues.clos_at = now;
    } else if (statut === 'rejete') {
      if (options?.conseillerId) updateValues.conseiller_id = options.conseillerId;
    }

    try {
      const [updated] = await db
        .update(signalements)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set(updateValues as any)
        .where(eq(signalements.id, id))
        .returning();

      return { success: true, data: updated };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      return { success: false, error: `Erreur mise à jour : ${message}` };
    }
  }
}
