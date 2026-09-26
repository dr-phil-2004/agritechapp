import { z } from 'zod';

export const signalementStatusSchema = z.enum([
  'signale',
  'confirme',
  'rejete',
  'traite',
  'clos',
]);

export type SignalementStatus = z.infer<typeof signalementStatusSchema>;

export const graviteSchema = z.enum(['faible', 'moyenne', 'forte']);

export type Gravite = z.infer<typeof graviteSchema>;

export const canalOrigineSchema = z.enum(['app', 'web', 'appel']);

export const signalementSchema = z.object({
  id: z.number(),
  producteur_id: z.number(),
  position: z.string(), // GeoJSON text
  photo_url: z.string().nullable(),
  audio_url: z.string().nullable(),
  canal_origine: canalOrigineSchema,
  statut: signalementStatusSchema,
  ravageur_id: z.number().nullable(),
  gravite: graviteSchema.nullable(),
  conseiller_id: z.number().nullable(),
  created_at: z.date().nullable(),
  confirme_at: z.date().nullable(),
  traite_at: z.date().nullable(),
  clos_at: z.date().nullable(),
});

export type Signalement = z.infer<typeof signalementSchema>;

export const createSignalementSchema = z.object({
  producteur_id: z.number(),
  lat: z.number(),
  lng: z.number(),
  canal_origine: canalOrigineSchema.default('app'),
  // Files are handled separately (Blob/File)
});

export type CreateSignalement = z.infer<typeof createSignalementSchema>;

export const updateStatutSchema = z.object({
  statut: signalementStatusSchema,
  conseiller_id: z.number().optional(),
  gravite: graviteSchema.optional(),
  ravageur_id: z.number().optional(),
});

export type UpdateStatut = z.infer<typeof updateStatutSchema>;

// Transitions de statut autorisées
export const TRANSITIONS_AUTORISEES: Record<SignalementStatus, SignalementStatus[]> = {
  signale: ['confirme', 'rejete'],
  confirme: ['traite'],
  rejete: [],
  traite: ['clos'],
  clos: [],
};
