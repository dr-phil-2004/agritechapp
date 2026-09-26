'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X } from 'lucide-react';

interface Annonce {
  id: number;
  produit: string;
  description: string | null;
  quantite: number;
  unite: string;
  prix: number;
  statut: string;
  nb_contacts: number;
  created_at: string;
}

export default function AcheteurAnnoncesPage() {
  const router = useRouter();
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ produit: '', description: '', quantite: '', unite: 'kg', prix: '' });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('agri_current_user') || '{}');
    if (!user?.id) { router.push('/'); return; }
    fetch(`/api/acheteur/annonces?acheteur_id=${user.id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setAnnonces(d.data); })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const user = JSON.parse(localStorage.getItem('agri_current_user') || '{}');
    const res = await fetch('/api/annonces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acheteur_id: user.id,
        produit: form.produit,
        description: form.description || undefined,
        quantite: Number(form.quantite),
        unite: form.unite,
        prix: Number(form.prix),
      }),
    });
    const data = await res.json();
    if (data.success) {
      setAnnonces(prev => [{ ...data.data, nb_contacts: 0 }, ...prev]);
      setShowForm(false);
      setForm({ produit: '', description: '', quantite: '', unite: 'kg', prix: '' });
    } else {
      setError('Erreur lors de la publication');
    }
    setSaving(false);
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
            <h1 className="text-xl font-bold text-purple-800 flex-1">Mes annonces d&apos;achat</h1>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm font-medium"
            >
              <Plus className="w-4 h-4" aria-hidden="true" /> Nouvelle
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-purple-800">Nouvelle demande d&apos;achat</h2>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="p-1 hover:bg-purple-100 rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                  aria-label="Fermer le formulaire"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              {error && <p className="text-red-600 text-sm mb-3" role="alert">{error}</p>}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="produit">Produit *</label>
                  <input
                    id="produit"
                    value={form.produit}
                    onChange={e => setForm(f => ({ ...f, produit: e.target.value }))}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
                    placeholder="ex: Maïs, Soja…"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
                    rows={2}
                    placeholder="Qualité, conditionnement…"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="quantite">Quantité *</label>
                    <input
                      id="quantite"
                      type="number"
                      min="1"
                      value={form.quantite}
                      onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))}
                      required
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="unite">Unité</label>
                    <select
                      id="unite"
                      value={form.unite}
                      onChange={e => setForm(f => ({ ...f, unite: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
                    >
                      <option value="kg">kg</option>
                      <option value="litre">litre</option>
                      <option value="sac">sac</option>
                      <option value="tonne">tonne</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="prix">Prix / unité (FCFA) *</label>
                    <input
                      id="prix"
                      type="number"
                      min="1"
                      value={form.prix}
                      onChange={e => setForm(f => ({ ...f, prix: e.target.value }))}
                      required
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {saving ? 'Publication…' : "Publier l'annonce"}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <p className="text-gray-500 text-center py-8">Chargement…</p>
          ) : annonces.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-4xl mb-2" aria-hidden="true">📋</p>
              <p>Aucune annonce publiée.</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-purple-600 underline focus:outline-none focus:ring-2 focus:ring-purple-400 rounded"
              >
                Publier votre première demande
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {annonces.map(a => (
                <li key={a.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{a.produit}</div>
                      {a.description && <div className="text-sm text-gray-600 mt-0.5">{a.description}</div>}
                      <div className="text-sm text-gray-700 mt-1">
                        {a.quantite} {a.unite} · {a.prix.toLocaleString('fr-FR')} FCFA/{a.unite}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${a.statut === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {a.statut}
                      </span>
                      {Number(a.nb_contacts) > 0 && (
                        <div className="mt-1 text-xs text-purple-600 font-medium">
                          {a.nb_contacts} contact{Number(a.nb_contacts) > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
