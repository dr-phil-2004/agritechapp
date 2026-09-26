'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle } from 'lucide-react';

interface Commande {
  id: number;
  montant: number;
  statut: string;
  created_at: string;
  livraison_confirme_at: string | null;
  produit: string;
  producteur_nom: string;
}

const statutLabel: Record<string, string> = {
  en_attente_paiement: 'En attente de paiement',
  paiement_bloque: 'Paiement bloqué — en attente de livraison',
  livraison_confirmee: 'Livraison confirmée',
  termine: 'Terminé',
};

const statutColor: Record<string, string> = {
  en_attente_paiement: 'bg-yellow-100 text-yellow-700',
  paiement_bloque: 'bg-blue-100 text-blue-700',
  livraison_confirmee: 'bg-green-100 text-green-700',
  termine: 'bg-gray-100 text-gray-600',
};

export default function AcheteurCommandesPage() {
  const router = useRouter();
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<number | null>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('agri_current_user') || '{}');
    if (!user?.id) { router.push('/'); return; }
    fetch(`/api/acheteur/commandes?acheteur_id=${user.id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setCommandes(d.data); })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleConfirmLivraison(id: number) {
    setConfirming(id);
    const res = await fetch(`/api/commandes/${id}/livraison`, { method: 'PATCH' });
    if (res.ok) {
      setCommandes(prev => prev.map(c => c.id === id ? { ...c, statut: 'termine' } : c));
    }
    setConfirming(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <h1 className="text-xl font-bold text-purple-800 flex-1">Mes commandes</h1>
          </div>

          {loading ? (
            <p className="text-gray-500 text-center py-8">Chargement…</p>
          ) : commandes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-4xl mb-2" aria-hidden="true">🛒</p>
              <p>Aucune commande pour l&apos;instant.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {commandes.map(c => (
                <li key={c.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-semibold text-gray-800">{c.produit}</div>
                      <div className="text-sm text-gray-600">Producteur : {c.producteur_nom}</div>
                      <div className="text-sm font-medium text-gray-700 mt-1">
                        {c.montant.toLocaleString('fr-FR')} FCFA
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Redevance État : {Math.round(c.montant * 0.01).toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statutColor[c.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                      {statutLabel[c.statut] ?? c.statut}
                    </span>
                  </div>
                  {c.statut === 'paiement_bloque' && (
                    <button
                      onClick={() => handleConfirmLivraison(c.id)}
                      disabled={confirming === c.id}
                      className="mt-2 flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm font-medium"
                    >
                      <CheckCircle className="w-4 h-4" aria-hidden="true" />
                      {confirming === c.id ? 'Confirmation…' : 'Confirmer la livraison'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
