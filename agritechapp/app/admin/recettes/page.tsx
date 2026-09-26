'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface Vente {
  id: number;
  numero_recu: string;
  montant: number;
  redevance: number;
  created_at: string;
  produit: string;
  acheteur_nom: string;
}

interface RecettesData {
  total_montant: number;
  total_redevance: number;
  ventes: Vente[];
}

export default function AdminRecettesPage() {
  const router = useRouter();
  const [data, setData] = useState<RecettesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/admin/recettes')
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d.data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800 flex-1">Recettes de l&apos;État</h1>
          </div>

          {loading ? (
            <p className="text-gray-500 text-center py-8">Chargement…</p>
          ) : error || !data ? (
            <p className="text-red-500 text-center py-8" role="alert">Erreur de chargement des données.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-800">
                    {data.total_montant.toLocaleString('fr-FR')} FCFA
                  </div>
                  <div className="text-sm text-green-600">Volume total des ventes</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-800">
                    {data.total_redevance.toLocaleString('fr-FR')} FCFA
                  </div>
                  <div className="text-sm text-blue-600">Redevances collectées (1 %)</div>
                </div>
              </div>

              {data.ventes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucune vente déclarée.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-3 py-2 font-medium text-gray-700 border-b">Reçu</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-700 border-b">Produit</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-700 border-b">Acheteur</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-700 border-b">Montant</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-700 border-b">Redevance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.ventes.map(v => (
                        <tr key={v.id} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs text-gray-500">{v.numero_recu}</td>
                          <td className="px-3 py-2">{v.produit}</td>
                          <td className="px-3 py-2 text-gray-600">{v.acheteur_nom}</td>
                          <td className="px-3 py-2 text-right">{v.montant.toLocaleString('fr-FR')} F</td>
                          <td className="px-3 py-2 text-right text-blue-600">{v.redevance.toLocaleString('fr-FR')} F</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={3} className="px-3 py-2 text-right text-gray-700">Total</td>
                        <td className="px-3 py-2 text-right">{data.total_montant.toLocaleString('fr-FR')} F</td>
                        <td className="px-3 py-2 text-right text-blue-700">{data.total_redevance.toLocaleString('fr-FR')} F</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
