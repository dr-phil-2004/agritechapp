// Infrastructure: Offline - Sync
// Synchronisation de la file d'attente hors ligne
// Note : ce module est 100 % côté navigateur (pas d'import Node.js).
// La synchronisation passe par l'API route /api/signalements afin d'éviter
// d'embarquer postgres/drizzle dans le bundle client.

import { getAgriVeilleDB, type SignalementQueueItem } from './dexie';

export interface SyncResult {
  synced: number;
  errors: number;
}

/**
 * Lit les éléments en attente dans la file Dexie et les envoie via
 * POST /api/signalements (multipart/form-data).
 * Marque chaque élément comme 'synced' ou 'error'.
 */
export async function syncPendingSignalements(): Promise<SyncResult> {
  if (typeof window === 'undefined') {
    return { synced: 0, errors: 0 };
  }

  const db = getAgriVeilleDB();
  const pending = await db.signalements_queue
    .where('status')
    .equals('pending')
    .toArray();

  let synced = 0;
  let errors = 0;

  for (const item of pending) {
    try {
      const formData = new FormData();
      formData.set('producteur_id', String(item.payload.producteur_id));
      formData.set('lat', String(item.payload.lat));
      formData.set('lng', String(item.payload.lng));
      formData.set('canal_origine', item.payload.canal_origine);
      if (item.photo_blob) formData.set('photo', item.photo_blob, 'photo.jpg');
      if (item.audio_blob) formData.set('audio', item.audio_blob, 'note.opus');

      const res = await fetch('/api/signalements', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        await db.signalements_queue.update(item.id!, { status: 'synced' });
        synced++;
      } else {
        const body = await res.json().catch(() => ({}));
        await db.signalements_queue.update(item.id!, {
          status: 'error',
          error_message: (body as { error?: string }).error ?? `HTTP ${res.status}`,
        });
        errors++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      await db.signalements_queue.update(item.id!, {
        status: 'error',
        error_message: message,
      });
      errors++;
    }
  }

  return { synced, errors };
}

/**
 * Compte les signalements en attente
 */
export async function countPendingSignalements(): Promise<number> {
  if (typeof window === 'undefined') return 0;
  const db = getAgriVeilleDB();
  return db.signalements_queue.where('status').equals('pending').count();
}

/**
 * Retourne tous les éléments de la file (pour l'inbox WhatsApp-style)
 */
export async function getQueueItems(): Promise<SignalementQueueItem[]> {
  if (typeof window === 'undefined') return [];
  const db = getAgriVeilleDB();
  return db.signalements_queue.orderBy('created_at').reverse().toArray();
}

/**
 * Réessaye un élément spécifique de la file (par id)
 */
export async function retryQueueItem(id: number): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const db = getAgriVeilleDB();
  const item = await db.signalements_queue.get(id);
  if (!item || (item.status !== 'error' && item.status !== 'pending')) return false;

  try {
    const formData = new FormData();
    formData.set('producteur_id', String(item.payload.producteur_id));
    formData.set('lat', String(item.payload.lat));
    formData.set('lng', String(item.payload.lng));
    formData.set('canal_origine', item.payload.canal_origine);
    if (item.photo_blob) formData.set('photo', item.photo_blob, 'photo.jpg');
    if (item.audio_blob) formData.set('audio', item.audio_blob, 'note.opus');

    const res = await fetch('/api/signalements', { method: 'POST', body: formData });
    if (res.ok) {
      await db.signalements_queue.update(id, { status: 'synced' });
      return true;
    }
    const body = await res.json().catch(() => ({}));
    await db.signalements_queue.update(id, {
      status: 'error',
      error_message: (body as { error?: string }).error ?? `HTTP ${res.status}`,
    });
    return false;
  } catch (err) {
    await db.signalements_queue.update(id, {
      status: 'error',
      error_message: err instanceof Error ? err.message : 'Erreur réseau',
    });
    return false;
  }
}

/**
 * Ajoute un signalement dans la file d'attente hors ligne
 */
export async function addToQueue(
  payload: {
    producteur_id: number;
    lat: number;
    lng: number;
    canal_origine: 'app' | 'web' | 'appel';
  },
  photo_blob: Blob | null,
  audio_blob: Blob | null
): Promise<number> {
  const db = getAgriVeilleDB();
  return db.signalements_queue.add({
    payload,
    photo_blob,
    audio_blob,
    created_at: new Date(),
    status: 'pending',
  });
}
