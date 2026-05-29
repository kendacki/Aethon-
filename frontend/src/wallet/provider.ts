/** EIP-1193 provider with optional MetaMask / multi-wallet fields */
export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  providers?: EthereumProvider[];
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

let cachedProvider: EthereumProvider | undefined;

/** Prefer MetaMask when multiple wallets inject into window.ethereum */
export function resolveEthereumProvider(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  if (cachedProvider) return cachedProvider;

  const root = window.ethereum;
  if (!root) return undefined;

  const nested = root.providers?.filter(Boolean);
  if (nested && nested.length > 0) {
    cachedProvider =
      nested.find((p) => p.isMetaMask && !p.isCoinbaseWallet) ??
      nested.find((p) => p.isMetaMask) ??
      nested[0];
    return cachedProvider;
  }

  cachedProvider = root;
  return cachedProvider;
}

export function resetEthereumProviderCache(): void {
  cachedProvider = undefined;
}
