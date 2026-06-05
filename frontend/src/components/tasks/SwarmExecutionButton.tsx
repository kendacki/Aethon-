import { useState } from "react";
import { BrowserProvider } from "ethers";
import { useWallet } from "../../wallet/WalletContext";
import { useToast } from "../ToastProvider";
import { Button } from "../ui";

type SwarmExecutionButtonProps = {
  targetContract: string;
  executionPayload: string;
  disabled?: boolean;
};

export function SwarmExecutionButton({
  targetContract,
  executionPayload,
  disabled,
}: SwarmExecutionButtonProps) {
  const { provider, address, connect } = useWallet();
  const toast = useToast();
  const [sending, setSending] = useState(false);

  const handleExecute = async () => {
    if (!provider || !address) {
      const outcome = await connect();
      if (!outcome.ok) {
        toast.error(outcome.error);
        return;
      }
    }
    const activeProvider = provider ?? window.ethereum;
    if (!activeProvider) {
      toast.error("Connect a wallet to execute swarm calldata.");
      return;
    }

    setSending(true);
    try {
      const browser = new BrowserProvider(activeProvider as import("ethers").Eip1193Provider);
      const signer = await browser.getSigner();
      const tx = await signer.sendTransaction({
        to: targetContract,
        data: executionPayload,
      });
      toast.info("Transaction sent. Waiting for confirmation...");
      await tx.wait();
      toast.success("Transaction confirmed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <Button variant="primary" size="sm" disabled={disabled || sending} onClick={() => void handleExecute()}>
      {sending ? "Submitting..." : "Execute on-chain"}
    </Button>
  );
}
