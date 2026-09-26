'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserCheck } from 'lucide-react';

interface AdminStats {
  signalements_en_cours: number;
  alertes_envoyees: number;
  producteurs_prevenus: number;
  delai_moyen_min: number | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data: AdminStats) => {
        setStats(data);
      })
      .catch(() => {
        // Silencieux en cas d'erreur, on garde les valeurs à 0
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const StatValue = ({ value, unit }: { value: number | null; unit?: string }) => {
    if (loading) {
      return (
        <div
          className="h-9 w-16 bg-current opacity-20 rounded animate-pulse"
          aria-label="Chargement…"
        />
      );
    }
    const display = value === null ? '—' : String(value);
    return (
      <span>
        {display}
        {unit && value !== null ? ` ${unit}` : ''}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800 flex-1">
              Espace Admin
            </h1>
            <button
              onClick={() => router.push('/')}
              className="text-red-600 hover:text-red-700"
            >
              Déconnexion
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Tableau de bord de la direction départementale.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-3xl font-bold text-green-800">
                <StatValue value={stats?.signalements_en_cours ?? null} />
              </div>
              <div className="text-sm text-green-600">Signalements en cours</div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-3xl font-bold text-blue-800">
                <StatValue value={stats?.alertes_envoyees ?? null} />
              </div>
              <div className="text-sm text-blue-600">Alertes envoyées</div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-3xl font-bold text-purple-800">
                <StatValue value={stats?.producteurs_prevenus ?? null} />
              </div>
              <div className="text-sm text-purple-600">Producteurs prévenus</div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-3xl font-bold text-orange-800">
                <StatValue
                  value={stats?.delai_moyen_min ?? null}
                  unit="min"
                />
              </div>
              <div className="text-sm text-orange-600">Délai moyen alerte</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="bg-gray-600 text-white p-4 rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400">
              <div className="font-semibold">Gestion des contenus</div>
              <div className="text-sm opacity-90">Fiches ravageurs, réglementaires</div>
            </button>

            <button
              onClick={() => router.push('/admin/recettes')}
              className="bg-gray-600 text-white p-4 rounded-lg hover:bg-gray-700 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <div className="font-semibold">Recettes de l&apos;État</div>
              <div className="text-sm opacity-90">Ventes déclarées et redevances</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
