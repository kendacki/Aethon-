import { useEffect, useState } from "react";
import { Button } from "./ui";
import { shortAddr } from "../api/client";
import { signInWithSomnia, Web3AuthError } from "../auth/web3Auth";
import { clearAuthToken } from "../auth/token";
import { useSignedIn } from "../auth/useSignedIn";
import { isSomniaChain } from "../wallet/network";
import { useWallet } from "../wallet/WalletContext";
import { useToast } from "./ToastProvider";

export function ConnectButton() {
  const {
    address,
    connecting,
    isCorrectChain,
    hasWallet,
    signer,
    error: walletError,
    connect,
    refreshWallet,
    disconnect,
    clearError,
  } = useWallet();
  const { signedIn, phase } = useSignedIn();
  const toast = useToast();
  const [signingIn, setSigningIn] = useState(false);

  const showToast = (message: string, variant: "error" | "success" | "info" = "error") => {
    toast.toast(message, variant);
    clearError();
  };

  const handleConnectWallet = async () => {
    const outcome = await connect();
    if (!outcome.ok) {
      showToast(outcome.error);
      return;
    }
    toast.info("Wallet connected. Sign in to operate the swarm.");
  };

  const handleSignIn = async () => {
    let activeSigner = signer;
    let activeAddress = address;

    if (!activeSigner || !activeAddress) {
      const outcome = await connect();
      if (!outcome.ok) {
        showToast(outcome.error);
        return;
      }
      activeSigner = outcome.signer;
      activeAddress = outcome.address;
    } else {
      const synced = await refreshWallet();
      if (synced) {
        activeSigner = synced.signer;
        activeAddress = synced.address;
      }
    }

    if (!activeSigner || !activeAddress) {
      showToast("Wallet not ready. Reconnect and try again.");
      return;
    }

    if (!isCorrectChain) {
      const synced = await refreshWallet();
      if (synced && isSomniaChain(synced.chainId)) {
        activeSigner = synced.signer;
        activeAddress = synced.address;
      } else {
        const outcome = await connect();
        if (!outcome.ok) {
          showToast(outcome.error);
          return;
        }
        activeSigner = outcome.signer;
        activeAddress = outcome.address;
      }
    }

    setSigningIn(true);
    try {
      await signInWithSomnia(activeSigner, activeAddress);
      toast.success("Signed in. Swarm operator mode enabled.");
    } catch (err) {
      if (err instanceof Web3AuthError) {
        showToast(err.message);
      } else if (err instanceof Error) {
        showToast(err.message);
      } else {
        showToast("Sign in failed.");
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleDisconnect = () => {
    clearAuthToken();
    disconnect();
    toast.info("Disconnected.");
  };

  const busy = connecting || signingIn;

  useEffect(() => {
    if (walletError) toast.error(walletError);
  }, [walletError, toast]);

  if (signedIn && address) {
    return (
      <Button variant="outline" size="sm" onClick={handleDisconnect} title="Disconnect wallet">
        {shortAddr(address)}
        {!isCorrectChain ? " · wrong network" : ""}
      </Button>
    );
  }

  if (phase === "wallet" && address) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => void handleSignIn()} disabled={busy}>
          {signingIn ? "Sign in…" : isCorrectChain ? "Sign in" : "Switch network"}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDisconnect} disabled={busy}>
          {shortAddr(address)}
        </Button>
      </>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={() => void handleConnectWallet()} disabled={busy}>
      {connecting ? "Connecting…" : hasWallet ? "Connect wallet" : "Install wallet"}
    </Button>
  );
}
