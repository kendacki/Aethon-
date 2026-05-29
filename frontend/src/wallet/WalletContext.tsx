import { BrowserProvider, JsonRpcSigner, getAddress } from "ethers";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearAuthToken } from "../auth/token";
import { SOMNIA_CHAIN, SOMNIA_CHAIN_HEX, SOMNIA_CHAIN_ID } from "./config";
import { resolveEthereumProvider, resetEthereumProviderCache, type EthereumProvider } from "./provider";

type ConnectResult = {
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
  connect: () => Promise<ConnectResult | null>;
  disconnect: () => void;
  clearError: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

async function ensureSomniaNetwork(ethereum: EthereumProvider) {
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SOMNIA_CHAIN_HEX }],
    });
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code !== 4902) throw err;
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [SOMNIA_CHAIN],
    });
  }
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

    const browserProvider = new BrowserProvider(eth);
    const network = await browserProvider.getNetwork();
    const nextChainId = Number(network.chainId);
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

  const connect = useCallback(async (): Promise<ConnectResult | null> => {
    resetEthereumProviderCache();
    const eth = resolveEthereumProvider();
    setHasWallet(Boolean(eth));
    if (!eth) {
      setError("No wallet found. Install MetaMask or another Web3 wallet.");
      return null;
    }

    setConnecting(true);
    setError(null);

    try {
      await eth.request({ method: "eth_requestAccounts" });
      await ensureSomniaNetwork(eth);
      const synced = await syncWallet(eth);
      if (!synced) {
        setError("Wallet connected but no account returned.");
        return null;
      }
      if (synced.chainId !== SOMNIA_CHAIN_ID) {
        setError(`Switch to Somnia Shannon Testnet (chain ${SOMNIA_CHAIN_ID}).`);
        return null;
      }
      return synced;
    } catch (err) {
      const code = (err as { code?: number }).code;
      if (code === 4001) {
        setError("Connection rejected in wallet.");
      } else {
        setError(err instanceof Error ? err.message : "Wallet connection failed.");
      }
      return null;
    } finally {
      setConnecting(false);
    }
  }, [syncWallet]);

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
