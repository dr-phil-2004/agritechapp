import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  // Ne pas précacher en dev pour accélérer
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  // Silence le warning Turbopack/webpack — Serwist ajoute une config webpack,
  // mais l'app fonctionne correctement avec Turbopack en dev.
  turbopack: {},
};

export default withSerwist(nextConfig);
