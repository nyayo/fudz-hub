/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WEB_PUSH_PUBLIC_KEY?: string;
  readonly VITE_OSRM_BASE_URL?: string;
  readonly VITE_MAP_TILE_URL?: string;
  readonly VITE_MAP_ATTRIBUTION?: string;
}
