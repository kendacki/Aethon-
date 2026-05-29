import { useState } from "react";
import { Button } from "./ui";
import { shortAddr } from "../api/client";
import { signInWithSomnia, Web3AuthError } from "../auth/web3Auth";
import { clearAuthToken, getAuthToken } from "../auth/token";
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
    const result = await connect();
    if (!result) {
      if (walletError) setToast(walletError);
      return;
    }
    setToast("Wallet connected. Click Sign in to continue.");
  };

  const handleSignIn = async () => {
    setToast("");
    if (!signer || !address) {
      showToast("Connect your wallet first.");
      return;
    }
    if (!isCorrectChain) {
      showToast(`Switch to Somnia Shannon Testnet, then try again.`);
      await connect();
      return;
    }

    setSigningIn(true);
    try {
      await signInWithSomnia(signer, address);
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

  const authed = isConnected && Boolean(getAuthToken());
  const busy = connecting || signingIn;
  const displayError = toast || walletError || "";

  if (isConnected && address && authed) {
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

  if (isConnected && address && !authed) {
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
