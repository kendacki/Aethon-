import { BrowserProvider, JsonRpcSigner, getAddress } from "ethers";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearAuthToken } from "../auth/token";
import { SOMNIA_CHAIN_ID } from "./config";
import { ensureSomniaNetwork, isSomniaChain, readChainId } from "./network";
import { resolveEthereumProvider, resetEthereumProviderCache } from "./provider";

export type ConnectSuccess = {
  ok: true;
  address: string;
  signer: JsonRpcSigner;
  chainId: number;
};

export type ConnectFailure = {
  ok: false;
  error: string;
};

export type ConnectOutcome = ConnectSuccess | ConnectFailure;

export type WalletSync = {
  address: string;
  signer: JsonRpcSigner;
  chainId: number;
};

type WalletContextValue = {
  address: string | null;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
  isConnected: boolean;
  isCorrectChain: boolean;
  hasWallet: boolean;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  connect: () => Promise<ConnectOutcome>;
  refreshWallet: () => Promise<WalletSync | null>;
  disconnect: () => void;
  clearError: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [hasWallet, setHasWallet] = useState(false);

  const syncWallet = useCallback(async (eth = resolveEthereumProvider()): Promise<WalletSync | null> => {
    setHasWallet(Boolean(eth));
    if (!eth) {
      setAddress(null);
      setChainId(null);
      setProvider(null);
      setSigner(null);
      return null;
    }

    const nextChainId = await readChainId(eth);
    const networkChainId = nextChainId ?? undefined;
    const browserProvider = new BrowserProvider(eth, networkChainId);
    setChainId(nextChainId);
    setProvider(browserProvider);

    const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
    if (accounts.length === 0) {
      setAddress(null);
      setSigner(null);
      return null;
    }

    const checksummed = getAddress(accounts[0]);
    const nextSigner = await browserProvider.getSigner();
    setAddress(checksummed);
    setSigner(nextSigner);

    if (nextChainId === null) return null;
    return { address: checksummed, signer: nextSigner, chainId: nextChainId };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const disconnect = useCallback(() => {
    clearAuthToken();
    setAddress(null);
    setSigner(null);
    setError(null);
  }, []);

  const fail = useCallback((message: string): ConnectFailure => {
    setError(message);
    return { ok: false, error: message };
  }, []);

  const refreshWallet = useCallback(async (): Promise<WalletSync | null> => {
    resetEthereumProviderCache();
    return syncWallet(resolveEthereumProvider());
  }, [syncWallet]);

  const connect = useCallback(async (): Promise<ConnectOutcome> => {
    resetEthereumProviderCache();
    const eth = resolveEthereumProvider();
    setHasWallet(Boolean(eth));
    if (!eth) {
      return fail("No wallet found. Install MetaMask or another Web3 wallet.");
    }

    setConnecting(true);
    setError(null);

    try {
      const preChainId = await readChainId(eth);
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts.length) {
        return fail("Wallet connected but no account returned.");
      }

      if (!isSomniaChain(preChainId)) {
        await ensureSomniaNetwork(eth);
      }

      const synced = await syncWallet(eth);
      if (!synced) {
        return fail("Wallet connected but no account returned.");
      }

      if (!isSomniaChain(synced.chainId)) {
        return fail(`Switch to Somnia (chain ${SOMNIA_CHAIN_ID}) in MetaMask, then try again.`);
      }

      setError(null);
      return {
        ok: true,
        address: synced.address,
        signer: synced.signer,
        chainId: synced.chainId,
      };
    } catch (err) {
      const code = (err as { code?: number }).code;
      if (code === 4001) {
        return fail("Connection rejected in wallet.");
      }

      // MetaMask can error on redundant switch even when already on Somnia — recover if chain matches.
      const recovered = await syncWallet(eth);
      if (recovered && isSomniaChain(recovered.chainId)) {
        setError(null);
        return {
          ok: true,
          address: recovered.address,
          signer: recovered.signer,
          chainId: recovered.chainId,
        };
      }

      const message = err instanceof Error ? err.message : "Wallet connection failed.";
      return fail(message);
    } finally {
      setConnecting(false);
    }
  }, [fail, syncWallet]);

  useEffect(() => {
    const eth = resolveEthereumProvider();
    setHasWallet(Boolean(eth));
    if (!eth) return;

    void syncWallet(eth);

    const onAccountsChanged = (accounts: unknown) => {
      const list = accounts as string[];
      clearAuthToken();
      if (list.length === 0) {
        setAddress(null);
        setSigner(null);
      } else {
        void syncWallet(eth);
      }
    };

    const onChainChanged = () => {
      clearAuthToken();
      void syncWallet(eth);
    };

    eth.on?.("accountsChanged", onAccountsChanged);
    eth.on?.("chainChanged", onChainChanged);

    return () => {
      eth.removeListener?.("accountsChanged", onAccountsChanged);
      eth.removeListener?.("chainChanged", onChainChanged);
    };
  }, [syncWallet]);

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      chainId,
      connecting,
      error,
      isConnected: Boolean(address),
      isCorrectChain: isSomniaChain(chainId),
      hasWallet,
      provider,
      signer,
      connect,
      refreshWallet,
      disconnect,
      clearError,
    }),
    [address, chainId, connect, connecting, clearError, disconnect, error, hasWallet, provider, refreshWallet, signer],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
