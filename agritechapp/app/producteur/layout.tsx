'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/infrastructure/supabase/client';

// Son d'alerte généré via Web Audio API — aucun fichier externe requis
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    // Trois bips descendants (signal d'alerte)
    playTone(880, 0, 0.18);
    playTone(660, 0.22, 0.18);
    playTone(440, 0.44, 0.35);
  } catch {
    // Web Audio non disponible — silencieux
  }
}

// Vibration (mobile)
function vibrate() {
  try { navigator.vibrate?.([300, 100, 300, 100, 600]); } catch { /* ignore */ }
}

export default function ProducteurLayout({ children }: { children: React.ReactNode }) {
  const permissionRequestedRef = useRef(false);

  useEffect(() => {
    // Demander la permission de notification une seule fois
    if (!permissionRequestedRef.current && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      permissionRequestedRef.current = true;
      Notification.requestPermission().catch(() => {/* ignore */});
    }
  }, []);

  useEffect(() => {
    // Récupérer l'id producteur depuis localStorage
    let producteurId: number | null = null;
    try {
      const stored = localStorage.getItem('agri_current_user');
      if (stored) producteurId = (JSON.parse(stored) as { id?: number }).id ?? null;
    } catch { /* ignore */ }

    if (!producteurId) return;

    // Abonnement Supabase Realtime sur la table envois pour ce producteur
    const channel = supabase
      .channel(`alertes-producteur-${producteurId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'envois',
        },
        (payload) => {
          // Filtrer côté client (Supabase filtre serveur nécessite RLS activé)
          if ((payload.new as { destinataire_id?: number }).destinataire_id !== producteurId) return;
          // Son + vibration
          playAlertSound();
          vibrate();

          // Rafraîchir la page des alertes si elle est ouverte
          window.dispatchEvent(new CustomEvent('nouvelle-alerte'));

          // Notification OS (si permission accordée et onglet non actif)
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('⚠️ Alerte phytosanitaire', {
              body: 'Un ravageur a été détecté dans votre zone. Consultez vos alertes.',
              icon: '/icons/icon-192x192.png',
              tag: 'alerte-phyto',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return <>{children}</>;
}
