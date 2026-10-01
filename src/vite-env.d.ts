/// <reference types="vite/client" />

// Variables lues par le navigateur. Tout ce qui commence par VITE_ part dans le bundle et devient
// public : seulement l'URL du projet et la clé publique, jamais la clé secrète (CLAUDE.md).
interface ImportMetaEnv {
  /** URL du projet Supabase, par exemple http://127.0.0.1:54321 en local. */
  readonly VITE_SUPABASE_URL?: string
  /** Clé publique du projet (`sb_publishable_...`). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
