'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  List,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Volume2,
  CheckCircle,
  X,
  Send,
  Mic,
  Square,
  Trash2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SignalementRecord {
  id: number;
  producteur_id: number;
  position: string;
  photo_url: string | null;
  audio_url: string | null;
  canal_origine: string;
  statut: string;
  ravageur_id: number | null;
  gravite: string | null;
  conseiller_id: number | null;
  created_at: string | null;
}

interface Ravageur { id: number; nom: string; }

function getGraviteColor(g: string | null): string {
  if (g === 'forte') return '#dc2626';
  if (g === 'moyenne') return '#ea580c';
  if (g === 'faible') return '#ca8a04';
  return '#6b7280';
}
function getGraviteLabel(g: string | null): string {
  return g === 'forte' ? 'Forte' : g === 'moyenne' ? 'Moyenne' : g === 'faible' ? 'Faible' : 'Non qualifié';
}
function parsePosition(pos: string): [number, number] | null {
  // WKT format: "POINT(lng lat)"
  const wkt = pos.match(/^POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)$/i);
  if (wkt) return [parseFloat(wkt[2]), parseFloat(wkt[1])]; // [lat, lng] for Leaflet
  // Fallback: GeoJSON format (legacy data)
  try {
    const geo = JSON.parse(pos) as { type: string; coordinates: [number, number] };
    if (geo.type === 'Point') return [geo.coordinates[1], geo.coordinates[0]];
  } catch { /* ignore */ }
  return null;
}
function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

// ─── Carte Leaflet (plein écran) ─────────────────────────────────────────────

