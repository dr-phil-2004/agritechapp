'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { Camera, Bell, ShoppingCart, Volume2, CheckCircle, Clock, ArrowLeft } from 'lucide-react';

export default function ProducteurPage() {
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done'>('idle');

  // Charger le compteur de file d'attente depuis Dexie (client-side only)
  const loadPendingCount = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      const { countPendingSignalements } = await import(
        '@/infrastructure/offline/sync'
      );
      const count = await countPendingSignalements();
      setPendingCount(count);
    } catch {
      // Dexie non disponible
    }
  }, []);

  // Synchroniser les signalements en attente via l'API route (pas d'import Node.js)
  const syncPending = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (pendingCount === 0) return;
    setSyncStatus('syncing');
    try {
      const { syncPendingSignalements } = await import('@/infrastructure/offline/sync');
      await syncPendingSignalements();
      await loadPendingCount();
      setSyncStatus('done');
    } catch {
      setSyncStatus('idle');
    }
  }, [pendingCount, loadPendingCount]);

  useEffect(() => {
    loadPendingCount();
  }, [loadPendingCount]);

  // Synchroniser au retour du réseau
  useEffect(() => {
    const handleOnline = () => {
      syncPending();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncPending]);

  const handleEcouter = () => {
    // Placeholder : lecture audio en langue locale
    const msg = new SpeechSynthesisUtterance(
      'Bienvenue dans votre espace producteur. Appuyez sur Signaler pour signaler un ravageur.'
    );
    msg.lang = 'fr-FR';
    window.speechSynthesis?.speak(msg);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        {/* En-tête */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-bold text-green-800 flex-1">
            Espace Producteur
          </h1>
          <button
            onClick={() => router.push('/')}
            className="text-red-600 hover:text-red-700 font-medium text-sm"
            aria-label="Se déconnecter"
          >
            Déconnexion
          </button>
        </div>

        {/* Bannière statut synchronisation */}
        <Link
          href={pendingCount > 0 ? '/producteur/file-attente' : '#'}
          role="status"
          aria-live="polite"
          aria-label={pendingCount > 0 ? `${pendingCount} signalement(s) en attente — voir la file d'attente` : 'Tout synchronisé'}
          className={`mb-4 p-3 rounded-lg flex items-center gap-3 text-sm font-medium ${
            pendingCount > 0
              ? 'bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200 transition-colors'
              : 'bg-green-100 text-green-800 border border-green-300 pointer-events-none'
          }`}
        >
          {pendingCount > 0 ? (
            <>
              <Clock className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>En attente d&apos;envoi ({pendingCount})</span>
              {syncStatus === 'syncing' && (
                <span className="ml-auto text-xs">Synchronisation...</span>
              )}
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>Tout synchronisé</span>
            </>
          )}
        </Link>

        {/* Bouton Écouter */}
        <button
          onClick={handleEcouter}
          className="w-full flex items-center justify-center gap-2 mb-6 py-3 bg-white border-2 border-green-300 rounded-lg text-green-700 font-medium hover:bg-green-50 transition-colors"
          aria-label="Écouter les instructions de cette page"
        >
          <Volume2 className="w-5 h-5" aria-hidden="true" />
          <span>Écouter</span>
        </button>

        {/* Trois grandes actions */}
        <nav aria-label="Actions principales">
          <ul className="space-y-4 list-none p-0">
            {/* Signaler */}
            <li>
              <button
                onClick={() => router.push('/producteur/signaler')}
                className="relative w-full min-h-[72px] bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-2xl p-5 flex items-center gap-4 transition-colors focus:outline-none focus:ring-4 focus:ring-green-300"
                aria-label={
                  pendingCount > 0
                    ? `Signaler un ravageur — ${pendingCount} en attente d'envoi`
                    : 'Signaler un ravageur'
                }
              >
                <Camera className="w-10 h-10 shrink-0" aria-hidden="true" />
                <div className="text-left">
                  <div className="text-xl font-bold">Signaler</div>
                  <div className="text-sm opacity-90">Photo + voix</div>
                </div>
                {pendingCount > 0 && (
                  <span
                    className="absolute top-3 right-3 bg-orange-400 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    {pendingCount}
                  </span>
                )}
              </button>
            </li>

            {/* Alertes */}
            <li>
              <button
                onClick={() => router.push('/producteur/alertes')}
                className="w-full min-h-[72px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl p-5 flex items-center gap-4 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300"
                aria-label="Voir les alertes phytosanitaires"
              >
                <Bell className="w-10 h-10 shrink-0" aria-hidden="true" />
                <div className="text-left">
                  <div className="text-xl font-bold">Alertes</div>
                  <div className="text-sm opacity-90">Voir les alertes</div>
                </div>
              </button>
            </li>

            {/* Vendre */}
            <li>
              <button
                className="w-full min-h-[72px] bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-2xl p-5 flex items-center gap-4 transition-colors focus:outline-none focus:ring-4 focus:ring-purple-300"
                aria-label="Publier une annonce de vente"
              >
                <ShoppingCart className="w-10 h-10 shrink-0" aria-hidden="true" />
                <div className="text-left">
                  <div className="text-xl font-bold">Vendre</div>
                  <div className="text-sm opacity-90">Mes annonces</div>
                </div>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
