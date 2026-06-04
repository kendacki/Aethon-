import { useMemo } from "react";
import { useAuthSession } from "./useAuthSession";
import { useWallet } from "../wallet/WalletContext";

export type SessionPhase = "guest" | "wallet" | "authenticated";

export function useSignedIn() {
  const { address, isConnected, isCorrectChain, chainId, connecting } = useWallet();
  const { isSignedIn, token } = useAuthSession();

  const phase: SessionPhase = useMemo(() => {
    if (isConnected && address && isSignedIn) return "authenticated";
    if (isConnected && address) return "wallet";
    return "guest";
  }, [isConnected, address, isSignedIn]);

  const signedIn = phase === "authenticated";

  return {
    phase,
    signedIn,
    address,
    chainId,
    isConnected,
    isCorrectChain,
    connecting,
    isSignedIn,
    token,
  };
}
