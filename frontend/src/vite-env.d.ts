// frontend/src/vite-env.d.ts
/// <reference types="vite/client" />

// (Optional) If you want to explicitly type your VITE_… vars:
interface ImportMetaEnv {
  readonly VITE_MOVIE_URL: string;
  // add any other VITE_XXX vars you use here…
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}