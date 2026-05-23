import { BrowserProvider, JsonRpcSigner } from "ethers";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SOMNIA_CHAIN, SOMNIA_CHAIN_HEX, SOMNIA_CHAIN_ID } from "./config";

type WalletContextValue = {
  address: string | null;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
  isConnected: boolean;
  isCorrectChain: boolean;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function getEthereum() {
  return typeof window !== "undefined" ? window.ethereum : undefined;
}

async function ensureSomniaNetwork(ethereum: NonNullable<typeof window.ethereum>) {
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

  const syncWallet = useCallback(async (eth = getEthereum()) => {
    if (!eth) {
      setAddress(null);
      setChainId(null);
      setProvider(null);
      setSigner(null);
      return;
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
      return;
    }

    setAddress(accounts[0]);
    setSigner(await browserProvider.getSigner());
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
    setError(null);
  }, []);

  const connect = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) {
      setError("No wallet found. Install MetaMask or another Web3 wallet.");
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      await eth.request({ method: "eth_requestAccounts" });
      await ensureSomniaNetwork(eth);
      await syncWallet(eth);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet connection failed.");
      disconnect();
    } finally {
      setConnecting(false);
    }
  }, [disconnect, syncWallet]);

  useEffect(() => {
    const eth = getEthereum();
    if (!eth) return;

    void syncWallet(eth);

    const onAccountsChanged = (accounts: unknown) => {
      const list = accounts as string[];
      if (list.length === 0) disconnect();
      else void syncWallet(eth);
    };

    const onChainChanged = () => {
      void syncWallet(eth);
    };

    eth.on?.("accountsChanged", onAccountsChanged);
    eth.on?.("chainChanged", onChainChanged);

    return () => {
      eth.removeListener?.("accountsChanged", onAccountsChanged);
      eth.removeListener?.("chainChanged", onChainChanged);
    };
  }, [disconnect, syncWallet]);

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      chainId,
      connecting,
      error,
      isConnected: Boolean(address),
      isCorrectChain: chainId === SOMNIA_CHAIN_ID,
      provider,
      signer,
      connect,
      disconnect,
    }),
    [address, chainId, connect, connecting, disconnect, error, provider, signer],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
