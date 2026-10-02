import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
  // ArcGIS is native ESM with a large dynamic module graph; do not crawl/prebundle the SDK.
  optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'], exclude: ['@arcgis/core'] },
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'], restoreMocks: true },
  build: { chunkSizeWarningLimit: 1800 },
});
