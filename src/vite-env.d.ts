/// <reference types="vite/client" />

// The checkout's short commit hash at build time (vite.config.ts), or "".
declare const __APP_COMMIT__: string;

// package.json's version at build time (vite.config.ts).
declare const __APP_VERSION__: string;
