// Infrastructure: Offline - Dexie IndexedDB
// File d'attente hors ligne pour les signalements

import Dexie, { type Table } from 'dexie';

export interface SignalementQueueItem {
  id?: number;
  payload: {
    producteur_id: number;
    lat: number;
    lng: number;
    canal_origine: 'app' | 'web' | 'appel';
  };
  photo_blob: Blob | null;
  audio_blob: Blob | null;
  created_at: Date;
  status: 'pending' | 'synced' | 'error';
  error_message?: string;
}

export class AgriVeilleDB extends Dexie {
  signalements_queue!: Table<SignalementQueueItem, number>;

  constructor() {
    super('AgriVeilleDB');
    this.version(1).stores({
      // id est auto-incrémenté, on indexe le status pour filtrer rapidement
      signalements_queue: '++id, status, created_at',
    });
  }
}

// Singleton — ne pas instancier côté serveur
let _db: AgriVeilleDB | null = null;

export function getAgriVeilleDB(): AgriVeilleDB {
  if (typeof window === 'undefined') {
    throw new Error('AgriVeilleDB ne peut être utilisé que côté navigateur');
  }
  if (!_db) {
    _db = new AgriVeilleDB();
  }
  return _db;
}
