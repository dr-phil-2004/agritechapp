import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist, NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'serwist';

// Déclaration de l'interface globale pour TypeScript
declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // API signalements : NetworkFirst (données fraîches en priorité)
    {
      matcher: /^\/api\/signalements/,
      handler: new NetworkFirst({
        cacheName: 'api-signalements',
        networkTimeoutSeconds: 5,
      }),
    },
    // API autres routes : NetworkFirst
    {
      matcher: /^\/api\//,
      handler: new NetworkFirst({
        cacheName: 'api-routes',
        networkTimeoutSeconds: 5,
      }),
    },
    // Tuiles OpenStreetMap : StaleWhileRevalidate
    {
      matcher: /tile\.openstreetmap\.org/,
      handler: new StaleWhileRevalidate({
        cacheName: 'osm-tiles',
      }),
    },
    // Assets statiques : CacheFirst
    {
      matcher: /\.(js|css|woff2|png|jpg|jpeg|svg|ico)$/,
      handler: new CacheFirst({
        cacheName: 'static-assets',
      }),
    },
  ],
});

serwist.addEventListeners();

// Notification push reçue (Web Push / background)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(self as unknown as EventTarget).addEventListener('push', (event: any) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const data = event.data?.json() as { title?: string; body?: string } | undefined ?? {};
  const title = data.title ?? '⚠️ Alerte phytosanitaire';
  const body = data.body ?? 'Un ravageur a été détecté dans votre zone. Consultez vos alertes.';

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  event.waitUntil(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (self as unknown as { registration: ServiceWorkerRegistration }).registration.showNotification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'alerte-phyto',
      data: { url: '/producteur/alertes' },
    })
  );
});

// Clic sur la notification → ouvre la page des alertes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(self as unknown as EventTarget).addEventListener('notificationclick', (event: any) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  event.notification.close();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  event.waitUntil(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (self as unknown as { clients: { openWindow(url: string): Promise<unknown> } }).clients.openWindow(event.notification.data?.url ?? '/producteur/alertes')
  );
});
