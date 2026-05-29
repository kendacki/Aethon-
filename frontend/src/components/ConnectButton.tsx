import { useState } from "react";
import { Button } from "./ui";
import { shortAddr } from "../api/client";
import { signInWithSomnia, Web3AuthError } from "../auth/web3Auth";
import { clearAuthToken } from "../auth/token";
import { useAuthSession } from "../auth/useAuthSession";
import { useWallet } from "../wallet/WalletContext";
import { Notification } from "./Layout";

export function ConnectButton() {
  const {
    address,
    connecting,
    isConnected,
    isCorrectChain,
    hasWallet,
    signer,
    error: walletError,
    connect,
    disconnect,
    clearError,
  } = useWallet();
  const [signingIn, setSigningIn] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    clearError();
  };

  const handleConnectWallet = async () => {
    setToast("");
    const outcome = await connect();
    if (!outcome.ok) {
      setToast(outcome.error);
      return;
    }
    setToast("Wallet connected. Sign in to submit tasks.");
  };

  const handleSignIn = async () => {
    setToast("");

    let activeSigner = signer;
    let activeAddress = address;

    if (!activeSigner || !activeAddress || !isCorrectChain) {
      const outcome = await connect();
      if (!outcome.ok) {
        setToast(outcome.error);
        return;
      }
      activeSigner = outcome.signer;
      activeAddress = outcome.address;
    }

    setSigningIn(true);
    try {
      await signInWithSomnia(activeSigner, activeAddress);
      setToast("");
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
    setToast("");
  };

  const { isSignedIn } = useAuthSession();
  const busy = connecting || signingIn;
  const displayError = toast || walletError || "";

  if (isConnected && address && isSignedIn) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={handleDisconnect} title="Disconnect wallet">
          {shortAddr(address)}
          {!isCorrectChain ? " · wrong network" : ""}
        </Button>
        <Notification message={displayError} onClose={() => { setToast(""); clearError(); }} />
      </>
    );
  }

  if (isConnected && address && !isSignedIn) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => void handleSignIn()} disabled={busy}>
          {signingIn ? "Sign in..." : isCorrectChain ? "Sign in" : "Switch network"}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDisconnect} disabled={busy}>
          {shortAddr(address)}
        </Button>
        <Notification message={displayError} onClose={() => { setToast(""); clearError(); }} />
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleConnectWallet()}
        disabled={busy}
      >
        {connecting ? "Connecting..." : hasWallet ? "Connect wallet" : "Install wallet"}
      </Button>
      <Notification message={displayError} onClose={() => { setToast(""); clearError(); }} />
    </>
  );
}
