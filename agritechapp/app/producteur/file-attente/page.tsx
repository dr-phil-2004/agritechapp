'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, CheckCircle, AlertTriangle, RefreshCw, Wifi } from 'lucide-react';
import type { SignalementQueueItem } from '@/infrastructure/offline/dexie';

function formatDate(d: Date) {
  return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function StatusBadge({ status }: { status: SignalementQueueItem['status'] }) {
  if (status === 'synced') {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
        <CheckCircle className="w-3 h-3" aria-hidden="true" /> Envoyé
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Échec
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3" aria-hidden="true" /> En attente
    </span>
  );
}

export default function FileAttentePage() {
  const router = useRouter();
  const [items, setItems] = useState<SignalementQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const loadItems = useCallback(async () => {
    try {
      const { getQueueItems } = await import('@/infrastructure/offline/sync');
      const data = await getQueueItems();
      setItems(data);
    } catch { /* Dexie non disponible */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleRetry = async (id: number) => {
    setRetryingId(id);
    try {
      const { retryQueueItem } = await import('@/infrastructure/offline/sync');
      await retryQueueItem(id);
      await loadItems();
    } finally {
      setRetryingId(null);
    }
  };

  const handleRetryAll = async () => {
    const pending = items.filter((i) => i.status === 'error' || i.status === 'pending');
    for (const item of pending) {
      if (item.id !== undefined) await handleRetry(item.id);
    }
  };

  const pendingCount = items.filter((i) => i.status !== 'synced').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <h1 className="text-xl font-bold text-gray-800 flex-1">
          File d'attente
        </h1>
        {pendingCount > 0 && (
          <button
            onClick={handleRetryAll}
            disabled={retryingId !== null}
            className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
            aria-label="Renvoyer tous les signalements en attente"
          >
            <Wifi className="w-4 h-4" aria-hidden="true" />
            Tout renvoyer
          </button>
        )}
      </div>

      <div className="max-w-lg mx-auto p-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl mt-4">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" aria-hidden="true" />
            <p className="font-semibold text-gray-700">Aucun signalement en attente</p>
            <p className="text-gray-400 text-sm mt-1">Tout est synchronisé.</p>
          </div>
        ) : (
          <ul role="list" aria-label="Signalements en file d'attente" className="space-y-3 mt-2">
            {items.map((item) => (
              <li key={item.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={item.status} />
                      <span className="text-xs text-gray-400">{formatDate(item.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Position : {item.payload.lat.toFixed(4)}, {item.payload.lng.toFixed(4)}
                    </p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-400">
                      {item.photo_blob && <span>📷 Photo</span>}
                      {item.audio_blob && <span>🔊 Note vocale</span>}
                    </div>
                    {item.status === 'error' && item.error_message && (
                      <p className="text-xs text-red-600 mt-1 truncate">{item.error_message}</p>
                    )}
                  </div>

                  {item.status !== 'synced' && item.id !== undefined && (
                    <button
                      onClick={() => handleRetry(item.id!)}
                      disabled={retryingId !== null}
                      className="shrink-0 p-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
                      aria-label="Réessayer l'envoi de ce signalement"
                    >
                      <RefreshCw className={`w-4 h-4 ${retryingId === item.id ? 'animate-spin' : ''}`} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
