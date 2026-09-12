/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_CITY_MESH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
