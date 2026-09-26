'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface AlerteItem {
  alerte_id: number;
  alerte_created_at: string | null;
  rayon_km: number;
  signalement_id: number;
  signalement_statut: string;
  gravite: string | null;
  photo_url: string | null;
  ravageur_nom: string | null;
  ravageur_pictogramme: string | null;
  recommandation: string | null;
  audio_url: string | null;
  audio_langue: string | null;
  envoi_canal: string;
  envoi_statut: string;
  envoi_sent_at: string | null;
}

function GraviteBadge({ gravite }: { gravite: string | null }) {
  if (!gravite) return null;
  const config = {
    forte: { label: 'Forte', bg: 'bg-red-100', text: 'text-red-700', icon: '🔴' },
    moyenne: { label: 'Moyenne', bg: 'bg-orange-100', text: 'text-orange-700', icon: '🟠' },
    faible: { label: 'Faible', bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '🟡' },
  }[gravite] ?? { label: gravite, bg: 'bg-gray-100', text: 'text-gray-700', icon: '⚪' };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  );
}

function StatutIcon({ statut }: { statut: string }) {
  if (statut === 'traite' || statut === 'clos')
    return <CheckCircle className="w-5 h-5 text-green-500" aria-label="Traité" />;
  if (statut === 'confirme')
    return <AlertTriangle className="w-5 h-5 text-orange-500" aria-label="Confirmé" />;
  return <Clock className="w-5 h-5 text-gray-400" aria-label="En cours" />;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AlertesProducteurPage() {
  const router = useRouter();
  const [alertesList, setAlertesList] = useState<AlerteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const producteurId = (() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('agri_current_user') : null;
      if (stored) return (JSON.parse(stored) as { id?: number }).id ?? 1;
    } catch { /* ignore */ }
    return 1;
  })();

  const chargerAlertes = (showLoader = false) => {
    if (showLoader) setLoading(true);
    fetch(`/api/alertes/producteur?producteur_id=${producteurId}`)
      .then((r) => r.json())
      .then((json: { success: boolean; data?: AlerteItem[]; error?: string }) => {
        if (json.success) {
          setAlertesList((json.data ?? []).reverse());
          setError(null);
        } else {
          setError(json.error ?? 'Erreur inconnue');
        }
      })
      .catch(() => setError('Impossible de charger les alertes'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    chargerAlertes(true);

    // Écouter les nouvelles alertes déclenchées par le layout
    const handleNouvelleAlerte = () => chargerAlertes(false);
    window.addEventListener('nouvelle-alerte', handleNouvelleAlerte);
    return () => window.removeEventListener('nouvelle-alerte', handleNouvelleAlerte);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        {/* En-tête */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-bold text-blue-800 flex-1 flex items-center gap-2">
            <Bell className="w-6 h-6" aria-hidden="true" />
            Alertes
          </h1>
        </div>

        {loading && (
          <div className="text-center py-12 text-gray-500" role="status" aria-live="polite">
            Chargement…
          </div>
        )}

        {error && (
          <div
            className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3"
            role="alert"
          >
            <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && alertesList.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" aria-hidden="true" />
            <p className="text-lg font-medium">Aucune alerte pour le moment</p>
            <p className="text-sm mt-1">Vous serez notifié dès qu'un ravageur est détecté dans votre zone.</p>
          </div>
        )}

        {!loading && alertesList.length > 0 && (
          <ul className="space-y-3 list-none p-0" aria-label="Liste des alertes phytosanitaires">
            {alertesList.map((a) => (
              <li
                key={a.alerte_id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Bandeau de gravité */}
                {a.gravite === 'forte' && (
                  <div className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-2" role="status">
                    <span aria-hidden="true">⚠️</span> ALERTE FORTE — Agissez rapidement
                  </div>
                )}
                {a.gravite === 'moyenne' && (
                  <div className="bg-orange-500 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-2" role="status">
                    <span aria-hidden="true">⚠️</span> ALERTE MOYENNE
                  </div>
                )}

                <div className="p-4">
                  {/* Ravageur + statut */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      {a.ravageur_pictogramme && (
                        <span className="text-2xl" aria-hidden="true">{a.ravageur_pictogramme}</span>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 text-base leading-tight">
                          {a.ravageur_nom ?? 'Ravageur non identifié'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Rayon concerné : {a.rayon_km} km
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatutIcon statut={a.signalement_statut} />
                      <GraviteBadge gravite={a.gravite} />
                    </div>
                  </div>

                  {/* Photo si disponible */}
                  {a.photo_url && (
                    <img
                      src={a.photo_url}
                      alt="Photo du signalement"
                      className="w-full h-36 object-cover rounded-xl mb-3"
                    />
                  )}

                  {/* Note vocale du conseiller */}
                  {a.audio_url && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-3">
                      <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-2">
                        <span aria-hidden="true">🔊</span>
                        Message vocal du conseiller
                        {a.audio_langue && a.audio_langue !== 'fr' && (
                          <span className="ml-1 px-1.5 py-0.5 bg-amber-200 rounded text-amber-900 uppercase tracking-wide">
                            {a.audio_langue}
                          </span>
                        )}
                      </p>
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <audio
                        src={a.audio_url}
                        controls
                        className="w-full h-10"
                        aria-label={`Message vocal du conseiller${a.audio_langue ? ` en ${a.audio_langue}` : ''}`}
                      />
                    </div>
                  )}

                  {/* Recommandation écrite du conseiller */}
                  {a.recommandation && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 mb-3">
                      <p className="font-semibold mb-1">Recommandation du conseiller :</p>
                      <p>{a.recommandation}</p>
                    </div>
                  )}

                  {/* Date + canal */}
                  <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-50 pt-3 mt-1">
                    <time dateTime={a.alerte_created_at ?? ''}>
                      {formatDate(a.alerte_created_at)}
                    </time>
                    <span className="capitalize">
                      {a.envoi_canal === 'sms' ? '📱 SMS' : a.envoi_canal === 'appel' ? '📞 Appel vocal' : a.envoi_canal}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
