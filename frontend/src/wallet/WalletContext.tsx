import { BrowserProvider, JsonRpcSigner, getAddress } from "ethers";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearAuthToken } from "../auth/token";
import { SOMNIA_CHAIN, SOMNIA_CHAIN_HEX, SOMNIA_CHAIN_ID } from "./config";
import { resolveEthereumProvider, resetEthereumProviderCache, type EthereumProvider } from "./provider";

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
  disconnect: () => void;
  clearError: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function parseChainId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return Number.parseInt(trimmed, trimmed.startsWith("0x") ? 16 : 10);
  }
  if (typeof value === "bigint") return Number(value);
  return null;
}

async function readChainId(ethereum: EthereumProvider): Promise<number> {
  const hex = (await ethereum.request({ method: "eth_chainId" })) as string;
  return parseChainId(hex) ?? 0;
}

async function ensureSomniaNetwork(ethereum: EthereumProvider): Promise<void> {
  const switchChain = async () => {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SOMNIA_CHAIN_HEX }],
    });
  };

  try {
    await switchChain();
    return;
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 4001) {
      throw new Error("Network switch rejected in wallet.");
    }
    if (code !== 4902) {
      throw err instanceof Error ? err : new Error("Could not switch to Somnia testnet.");
    }
  }

  try {
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [SOMNIA_CHAIN],
    });
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 4001) {
      throw new Error("Add network rejected in wallet.");
    }
    // Chain may already exist — try switching again.
  }

  await switchChain();
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [hasWallet, setHasWallet] = useState(false);

  const syncWallet = useCallback(async (eth = resolveEthereumProvider()) => {
    setHasWallet(Boolean(eth));
    if (!eth) {
      setAddress(null);
      setChainId(null);
      setProvider(null);
      setSigner(null);
      return null;
    }

    const nextChainId = await readChainId(eth);
    const browserProvider = new BrowserProvider(eth, nextChainId);
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
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts.length) {
        return fail("Wallet connected but no account returned.");
      }

      await ensureSomniaNetwork(eth);

      const synced = await syncWallet(eth);
      if (!synced) {
        return fail("Wallet connected but no account returned.");
      }

      if (synced.chainId !== SOMNIA_CHAIN_ID) {
        return fail(`Switch to Somnia testnet (chain ${SOMNIA_CHAIN_ID}) in your wallet.`);
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
      isCorrectChain: chainId === SOMNIA_CHAIN_ID,
      hasWallet,
      provider,
      signer,
      connect,
      disconnect,
      clearError,
    }),
    [address, chainId, connect, connecting, clearError, disconnect, error, hasWallet, provider, signer],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
