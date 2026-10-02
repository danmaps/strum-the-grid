import { cp, mkdir } from 'node:fs/promises';

// Keep SDK workers/WASM/locales local: the synthetic experience needs no service or API key.
await mkdir('public/arcgis', { recursive: true });
await cp('node_modules/@arcgis/core/assets', 'public/arcgis', { recursive: true });
