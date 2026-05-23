import { Button } from "./ui";
import { shortAddr } from "../api/client";
import { useWallet } from "../wallet/WalletContext";

export function ConnectButton() {
  const { address, connecting, isConnected, connect, disconnect } = useWallet();

  if (isConnected && address) {
    return (
      <Button variant="outline" size="sm" onClick={disconnect} title="Disconnect wallet">
        {shortAddr(address)}
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={() => void connect()} disabled={connecting}>
      {connecting ? "Connecting..." : "Connect"}
    </Button>
  );
}
