/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API. Si falta, se usa la de producción (ver apiBase.ts). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
