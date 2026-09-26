'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, MessageCircle } from 'lucide-react';

interface Annonce {
  id: number;
  produit: string;
  description: string | null;
  quantite: number;
  unite: string;
  prix: number;
  statut: string;
  acheteur_nom: string;
  acheteur_telephone: string;
}

interface Vente {
  id: number;
  montant: number;
  redevance: number;
  numero_recu: string;
  created_at: string;
  produit: string;
  quantite: number;
  unite: string;
  acheteur_nom: string;
  acheteur_telephone: string;
}

export default function ProducteurVendrePage() {
  const router = useRouter();
  const [tab, setTab] = useState<'annonces' | 'ventes'>('annonces');
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState<number | null>(null);
  const [messages, setMessages] = useState<Record<number, string>>({});
  const [quantites, setQuantites] = useState<Record<number, string>>({});
  const [contacted, setContacted] = useState<Set<number>>(new Set());

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('agri_current_user') || '{}');
    if (!user?.id) { router.push('/'); return; }
    Promise.all([
      fetch('/api/annonces').then(r => r.json()),
      fetch(`/api/producteur/ventes?producteur_id=${user.id}`).then(r => r.json()),
    ]).then(([a, v]) => {
      if (a.success) setAnnonces(a.data);
      if (v.success) setVentes(v.data);
    }).finally(() => setLoading(false));
  }, [router]);

  async function handleContact(annonceId: number) {
    const user = JSON.parse(localStorage.getItem('agri_current_user') || '{}');
    setContacting(annonceId);
    const res = await fetch('/api/contacts-annonce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        annonce_id: annonceId,
        producteur_id: user.id,
        message: messages[annonceId] || undefined,
        quantite_proposee: quantites[annonceId] ? Number(quantites[annonceId]) : undefined,
      }),
    });
    if (res.ok) setContacted(prev => new Set([...prev, annonceId]));
    setContacting(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <h1 className="text-xl font-bold text-green-800 flex-1">Vendre mes produits</h1>
          </div>

          <div className="flex gap-2 mb-6" role="tablist" aria-label="Sections">
            <button
              role="tab"
              aria-selected={tab === 'annonces'}
              onClick={() => setTab('annonces')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-400 ${
                tab === 'annonces' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Annonces d&apos;achat
            </button>
            <button
              role="tab"
              aria-selected={tab === 'ventes'}
              onClick={() => setTab('ventes')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-400 ${
                tab === 'ventes' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Mes ventes ({ventes.length})
            </button>
          </div>

          {loading ? (
            <p className="text-gray-500 text-center py-8">Chargement…</p>
          ) : tab === 'annonces' ? (
            annonces.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-4xl mb-2" aria-hidden="true">📋</p>
                <p>Aucune annonce d&apos;achat pour l&apos;instant.</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {annonces.map(a => (
                  <li key={a.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="font-semibold text-gray-800">{a.produit}</div>
                        {a.description && <div className="text-sm text-gray-600">{a.description}</div>}
                        <div className="text-sm font-medium text-green-700 mt-1">
                          {a.quantite} {a.unite} · {a.prix.toLocaleString('fr-FR')} FCFA/{a.unite}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">Acheteur : {a.acheteur_nom}</div>
                      </div>
                      <a
                        href={`tel:${a.acheteur_telephone}`}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                        aria-label={`Appeler ${a.acheteur_nom}`}
                      >
                        <Phone className="w-4 h-4" aria-hidden="true" />
                      </a>
                    </div>
                    {contacted.has(a.id) ? (
                      <div className="mt-2 flex items-center gap-1 text-green-600 text-sm font-medium">
                        <MessageCircle className="w-4 h-4" aria-hidden="true" /> Demande envoyée
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            value={quantites[a.id] || ''}
                            onChange={e => setQuantites(prev => ({ ...prev, [a.id]: e.target.value }))}
                            className="border rounded px-2 py-1 text-sm w-28 focus:ring-2 focus:ring-green-400 focus:outline-none"
                            placeholder={`Qté (${a.unite})`}
                            aria-label={`Quantité proposée en ${a.unite}`}
                          />
                          <input
                            type="text"
                            value={messages[a.id] || ''}
                            onChange={e => setMessages(prev => ({ ...prev, [a.id]: e.target.value }))}
                            className="border rounded px-2 py-1 text-sm flex-1 focus:ring-2 focus:ring-green-400 focus:outline-none"
                            placeholder="Message (optionnel)"
                            aria-label="Message pour l'acheteur"
                          />
                        </div>
                        <button
                          onClick={() => handleContact(a.id)}
                          disabled={contacting === a.id}
                          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-400"
                        >
                          {contacting === a.id ? 'Envoi…' : "Contacter l'acheteur"}
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )
          ) : (
            ventes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-4xl mb-2" aria-hidden="true">💰</p>
                <p>Aucune vente enregistrée.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {ventes.map(v => (
                  <li key={v.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-gray-800">{v.produit}</div>
                        <div className="text-sm text-gray-600">
                          Acheteur : {v.acheteur_nom} · {v.acheteur_telephone}
                        </div>
                        <div className="text-sm font-medium text-green-700 mt-1">
                          {v.montant.toLocaleString('fr-FR')} FCFA
                        </div>
                        <div className="text-xs text-gray-400">
                          Redevance État : {v.redevance.toLocaleString('fr-FR')} FCFA · Reçu : {v.numero_recu}
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Vendu
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </div>
    </div>
  );
}
