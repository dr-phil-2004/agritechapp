'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface Contenu {
  id: number;
  type: string;
  titre: string;
  texte: string | null;
  pictogramme: string | null;
}

export default function ConseillerFichesPage() {
  const router = useRouter();
  const [contenus, setContenus] = useState<Contenu[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/contenus')
      .then((res) => res.json())
      .then((data: Contenu[]) => setContenus(data))
      .catch(() => setContenus([]))
      .finally(() => setLoading(false));
  }, []);

  const ravageurs = contenus.filter((c) => c.type === 'ravageur');
  const reglementation = contenus.filter((c) => c.type === 'reglementation');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.push('/conseiller')}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
              aria-label="Retour à l'espace conseiller"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <h1 className="text-2xl font-bold text-green-800 flex-1">
              Fiches de référence
            </h1>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-gray-100 rounded-xl animate-pulse"
                  aria-hidden="true"
                />
              ))}
              <p className="sr-only">Chargement des fiches…</p>
            </div>
          ) : contenus.length === 0 ? (
            <p className="text-gray-500 text-center py-10">
              Aucune fiche disponible pour l&apos;instant.
            </p>
          ) : (
            <div className="space-y-8">
              {/* Section Ravageurs */}
              {ravageurs.length > 0 && (
                <section aria-labelledby="section-ravageurs">
                  <h2
                    id="section-ravageurs"
                    className="text-lg font-semibold text-red-800 mb-3 flex items-center gap-2"
                  >
                    <span aria-hidden="true">🐛</span> Ravageurs
                  </h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ravageurs.map((fiche) => (
                      <li
                        key={fiche.id}
                        className="border border-red-100 rounded-xl p-4 bg-red-50 flex gap-4"
                      >
                        <span
                          className="text-4xl flex-shrink-0"
                          aria-hidden="true"
                        >
                          {fiche.pictogramme || '🌿'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 mb-1">
                            {fiche.titre}
                          </h3>
                          {fiche.texte ? (
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {fiche.texte}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400 italic">
                              Pas de description.
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Section Réglementation */}
              {reglementation.length > 0 && (
                <section aria-labelledby="section-reglementation">
                  <h2
                    id="section-reglementation"
                    className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2"
                  >
                    <span aria-hidden="true">📋</span> Réglementation
                  </h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reglementation.map((fiche) => (
                      <li
                        key={fiche.id}
                        className="border border-blue-100 rounded-xl p-4 bg-blue-50 flex gap-4"
                      >
                        <span
                          className="text-4xl flex-shrink-0"
                          aria-hidden="true"
                        >
                          {fiche.pictogramme || '📋'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 mb-1">
                            {fiche.titre}
                          </h3>
                          {fiche.texte ? (
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {fiche.texte}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400 italic">
                              Pas de description.
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
