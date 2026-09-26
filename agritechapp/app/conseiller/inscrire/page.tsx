'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, AlertTriangle, MapPin, UserPlus } from 'lucide-react';

interface Commune { id: number; nom: string; departement: string; }

export default function InscrireProducteurPage() {
  const router = useRouter();

  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [code, setCode] = useState('');
  const [langue, setLangue] = useState<'bariba' | 'fon' | 'fr'>('bariba');
  const [aSmartphone, setASmartphone] = useState(true);
  const [communeId, setCommuneId] = useState('');
  const [communes, setCommunes] = useState<Commune[]>([]);

  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Charger les communes
  useEffect(() => {
    fetch('/api/communes')
      .then((r) => r.json())
      .then((d: { success: boolean; data: Commune[] }) => { if (d.success) setCommunes(d.data); })
      .catch(() => { /* communes non critiques pour la démo */ });
  }, []);

  const getGps = () => {
    setGpsLoading(true);
    if (!navigator.geolocation) { setCoords({ lat: 9.85, lng: 2.73 }); setGpsLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false); },
      () => { setCoords({ lat: 9.85, lng: 2.73 }); setGpsLoading(false); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Pavé numérique pour le code
  const handleKeypadPress = (num: string) => { if (code.length < 6) setCode((p) => p + num); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.length < 6) { setError('Le code doit contenir 6 chiffres.'); return; }
    if (!telephone.replace(/\D/g, '').length) { setError('Numéro de téléphone requis.'); return; }

    setSubmitting(true);
    try {
      const normalizedPhone = (() => {
        const digits = telephone.replace(/\D/g, '');
        return digits.length === 8 ? `01${digits}` : digits;
      })();

      const res = await fetch('/api/auth/register-producteur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: nom.trim(),
          telephone: normalizedPhone,
          code,
          langue,
          a_smartphone: aSmartphone,
          commune_id: communeId ? parseInt(communeId) : null,
          position: coords ? `POINT(${coords.lng} ${coords.lat})` : null,
          inscrit_par: 1, // TODO: session conseiller réelle
        }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (data.success) {
        setSuccess(`Le compte de ${nom.trim()} a été créé. Son numéro est ${telephone}, code : ${code}.`);
        // Réinitialiser
        setNom(''); setTelephone(''); setCode(''); setCoords(null);
      } else {
        setError(data.error ?? 'Erreur lors de la création du compte');
      }
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <h1 className="text-xl font-bold text-green-800 flex items-center gap-2">
          <UserPlus className="w-5 h-5" aria-hidden="true" />
          Inscrire un producteur
        </h1>
      </div>

      <div className="max-w-lg mx-auto p-4">
        {success ? (
          <div className="bg-white rounded-2xl shadow-md p-6 text-center" role="status">
            <CheckCircle className="w-14 h-14 text-green-600 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-xl font-bold text-green-800 mb-2">Inscription réussie</h2>
            <p className="text-gray-600 text-sm mb-6">{success}</p>
            <p className="text-orange-700 text-sm font-medium bg-orange-50 p-3 rounded-xl mb-4">
              Transmettez le code oralement au producteur. Il pourra le modifier par la suite.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSuccess(null)}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors"
              >
                Inscrire un autre
              </button>
              <button
                onClick={() => router.push('/conseiller')}
                className="flex-1 py-3 border-2 border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors"
              >
                Accueil
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Nom */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <label htmlFor="nom" className="block text-sm font-semibold text-gray-700 mb-2">Nom complet *</label>
              <input
                id="nom" type="text" value={nom} onChange={(e) => setNom(e.target.value)}
                placeholder="Ex : Bio Saliou"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent"
                required
              />
            </div>

            {/* Téléphone */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <label htmlFor="tel" className="block text-sm font-semibold text-gray-700 mb-1">Numéro de téléphone *</label>
              <p className="text-xs text-gray-400 mb-2">10 chiffres (ex : 01 97 00 00 00)</p>
              <input
                id="tel" type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)}
                placeholder="01 XX XX XX XX" inputMode="numeric"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xl tracking-widest text-center focus:ring-2 focus:ring-green-400"
                required
              />
            </div>

            {/* Code à 6 chiffres */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Code d&apos;accès à 6 chiffres *
              </label>
              <div
                className="w-full px-4 py-3 text-3xl tracking-[0.5em] text-center border-2 border-gray-200 rounded-xl bg-gray-50 font-mono mb-4 min-h-[64px]"
                role="status" aria-live="polite"
                aria-label={`Code : ${code.length} chiffre${code.length !== 1 ? 's' : ''} sur 6`}
              >
                {'●'.repeat(code.length)}{'○'.repeat(Math.max(0, 6 - code.length))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3,4,5,6,7,8,9].map((n) => (
                  <button key={n} type="button" onClick={() => handleKeypadPress(String(n))}
                    className="h-14 text-2xl font-bold bg-green-50 hover:bg-green-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
                    aria-label={`Chiffre ${n}`}>
                    {n}
                  </button>
                ))}
                <div />
                <button type="button" onClick={() => handleKeypadPress('0')}
                  className="h-14 text-2xl font-bold bg-green-50 hover:bg-green-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
                  aria-label="Chiffre 0">0</button>
                <button type="button" onClick={() => setCode((p) => p.slice(0, -1))}
                  className="h-14 text-xl bg-red-50 hover:bg-red-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                  aria-label="Supprimer">⌫</button>
              </div>
            </div>

            {/* Langue + type de téléphone */}
            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
              <div>
                <label htmlFor="langue" className="block text-sm font-semibold text-gray-700 mb-2">Langue *</label>
                <select id="langue" value={langue} onChange={(e) => setLangue(e.target.value as typeof langue)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-400">
                  <option value="bariba">Bariba</option>
                  <option value="fon">Fon</option>
                  <option value="fr">Français</option>
                </select>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Type de téléphone *</p>
                <div className="flex gap-3">
                  <button type="button"
                    onClick={() => setASmartphone(true)}
                    className={`flex-1 py-3 rounded-xl font-medium transition-colors border-2 focus:outline-none focus:ring-2 focus:ring-green-400 ${aSmartphone ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    aria-pressed={aSmartphone}
                  >
                    Smartphone
                  </button>
                  <button type="button"
                    onClick={() => setASmartphone(false)}
                    className={`flex-1 py-3 rounded-xl font-medium transition-colors border-2 focus:outline-none focus:ring-2 focus:ring-green-400 ${!aSmartphone ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    aria-pressed={!aSmartphone}
                  >
                    Téléphone basique
                  </button>
                </div>
              </div>
            </div>

            {/* Commune */}
            {communes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <label htmlFor="commune" className="block text-sm font-semibold text-gray-700 mb-2">Commune</label>
                <select id="commune" value={communeId} onChange={(e) => setCommuneId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-400">
                  <option value="">— Sélectionner —</option>
                  {communes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom} ({c.departement})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Position GPS */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">Position de la parcelle</p>
              {coords ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-sm text-green-800 mb-3">
                  <CheckCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="font-mono">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
                </div>
              ) : null}
              <button type="button" onClick={getGps} disabled={gpsLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50"
                aria-label="Obtenir la position GPS de la parcelle">
                <MapPin className="w-5 h-5" aria-hidden="true" />
                {gpsLoading ? 'Localisation…' : coords ? 'Actualiser la position' : 'Obtenir la position GPS'}
              </button>
            </div>

            {/* Erreur */}
            {error && (
              <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-800 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                {error}
              </div>
            )}

            <button
              type="submit" disabled={submitting || nom.trim().length < 2 || code.length < 6}
              className="w-full min-h-[60px] bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-lg transition-colors focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-40"
              aria-label="Créer le compte producteur"
            >
              {submitting ? 'Création…' : 'Créer le compte'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
