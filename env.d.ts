/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Base URL of the sync backend. When unset, the app runs offline-only. */
  readonly VITE_SYNC_URL?: string
}
