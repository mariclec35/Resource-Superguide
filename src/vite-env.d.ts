/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  __INITIAL_HOMEPAGE_STATS__?: {
    resources: number
    meetings: number
    events: number
  }
}