function LeafletMap({
  signalements,
  onSelect,
}: {
  signalements: SignalementRecord[];
  onSelect: (sig: SignalementRecord) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;
    let isMounted = true;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      if (!isMounted || !mapRef.current) return;

      // Fix icônes Leaflet/Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      mapInstanceRef.current?.remove();
      const map = L.map(mapRef.current, { zoomControl: false }).setView([9.85, 2.73], 10);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;

      signalements.forEach((sig) => {
        const pos = parsePosition(sig.position);
        if (!pos) return;
        const color = getGraviteColor(sig.gravite);
        const circle = L.circleMarker(pos, {
          radius: 14, fillColor: color, color: '#fff', weight: 3, opacity: 1, fillOpacity: 0.9,
        }).addTo(map);
        circle.on('click', () => onSelect(sig));
        circle.bindTooltip(`Signalement #${sig.id} — ${getGraviteLabel(sig.gravite)}`, { permanent: false });
      });
    };

    initMap();
    return () => {
      isMounted = false;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  // onSelect est stable car mémoïsé (useCallback dans le parent)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalements]);

  return (
    <div
      ref={mapRef}
      className="absolute inset-0"
      role="img"
      aria-label="Carte des signalements phytosanitaires — cliquez sur un point pour voir les détails"
    />
  );
}

// ─── Panneau de qualification (slide-up) ─────────────────────────────────────

function QualificationPanel({
  sig,
  ravageurs,
  onClose,
  onSuccess,
}: {
  sig: SignalementRecord;
  ravageurs: Ravageur[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [ravageurId, setRavageurId] = useState<string>(sig.ravageur_id ? String(sig.ravageur_id) : '');
  const [gravite, setGravite] = useState<string>(sig.gravite ?? '');
  const [recommandation, setRecommandation] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertResult, setAlertResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Note vocale du conseiller ────────────────────────────────────────────────
  const [audioLangue, setAudioLangue] = useState<'fr' | 'fon' | 'bariba'>('fr');
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioBlobUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = mr;
      mr.start(200);
      setRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      setError('Impossible d\'accéder au microphone');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  };

  const deleteRecording = () => {
    if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    setAudioBlob(null);
    setAudioBlobUrl(null);
    setRecordingSeconds(0);
  };

  const handleConfirmer = async () => {
    setLoading(true); setError(null);
    try {
      // 1. Confirmer le signalement (ignoré si déjà confirme)
      if (sig.statut === 'signale') {
        const patchRes = await fetch(`/api/signalements/${sig.id}/statut`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            statut: 'confirme',
            gravite: gravite || undefined,
            ravageur_id: ravageurId ? parseInt(ravageurId) : undefined,
            conseiller_id: 1, // TODO: session réelle
          }),
        });
        if (!patchRes.ok) throw new Error('Erreur lors de la confirmation');
      }

      // 2. Uploader la note vocale si présente
      let uploadedAudioUrl: string | undefined;
      if (audioBlob) {
        const fd = new FormData();
        fd.append('audio', audioBlob, `note-${Date.now()}.webm`);
        fd.append('langue', audioLangue);
        const uploadRes = await fetch('/api/upload/audio-conseil', { method: 'POST', body: fd });
        const uploadData = await uploadRes.json() as { success: boolean; url?: string };
        if (uploadData.success && uploadData.url) {
          uploadedAudioUrl = uploadData.url;
        }
      }

      // 3. Déclencher l'alerte de zone
      const alertRes = await fetch('/api/alertes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signalement_id: sig.id,
          conseiller_id: 1,
          recommandation: recommandation || undefined,
          audio_url: uploadedAudioUrl,
          audio_langue: uploadedAudioUrl ? audioLangue : undefined,
        }),
      });
      const alertData = await alertRes.json() as { success: boolean; producers_notified?: number };
      if (alertData.success) {
        setAlertResult(`Alerte envoyée à ${alertData.producers_notified ?? 0} producteur(s) dans un rayon de 10 km.`);
        setTimeout(() => { onSuccess(); }, 2500);
      } else {
        throw new Error('Erreur lors du déclenchement de l\'alerte');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const handleRejeter = async () => {
    if (!window.confirm('Rejeter ce signalement ?')) return;
    setLoading(true);
    try {
      await fetch(`/api/signalements/${sig.id}/statut`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'rejete', conseiller_id: 1 }),
      });
      onSuccess();
    } catch { setError('Erreur lors du rejet'); }
    finally { setLoading(false); }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-20 max-h-[80vh] overflow-y-auto"
      role="dialog"
      aria-label={`Détails du signalement ${sig.id}`}
      aria-modal="true"
    >
      {/* Poignée */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800">Signalement #{sig.id}</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Fermer le panneau">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Infos */}
        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
          <span>Producteur #{sig.producteur_id}</span>
          <span>·</span>
          <span>{formatDate(sig.created_at)}</span>
          <span>·</span>
          <span
            className="px-2 py-0.5 rounded-full text-white text-xs font-semibold"
            style={{ backgroundColor: getGraviteColor(sig.gravite) }}
          >
            {getGraviteLabel(sig.gravite)}
          </span>
        </div>

        {/* Photo */}
        {sig.photo_url && (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sig.photo_url}
              alt={`Photo du signalement ${sig.id}`}
              className="w-full max-h-48 object-cover rounded-xl border border-gray-200"
            />
          </div>
        )}

        {/* Note vocale */}
        {sig.audio_url && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
            <p className="flex items-center gap-2 text-green-800 font-medium text-sm mb-2">
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              Note vocale du producteur
            </p>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio
              ref={audioRef}
              src={sig.audio_url}
              controls
              className="w-full h-10"
              aria-label="Note vocale enregistrée par le producteur"
            />
          </div>
        )}

        {/* Déjà alerté ? */}
        {alertResult && (
          <div role="status" className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-800 text-sm">
            <CheckCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            {alertResult}
          </div>
        )}

        {error && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-800 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        {/* Formulaire de qualification — uniquement si statut signale */}
        {sig.statut === 'signale' && !alertResult && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-gray-700 mb-2">Qualification</legend>

            <div>
              <label htmlFor="ravageur-select" className="block text-xs text-gray-500 mb-1">Ravageur identifié</label>
              <select
                id="ravageur-select"
                value={ravageurId}
                onChange={(e) => setRavageurId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
              >
                <option value="">— Sélectionner —</option>
                {ravageurs.map((r) => (
                  <option key={r.id} value={r.id}>{r.nom}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="gravite-select" className="block text-xs text-gray-500 mb-1">Gravité</label>
              <select
                id="gravite-select"
                value={gravite}
                onChange={(e) => setGravite(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
              >
                <option value="">— Sélectionner —</option>
                <option value="faible">Faible</option>
                <option value="moyenne">Moyenne</option>
                <option value="forte">Forte</option>
              </select>
            </div>

            <div>
              <label htmlFor="recommandation" className="block text-xs text-gray-500 mb-1">Recommandation écrite (optionnel)</label>
              <textarea
                id="recommandation"
                value={recommandation}
                onChange={(e) => setRecommandation(e.target.value)}
                placeholder="Ex : Inspecter les feuilles, contacter votre conseiller…"
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                maxLength={500}
              />
            </div>

            {/* ── Note vocale du conseiller ── */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                Note vocale pour les producteurs (optionnel)
              </p>

              {/* Sélecteur de langue */}
              <div>
                <label htmlFor="audio-langue" className="block text-xs text-gray-500 mb-1">Langue de l'enregistrement</label>
                <select
                  id="audio-langue"
                  value={audioLangue}
                  onChange={(e) => setAudioLangue(e.target.value as 'fr' | 'fon' | 'bariba')}
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                >
                  <option value="fr">Français</option>
                  <option value="fon">Fon</option>
                  <option value="bariba">Bariba</option>
                </select>
              </div>

              {/* Boutons enregistrement */}
              {!audioBlobUrl ? (
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  className={`w-full min-h-[44px] rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    recording
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                  aria-label={recording ? 'Arrêter l\'enregistrement' : 'Démarrer l\'enregistrement vocal'}
                >
                  {recording ? (
                    <>
                      <Square className="w-4 h-4" aria-hidden="true" />
                      Arrêter ({recordingSeconds}s)
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" aria-hidden="true" />
                      Enregistrer un message vocal
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-2">
                  {/* Prévisualisation */}
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio
                    src={audioBlobUrl}
                    controls
                    className="w-full h-10"
                    aria-label={`Note vocale enregistrée en ${audioLangue}`}
                  />
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />
                      Enregistré ({recordingSeconds}s) · {audioLangue}
                    </span>
                    <button
                      type="button"
                      onClick={deleteRecording}
                      className="flex items-center gap-1 text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 rounded px-1"
                      aria-label="Supprimer l'enregistrement"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleConfirmer}
                disabled={loading || !gravite}
                className="flex-1 min-h-[52px] bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-40"
                aria-label="Confirmer le signalement et alerter les producteurs de la zone"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                {loading ? 'Envoi…' : 'Confirmer et alerter la zone'}
              </button>
              <button
                onClick={handleRejeter}
                disabled={loading}
                className="px-4 min-h-[52px] bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-40"
                aria-label="Rejeter ce signalement"
              >
                Rejeter
              </button>
            </div>
          </fieldset>
        )}

        {sig.statut === 'confirme' && !alertResult && (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 rounded-xl text-sm text-green-700 text-center">
              Statut : <strong>confirmé</strong>
            </div>
            <button
              onClick={handleConfirmer}
              disabled={loading}
              className="w-full min-h-[52px] bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-40"
              aria-label="Alerter les producteurs de la zone"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              {loading ? 'Envoi…' : 'Alerter la zone'}
            </button>
          </div>
        )}

        {sig.statut !== 'signale' && sig.statut !== 'confirme' && (
          <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-500 text-center">
            Statut : <strong>{sig.statut}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function CartePage() {
  const router = useRouter();
  const [signalements, setSignalements] = useState<SignalementRecord[]>([]);
  const [ravageurs, setRavageurs] = useState<Ravageur[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'carte' | 'liste'>('carte');
  const [selected, setSelected] = useState<SignalementRecord | null>(null);

  const fetchSignalements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/signalements');
      const json = await res.json() as { success: boolean; data: SignalementRecord[] };
      if (json.success) setSignalements(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignalements();
    fetch('/api/ravageurs')
      .then((r) => r.json())
      .then((d: { success: boolean; data: Ravageur[] }) => { if (d.success) setRavageurs(d.data); })
      .catch(() => {/* ravageurs non critiques */});
  }, [fetchSignalements]);

  // Realtime Supabase
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let sub: { unsubscribe: () => void } | null = null;
    import('@/infrastructure/supabase/client').then(({ supabase }) => {
      sub = supabase
        .channel('carte-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'signalements' }, () => {
          fetchSignalements();
        })
        .subscribe();
    }).catch(() => {});
    return () => { sub?.unsubscribe(); };
  }, [fetchSignalements]);

  const handleSelect = useCallback((sig: SignalementRecord) => {
    setSelected(sig);
  }, []);

  const handlePanelClose = () => setSelected(null);
  const handlePanelSuccess = () => { setSelected(null); fetchSignalements(); };

  return (
    <div className="fixed inset-0 bg-gray-200" aria-label="Page carte des signalements">

      {/* ── Carte plein écran ── */}
      {activeView === 'carte' && (
        <div className="absolute inset-0 z-0">
          {loading ? (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" aria-hidden="true" />
                <p className="text-gray-500">Chargement…</p>
              </div>
            </div>
          ) : (
            <LeafletMap signalements={signalements} onSelect={handleSelect} />
          )}
        </div>
      )}

      {/* ── Légende (carte uniquement, bas gauche) ── */}
      {activeView === 'carte' && !selected && (
        <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur rounded-xl px-3 py-2 shadow text-xs space-y-1" aria-label="Légende">
          {[
            { color: '#ca8a04', label: 'Faible' },
            { color: '#ea580c', label: 'Moyenne' },
            { color: '#dc2626', label: 'Forte' },
            { color: '#6b7280', label: 'Non qualifié' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} aria-hidden="true" />
              <span className="text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Vue Liste ── */}
      {activeView === 'liste' && (
        <div className="absolute inset-0 z-0 overflow-y-auto bg-gray-50 pt-16">
          <div className="max-w-2xl mx-auto px-4 pb-6">
            {loading ? (
              <div role="status" className="text-center py-12 text-gray-400">Chargement…</div>
            ) : signalements.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl mt-4">
                <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" aria-hidden="true" />
                <p className="text-gray-400">Aucun signalement.</p>
              </div>
            ) : (
              <ul role="list" aria-label="Liste des signalements" className="space-y-3 mt-4">
                {signalements.map((sig) => (
                  <li key={sig.id}>
                    <button
                      onClick={() => { setSelected(sig); setActiveView('carte'); }}
                      className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow text-left focus:outline-none focus:ring-2 focus:ring-green-400"
                      aria-label={`Signalement ${sig.id}, ${getGraviteLabel(sig.gravite)}, ${formatDate(sig.created_at)}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 text-sm">Signalement #{sig.id}</p>
                          <p className="text-gray-500 text-xs mt-0.5">{formatDate(sig.created_at)}</p>
                          <div className="flex gap-2 mt-2">
                            {sig.photo_url && <span className="text-xs text-blue-600">📷 Photo</span>}
                            {sig.audio_url && <span className="text-xs text-green-600">🔊 Note vocale</span>}
                          </div>
                        </div>
                        <span
                          className="px-2 py-1 rounded-full text-white text-xs font-semibold shrink-0"
                          style={{ backgroundColor: getGraviteColor(sig.gravite) }}
                        >
                          {getGraviteLabel(sig.gravite)}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Barre du haut (overlay) ── */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 p-3 bg-white/90 backdrop-blur border-b border-gray-200/50 shadow-sm">
        {/* Retour */}
        <button
          onClick={() => router.push('/conseiller')}
          className="p-2.5 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm"
          aria-label="Retour à l'espace conseiller"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>

        <span className="font-bold text-green-800 text-sm flex-1">Signalements</span>

        {/* Actualiser */}
        <button
          onClick={fetchSignalements}
          disabled={loading}
          className="p-2.5 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm disabled:opacity-50"
          aria-label="Actualiser"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>

        {/* Toggle Carte/Liste */}
        <div role="tablist" aria-label="Vue" className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
          <button
            role="tab" aria-selected={activeView === 'carte'}
            onClick={() => setActiveView('carte')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 ${activeView === 'carte' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <MapPin className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />Carte
          </button>
          <button
            role="tab" aria-selected={activeView === 'liste'}
            onClick={() => setActiveView('liste')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 ${activeView === 'liste' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <List className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />Liste ({signalements.length})
          </button>
        </div>
      </div>

      {/* ── Panneau qualification (slide-up) ── */}
      {selected && (
        <QualificationPanel
          sig={selected}
          ravageurs={ravageurs}
          onClose={handlePanelClose}
          onSuccess={handlePanelSuccess}
        />
      )}

      {/* Fond semi-opaque quand le panneau est ouvert */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/30 z-10"
          onClick={handlePanelClose}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
