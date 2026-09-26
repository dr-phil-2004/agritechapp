'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic,
  Play,
  Square,
  Camera,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Clock,
  RefreshCw,
} from 'lucide-react';

// ─── Compression image ───────────────────────────────────────────────────────

async function compressImage(file: File): Promise<Blob> {
  const MAX_BYTES = 100_000;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const MAX_DIM = 1024;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round((height * MAX_DIM) / width); width = MAX_DIM; }
        else { width = Math.round((width * MAX_DIM) / height); height = MAX_DIM; }
      }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas non disponible')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.85;
      const tryCompress = () => {
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Compression échouée')); return; }
          if (blob.size <= MAX_BYTES || quality <= 0.1) { resolve(blob); }
          else { quality -= 0.1; tryCompress(); }
        }, 'image/jpeg', quality);
      };
      tryCompress();
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.src = url;
  });
}

// ─── Capture caméra (getUserMedia) ───────────────────────────────────────────

function CameraModal({
  onCapture,
  onClose,
}: {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then((stream) => {
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => { if (mounted) setReady(true); };
        }
      })
      .catch(() => { if (mounted) onClose(); /* déclenché en dehors via photoError */ });
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snap = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => { if (blob) { streamRef.current?.getTracks().forEach((t) => t.stop()); onCapture(blob); } }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col" role="dialog" aria-modal="true" aria-label="Caméra">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} autoPlay playsInline muted className="flex-1 w-full object-cover" />
      <div className="p-6 bg-black flex items-center gap-4">
        <button
          onClick={onClose}
          className="flex-1 py-4 bg-white/20 text-white rounded-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Annuler la photo"
        >
          Annuler
        </button>
        <button
          onClick={snap}
          disabled={!ready}
          className="flex-1 py-4 bg-white text-black rounded-2xl font-bold text-lg disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-green-400"
          aria-label="Prendre la photo"
        >
          Prendre
        </button>
      </div>
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;
type SubmitState = 'idle' | 'submitting' | 'success' | 'offline' | 'error';

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SigmalerPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // GPS — coordonnées de démo : N'Dali, Borgou (zone des personas Bio et Adjara)
  // Le GPS réel est ignoré pour la démo car les producteurs du seed sont tous dans le rayon de N'Dali
  const [coords] = useState<{ lat: number; lng: number }>({ lat: 9.85, lng: 2.73 });

  // Étape 1 — Note vocale (obligatoire)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    setAudioError(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        setAudioBlob(new Blob(audioChunksRef.current, { type: mimeType }));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch {
      setAudioError('Microphone inaccessible. Vérifiez les permissions.');
    }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };

  const playAudio = () => {
    if (!audioBlob || isPlaying) return;
    audioRef.current?.pause();
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(url); };
    audio.play(); setIsPlaying(true);
  };

  const resetAudio = () => {
    audioRef.current?.pause(); audioRef.current = null;
    setAudioBlob(null); setIsPlaying(false); setIsRecording(false);
  };

  // Étape 2 — Photo (caméra getUserMedia en priorité)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const handleCameraCapture = async (blob: Blob) => {
    setCameraOpen(false);
    setPhotoError(null);
    try {
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      const compressed = await compressImage(file);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoBlob(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch { setPhotoError('Impossible de traiter la photo. Réessayez.'); }
  };

  const openCamera = async () => {
    setPhotoError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhotoError('Caméra non disponible. Utilisez la galerie ci-dessous.');
      return;
    }
    // Vérifier la permission avant d'ouvrir la modale
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((s) => s.getTracks().forEach((t) => t.stop()));
      setCameraOpen(true);
    } catch {
      setPhotoError('Permission caméra refusée. Utilisez la galerie ci-dessous.');
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setPhotoError('Veuillez sélectionner une image.'); return; }
    try {
      const compressed = await compressImage(file);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoBlob(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch { setPhotoError('Impossible de traiter cette image. Réessayez.'); }
  };

  useEffect(() => { return () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }; }, [photoPreview]);

  // Étape 3 — Envoi
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const [queueId, setQueueId] = useState<number | null>(null);

  const doSubmit = useCallback(async () => {
    setSubmitState('submitting');
    const finalCoords = coords ?? { lat: 9.85, lng: 2.73 };
    const producteur_id = (() => {
      try {
        const stored = localStorage.getItem('agri_current_user');
        if (stored) return (JSON.parse(stored) as { id?: number }).id ?? 1;
      } catch { /* ignore */ }
      return 1;
    })();

    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;

    if (isOnline) {
      try {
        const formData = new FormData();
        formData.set('producteur_id', String(producteur_id));
        formData.set('lat', String(finalCoords.lat));
        formData.set('lng', String(finalCoords.lng));
        formData.set('canal_origine', 'app');
        if (audioBlob) formData.set('audio', audioBlob, 'note.opus');
        if (photoBlob) formData.set('photo', photoBlob, 'photo.jpg');

        const res = await fetch('/api/signalements', { method: 'POST', body: formData });
        if (res.ok) {
          setSubmitState('success');
          setSubmitMessage('Signalement envoyé.');
          if (typeof navigator.vibrate === 'function') navigator.vibrate([200]);
          return;
        }
      } catch { /* tombe en file d'attente */ }
    }

    // Hors ligne ou erreur réseau → file d'attente Dexie
    try {
      const { addToQueue } = await import('@/infrastructure/offline/sync');
      const id = await addToQueue(
        { producteur_id, lat: finalCoords.lat, lng: finalCoords.lng, canal_origine: 'app' },
        photoBlob, audioBlob
      );
      setQueueId(id);
      setSubmitState('offline');
      setSubmitMessage('Signalement mis en attente. Il sera envoyé dès que vous serez connecté.');
      if (typeof navigator.vibrate === 'function') navigator.vibrate([100, 50, 100]);
    } catch {
      setSubmitState('error');
      setSubmitMessage('Impossible d\'enregistrer le signalement. Réessayez.');
    }
  }, [coords, audioBlob, photoBlob]);

  // Renvoyer manuellement depuis la file d'attente (style WhatsApp)
  const handleRetry = useCallback(async () => {
    if (queueId === null) return;
    setSubmitState('submitting');
    try {
      const { syncPendingSignalements } = await import('@/infrastructure/offline/sync');
      const result = await syncPendingSignalements();
      if (result.synced > 0) {
        setSubmitState('success');
        setSubmitMessage('Signalement envoyé avec succès.');
        if (typeof navigator.vibrate === 'function') navigator.vibrate([200]);
      } else {
        setSubmitState('offline');
        setSubmitMessage('Toujours sans réseau. Appuyez à nouveau pour réessayer.');
      }
    } catch {
      setSubmitState('offline');
      setSubmitMessage('Erreur lors de l\'envoi. Réessayez.');
    }
  }, [queueId]);

  const stepLabels: [string, string, string] = ['Note vocale', 'Photo', 'Envoyer'];

  return (
    <>
    {cameraOpen && (
      <CameraModal
        onCapture={handleCameraCapture}
        onClose={() => { setCameraOpen(false); setPhotoError('Caméra fermée. Vous pouvez choisir une image dans la galerie.'); }}
      />
    )}
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">

        {/* En-tête */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => (step > 1 && submitState === 'idle' ? setStep((step - 1) as Step) : router.back())}
            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <h1 className="text-xl font-bold text-green-800">Signaler un problème</h1>

          {/* Indicateur GPS silencieux */}
          {coords ? (
            <span className="ml-auto text-xs text-green-600 flex items-center gap-1" aria-label="Position GPS obtenue">
              <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" /> GPS
            </span>
          ) : (
            <span className="ml-auto text-xs text-gray-400 animate-pulse" aria-label="Obtention de la position GPS en cours">
              GPS…
            </span>
          )}
        </div>

        {/* Indicateur d'étapes */}
        {submitState === 'idle' && (
          <nav aria-label="Étapes du signalement" className="mb-6">
            <ol className="flex items-center gap-1">
              {stepLabels.map((label, i) => {
                const stepNum = (i + 1) as Step;
                const isActive = stepNum === step;
                const isDone = stepNum < step;
                return (
                  <li key={label} className="flex-1 flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isDone ? 'bg-green-600 text-white' : isActive ? 'bg-green-200 text-green-800 ring-2 ring-green-500' : 'bg-gray-200 text-gray-500'
                      }`}
                      aria-current={isActive ? 'step' : undefined}
                    >
                      {isDone ? <CheckCircle className="w-4 h-4" aria-hidden="true" /> : stepNum}
                    </div>
                    <span className="text-xs mt-1 text-gray-500">{label}</span>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {/* Contenu */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">

          {/* ── ÉTAPE 1 : NOTE VOCALE (obligatoire) ────────────────────── */}
          {step === 1 && submitState === 'idle' && (
            <section aria-labelledby="step1-title">
              <h2 id="step1-title" className="text-lg font-bold text-gray-800 mb-2">
                Note vocale
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                Décrivez ce que vous avez vu, dans votre langue. Cette note est obligatoire.
              </p>

              {audioError && (
                <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {audioError}
                </div>
              )}

              {/* Bouton principal enregistrement */}
              {!audioBlob && !isRecording && (
                <button
                  onClick={startRecording}
                  className="w-full min-h-[120px] bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl flex flex-col items-center justify-center gap-3 font-bold text-xl transition-colors focus:outline-none focus:ring-4 focus:ring-red-300"
                  aria-label="Appuyer pour commencer l'enregistrement"
                >
                  <Mic className="w-14 h-14" aria-hidden="true" />
                  Enregistrer
                </button>
              )}

              {/* En cours d'enregistrement */}
              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="w-full min-h-[120px] bg-gray-900 hover:bg-black text-white rounded-2xl flex flex-col items-center justify-center gap-3 font-bold text-xl transition-colors focus:outline-none focus:ring-4 focus:ring-gray-400 animate-pulse"
                  aria-label="Appuyer pour arrêter l'enregistrement"
                  aria-live="assertive"
                >
                  <Square className="w-14 h-14" aria-hidden="true" />
                  Arrêter
                </button>
              )}

              {/* Note enregistrée */}
              {audioBlob && !isRecording && (
                <div className="space-y-3">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 shrink-0" aria-hidden="true" />
                    <div className="flex-1">
                      <p className="text-green-800 font-semibold">Note enregistrée</p>
                      <p className="text-green-700 text-sm">{Math.round(audioBlob.size / 1024)} Ko</p>
                    </div>
                    <button
                      onClick={playAudio}
                      disabled={isPlaying}
                      className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50"
                      aria-label={isPlaying ? 'Lecture en cours' : 'Écouter la note'}
                    >
                      <Play className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                  <button
                    onClick={resetAudio}
                    className="w-full py-3 border-2 border-red-200 hover:bg-red-50 text-red-700 rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                    aria-label="Recommencer l'enregistrement"
                  >
                    Recommencer
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ── ÉTAPE 2 : PHOTO (caméra getUserMedia) ──────────────────── */}
          {step === 2 && submitState === 'idle' && (
            <section aria-labelledby="step2-title">
              <h2 id="step2-title" className="text-lg font-bold text-gray-800 mb-2">
                Photo
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Prenez une photo de la plante ou du ravageur observé.
              </p>

              {photoPreview && (
                <div className="mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Aperçu de la photo" className="w-full max-h-64 object-cover rounded-xl border border-gray-200" />
                  <p className="text-sm text-green-700 mt-2 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" aria-hidden="true" />
                    {photoBlob ? Math.round(photoBlob.size / 1024) : '?'} Ko
                  </p>
                </div>
              )}

              {/* Bouton principal — ouvre la caméra via getUserMedia */}
              <button
                onClick={openCamera}
                className="w-full min-h-[80px] bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-lg transition-colors focus:outline-none focus:ring-4 focus:ring-green-300 flex items-center justify-center gap-3"
                aria-label={photoPreview ? 'Reprendre la photo avec la caméra' : 'Ouvrir la caméra pour prendre une photo'}
              >
                <Camera className="w-8 h-8" aria-hidden="true" />
                {photoPreview ? 'Reprendre la photo' : 'Ouvrir la caméra'}
              </button>

              {/* Lien secondaire — galerie */}
              <label
                htmlFor="photo-gallery"
                className="block w-full text-center mt-3 py-3 border-2 border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl cursor-pointer font-medium transition-colors focus-within:ring-2 focus-within:ring-gray-400"
              >
                Choisir dans la galerie
                <input
                  id="photo-gallery"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="sr-only"
                  aria-label="Choisir une photo depuis la galerie"
                />
              </label>

              {photoError && (
                <div role="alert" className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {photoError}
                </div>
              )}

              <p className="text-xs text-gray-400 mt-3">La photo est optionnelle. Vous pouvez continuer sans.</p>
            </section>
          )}

          {/* ── ÉTAPE 3 : RÉSUMÉ ET ENVOI ───────────────────────────────── */}
          {step === 3 && submitState === 'idle' && (
            <section aria-labelledby="step3-title">
              <h2 id="step3-title" className="text-lg font-bold text-gray-800 mb-4">
                Confirmer et envoyer
              </h2>

              <ul className="space-y-2 mb-6 text-sm" aria-label="Récapitulatif">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" aria-hidden="true" />
                  <span>Note vocale : {audioBlob ? `${Math.round(audioBlob.size / 1024)} Ko` : '—'}</span>
                </li>
                <li className="flex items-center gap-2">
                  {photoBlob
                    ? <CheckCircle className="w-4 h-4 text-green-600" aria-hidden="true" />
                    : <span className="w-4 h-4 rounded-full border-2 border-gray-300 inline-block" aria-hidden="true" />}
                  <span>Photo : {photoBlob ? `${Math.round(photoBlob.size / 1024)} Ko` : 'non fournie'}</span>
                </li>
                <li className="flex items-center gap-2">
                  {coords
                    ? <CheckCircle className="w-4 h-4 text-green-600" aria-hidden="true" />
                    : <Clock className="w-4 h-4 text-orange-500 animate-spin" aria-hidden="true" />}
                  <span>Position : {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'en cours…'}</span>
                </li>
              </ul>

              <button
                onClick={doSubmit}
                className="w-full min-h-[64px] bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-lg transition-colors focus:outline-none focus:ring-4 focus:ring-green-300"
                aria-label="Envoyer le signalement"
              >
                Envoyer le signalement
              </button>
            </section>
          )}

          {/* ── EN COURS D'ENVOI ─────────────────────────────────────────── */}
          {submitState === 'submitting' && (
            <div role="status" aria-live="polite" className="text-center py-8">
              <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true" />
              <p className="text-gray-600">Envoi en cours…</p>
            </div>
          )}

          {/* ── SUCCÈS ───────────────────────────────────────────────────── */}
          {submitState === 'success' && (
            <section aria-live="assertive" aria-labelledby="result-title" className="text-center py-4">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" aria-hidden="true" />
              <h2 id="result-title" className="text-xl font-bold text-green-800 mb-2">Signalement envoyé</h2>
              <p className="text-gray-600 text-sm mb-6">{submitMessage}</p>
              <button
                onClick={() => router.push('/producteur')}
                className="w-full min-h-[56px] bg-green-600 hover:bg-green-700 text-white rounded-2xl font-semibold transition-colors focus:outline-none focus:ring-4 focus:ring-green-300"
                aria-label="Retourner à l'accueil producteur"
              >
                Retour à l&apos;accueil
              </button>
            </section>
          )}

          {/* ── EN ATTENTE (offline) — style WhatsApp ───────────────────── */}
          {(submitState === 'offline' || submitState === 'error') && (
            <section aria-live="assertive" aria-labelledby="result-title" className="text-center py-4">
              <Clock className="w-16 h-16 text-orange-500 mx-auto mb-4" aria-hidden="true" />
              <h2 id="result-title" className="text-xl font-bold text-orange-700 mb-2">
                {submitState === 'error' ? 'Erreur' : 'En attente de réseau'}
              </h2>
              <p className="text-gray-600 text-sm mb-6">{submitMessage}</p>

              {/* Renvoyer manuellement */}
              <button
                onClick={handleRetry}
                className="w-full min-h-[56px] mb-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-4 focus:ring-orange-300"
                aria-label="Réessayer l'envoi du signalement"
              >
                <RefreshCw className="w-5 h-5" aria-hidden="true" />
                Renvoyer
              </button>

              <button
                onClick={() => router.push('/producteur')}
                className="w-full min-h-[48px] border-2 border-gray-300 hover:bg-gray-50 text-gray-700 rounded-2xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                aria-label="Retourner à l'accueil producteur"
              >
                Retour à l&apos;accueil
              </button>
            </section>
          )}
        </div>

        {/* Navigation entre étapes */}
        {submitState === 'idle' && (
          <div className="flex gap-3">
            <button
              onClick={() => (step > 1 ? setStep((step - 1) as Step) : router.back())}
              className="flex-1 min-h-[56px] bg-white border-2 border-gray-300 hover:bg-gray-50 text-gray-700 rounded-2xl font-semibold transition-colors focus:outline-none focus:ring-4 focus:ring-gray-300"
              aria-label="Étape précédente"
            >
              <ArrowLeft className="w-5 h-5 inline mr-1" aria-hidden="true" />
              Précédent
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep((step + 1) as Step)}
                disabled={step === 1 && !audioBlob}
                className="flex-1 min-h-[56px] bg-green-600 hover:bg-green-700 text-white rounded-2xl font-semibold transition-colors focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={step === 1 && !audioBlob ? 'Enregistrez une note vocale pour continuer' : 'Étape suivante'}
              >
                Suivant
                <ArrowRight className="w-5 h-5 inline ml-1" aria-hidden="true" />
              </button>
            ) : (
              <button
                onClick={doSubmit}
                className="flex-1 min-h-[56px] bg-green-600 hover:bg-green-700 text-white rounded-2xl font-semibold transition-colors focus:outline-none focus:ring-4 focus:ring-green-300"
                aria-label="Envoyer le signalement"
              >
                Envoyer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
