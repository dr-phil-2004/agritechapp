'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react';

interface Contenu {
  id: number;
  type: string;
  titre: string;
  texte: string | null;
  pictogramme: string | null;
}

interface FormData {
  type: 'ravageur' | 'reglementation';
  titre: string;
  texte: string;
  pictogramme: string;
}

const TYPE_LABELS: Record<string, string> = {
  ravageur: 'Ravageur',
  reglementation: 'Réglementation',
};

const TYPE_COLORS: Record<string, string> = {
  ravageur: 'bg-red-100 text-red-800',
  reglementation: 'bg-blue-100 text-blue-800',
};

const defaultForm: FormData = {
  type: 'ravageur',
  titre: '',
  texte: '',
  pictogramme: '',
};

export default function AdminContenusPage() {
  const router = useRouter();
  const [contenus, setContenus] = useState<Contenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchContenus = () => {
    setLoading(true);
    fetch('/api/admin/contenus')
      .then((res) => res.json())
      .then((data: Contenu[]) => setContenus(data))
      .catch(() => setContenus([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchContenus();
  }, []);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.type) newErrors.type = 'Le type est obligatoire';
    if (form.titre.trim().length < 2)
      newErrors.titre = 'Le titre doit contenir au moins 2 caractères';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/contenus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          titre: form.titre.trim(),
          texte: form.texte.trim() || undefined,
          pictogramme: form.pictogramme.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setErrors({ titre: err?.error ?? 'Erreur lors de la création' });
        return;
      }

      setForm(defaultForm);
      setShowForm(false);
      setErrors({});
      fetchContenus();
    } catch {
      setErrors({ titre: 'Erreur réseau, veuillez réessayer' });
    } finally {
      setSaving(false);
    }
  };

  const closeForm = () => { setShowForm(false); setErrors({}); };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Supprimer cette fiche définitivement ?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/contenus/${id}`, { method: 'DELETE' });
      if (res.ok) setContenus((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const truncate = (text: string | null, max: number) => {
    if (!text) return '';
    return text.length > max ? text.slice(0, max) + '…' : text;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.push('/admin')}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label="Retour au tableau de bord"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800 flex-1">
              Gestion des contenus
            </h1>
            <button
              onClick={() => { setShowForm(true); setForm(defaultForm); setErrors({}); }}
              className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors focus:outline-none focus:ring-4 focus:ring-teal-300"
              aria-label="Créer une nouvelle fiche"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Nouvelle fiche
            </button>
          </div>

          {/* Inline form */}
          {showForm && (
            <div className="mb-6 border border-teal-200 rounded-lg p-5 bg-teal-50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-teal-800 text-lg">
                  Nouvelle fiche
                </h2>
                <button
                  onClick={closeForm}
                  className="p-1 rounded hover:bg-teal-100 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400"
                  aria-label="Fermer le formulaire"
                >
                  <X className="w-5 h-5 text-teal-700" aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Type */}
                  <div>
                    <label
                      htmlFor="contenu-type"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Type <span aria-hidden="true">*</span>
                    </label>
                    <select
                      id="contenu-type"
                      value={form.type}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          type: e.target.value as 'ravageur' | 'reglementation',
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                      aria-required="true"
                      aria-describedby={errors.type ? 'type-error' : undefined}
                    >
                      <option value="ravageur">Ravageur</option>
                      <option value="reglementation">Réglementation</option>
                    </select>
                    {errors.type && (
                      <p id="type-error" className="mt-1 text-sm text-red-600" role="alert">
                        {errors.type}
                      </p>
                    )}
                  </div>

                  {/* Pictogramme */}
                  <div>
                    <label
                      htmlFor="contenu-pictogramme"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Pictogramme (emoji, optionnel)
                    </label>
                    <input
                      id="contenu-pictogramme"
                      type="text"
                      value={form.pictogramme}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, pictogramme: e.target.value }))
                      }
                      placeholder="🌿"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>

                  {/* Titre */}
                  <div className="md:col-span-2">
                    <label
                      htmlFor="contenu-titre"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Titre <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id="contenu-titre"
                      type="text"
                      value={form.titre}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, titre: e.target.value }))
                      }
                      placeholder="Ex : Chenille légionnaire d'automne"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      aria-required="true"
                      aria-describedby={errors.titre ? 'titre-error' : undefined}
                    />
                    {errors.titre && (
                      <p id="titre-error" className="mt-1 text-sm text-red-600" role="alert">
                        {errors.titre}
                      </p>
                    )}
                  </div>

                  {/* Texte */}
                  <div className="md:col-span-2">
                    <label
                      htmlFor="contenu-texte"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Texte (description, conseil)
                    </label>
                    <textarea
                      id="contenu-texte"
                      value={form.texte}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, texte: e.target.value }))
                      }
                      rows={4}
                      placeholder="Description du ravageur ou de la réglementation…"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-y"
                    />
                  </div>
                </div>

                <div className="mt-4 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 transition-colors focus:outline-none focus:ring-4 focus:ring-teal-300"
                  >
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Liste */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-100 rounded-lg animate-pulse"
                  aria-hidden="true"
                />
              ))}
              <p className="sr-only">Chargement des fiches…</p>
            </div>
          ) : contenus.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Aucune fiche pour l&apos;instant. Cliquez sur &laquo; Nouvelle fiche &raquo; pour commencer.
            </p>
          ) : (
            <ul className="space-y-3" aria-label="Liste des fiches de contenu">
              {contenus.map((contenu) => (
                <li
                  key={contenu.id}
                  className="flex items-start gap-3 border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Pictogramme */}
                  <span
                    className="text-3xl flex-shrink-0 w-10 text-center"
                    aria-hidden="true"
                  >
                    {contenu.pictogramme || '📄'}
                  </span>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800">
                        {contenu.titre}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          TYPE_COLORS[contenu.type] ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {TYPE_LABELS[contenu.type] ?? contenu.type}
                      </span>
                    </div>
                    {contenu.texte && (
                      <p className="text-sm text-gray-600">
                        {truncate(contenu.texte, 80)}
                      </p>
                    )}
                  </div>

                  {/* Supprimer */}
                  <button
                    onClick={() => handleDelete(contenu.id)}
                    disabled={deletingId === contenu.id}
                    className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50"
                    aria-label={`Supprimer la fiche « ${contenu.titre} »`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
