'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserCheck, CheckCircle, AlertTriangle } from 'lucide-react';

const LANGUES = [
  { value: 'fr', label: 'Français' },
  { value: 'fon', label: 'Fon' },
  { value: 'bariba', label: 'Bariba' },
];

export default function InscrireConseillerPage() {
  const router = useRouter();

  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [langue, setLangue] = useState('fr');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // TODO: récupérer depuis la session réelle
  const adminId = (() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('agri_current_user') : null;
      if (stored) return (JSON.parse(stored) as { id?: number }).id ?? 1;
    } catch { /* ignore */ }
    return 1;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/conseillers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          nom: nom.trim(),
          langue,
          inscrit_par: adminId,
        }),
      });
      const data = await res.json() as { success: boolean; error?: string; user?: { nom: string } };

      if (data.success) {
        setSuccess(`Invitation envoyée à ${email.trim()}. ${data.user?.nom ?? nom} recevra un e-mail pour définir son mot de passe.`);
        setNom(''); setEmail(''); setLangue('fr');
      } else {
        setError(data.error ?? 'Erreur inconnue');
      }
    } catch {
      setError('Impossible de créer le compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        {/* En-tête */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 flex-1 flex items-center gap-2">
            <UserCheck className="w-6 h-6" aria-hidden="true" />
            Inscrire un conseiller
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500 mb-6">
            Un e-mail d'invitation sera envoyé au conseiller pour qu'il définisse son propre mot de passe. Seul l'admin peut créer ces comptes.
          </p>

          {success && (
            <div
              className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 text-green-800 text-sm"
              role="status"
            >
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div
              className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm"
              role="alert"
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Nom */}
            <div>
              <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="nom"
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                placeholder="Ex : Serge Boco"
                autoComplete="name"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              />
            </div>

            {/* E-mail */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-mail professionnel <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="serge@atda.bj"
                autoComplete="email"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              />
            </div>

            {/* Langue */}
            <div>
              <label htmlFor="langue" className="block text-sm font-medium text-gray-700 mb-1">
                Langue principale
              </label>
              <select
                id="langue"
                value={langue}
                onChange={(e) => setLangue(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              >
                {LANGUES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !nom.trim() || !email.trim()}
              className="w-full min-h-[52px] bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-4 focus:ring-gray-400 disabled:opacity-40 mt-2"
            >
              <UserCheck className="w-4 h-4" aria-hidden="true" />
              {loading ? 'Envoi en cours…' : 'Envoyer l\'invitation'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
