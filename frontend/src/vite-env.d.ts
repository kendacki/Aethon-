/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_API_KEY?: string;
  readonly VITE_SOMNIA_CHAIN_ID?: string;
  readonly VITE_SOMNIA_RPC_URL?: string;
  readonly VITE_SOMNIA_EXPLORER?: string;
  readonly VITE_SIWE_DOMAIN?: string;
  readonly VITE_SIWE_URI?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
