import { useState } from "react";
import { BrowserProvider } from "ethers";
import { Button } from "./ui";
import { shortAddr } from "../api/client";
import { signInWithSomnia, Web3AuthError } from "../auth/web3Auth";
import { clearAuthToken, getAuthToken } from "../auth/token";
import { useWallet } from "../wallet/WalletContext";
import { Notification } from "./Layout";

async function signInFromWallet(): Promise<void> {
  const eth = window.ethereum;
  if (!eth) throw new Web3AuthError("No wallet found.", "WALLET_REJECTED");
  const provider = new BrowserProvider(eth);
  const walletSigner = await provider.getSigner();
  const active = await walletSigner.getAddress();
  await signInWithSomnia(walletSigner, active);
}

export function ConnectButton() {
  const { address, connecting, isConnected, isCorrectChain, connect, disconnect } = useWallet();
  const [signingIn, setSigningIn] = useState(false);
  const [toast, setToast] = useState("");

  const handleConnect = async () => {
    setToast("");
    try {
      if (!isConnected) await connect();
      setSigningIn(true);
      await signInFromWallet();
    } catch (err) {
      if (err instanceof Web3AuthError) {
        setToast(err.message);
      } else if (err instanceof Error) {
        setToast(err.message);
      } else {
        setToast("Sign in failed.");
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

  if (isConnected && address && authed) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={handleDisconnect} title="Disconnect wallet">
          {shortAddr(address)}
          {!isCorrectChain ? " · wrong network" : ""}
        </Button>
        <Notification message={toast} onClose={() => setToast("")} />
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleConnect()}
        disabled={connecting || signingIn}
      >
        {connecting ? "Connecting..." : signingIn ? "Sign in..." : isConnected ? "Sign in" : "Connect"}
      </Button>
      <Notification message={toast} onClose={() => setToast("")} />
    </>
  );
}
