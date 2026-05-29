import { SOMNIA_CHAIN, SOMNIA_CHAIN_HEX, SOMNIA_CHAIN_ID } from "./config";
import type { EthereumProvider } from "./provider";

export function parseChainId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, trimmed.startsWith("0x") ? 16 : 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "bigint") return Number(value);
  return null;
}

export function isSomniaChain(chainId: number | null | undefined): boolean {
  return chainId === SOMNIA_CHAIN_ID;
}

export async function readChainId(ethereum: EthereumProvider): Promise<number | null> {
  try {
    const hex = (await ethereum.request({ method: "eth_chainId" })) as string;
    return parseChainId(hex);
  } catch {
    return null;
  }
}

function walletErrorCode(err: unknown): number | undefined {
  return (err as { code?: number })?.code;
}

function walletErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Unknown wallet error";
}

async function switchToSomnia(ethereum: EthereumProvider): Promise<void> {
  await ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: SOMNIA_CHAIN_HEX }],
  });
}

async function addSomniaNetwork(ethereum: EthereumProvider): Promise<void> {
  await ethereum.request({
    method: "wallet_addEthereumChain",
    params: [SOMNIA_CHAIN],
  });
}

/** Ensure MetaMask is on Somnia (50312). Skips prompts when already connected to the right chain. */
export async function ensureSomniaNetwork(ethereum: EthereumProvider): Promise<void> {
  let chainId = await readChainId(ethereum);
  if (isSomniaChain(chainId)) return;

  try {
    await switchToSomnia(ethereum);
  } catch (err) {
    const code = walletErrorCode(err);
    if (code === 4001) {
      throw new Error("Network switch rejected in wallet.");
    }

    chainId = await readChainId(ethereum);
    if (isSomniaChain(chainId)) return;

    if (code === 4902) {
      try {
        await addSomniaNetwork(ethereum);
      } catch (addErr) {
        if (walletErrorCode(addErr) === 4001) {
          throw new Error("Add network rejected in wallet.");
        }
      }
      try {
        await switchToSomnia(ethereum);
      } catch (switchErr) {
        chainId = await readChainId(ethereum);
        if (isSomniaChain(chainId)) return;
        if (walletErrorCode(switchErr) === 4001) {
          throw new Error("Network switch rejected in wallet.");
        }
        throw new Error(`Could not switch to Somnia (chain ${SOMNIA_CHAIN_ID}). ${walletErrorMessage(switchErr)}`);
      }
      return;
    }

    // Chain may exist under a different name/RPC — try add then switch.
    try {
      await addSomniaNetwork(ethereum);
    } catch (addErr) {
      if (walletErrorCode(addErr) === 4001) {
        throw new Error("Add network rejected in wallet.");
      }
    }

    try {
      await switchToSomnia(ethereum);
    } catch (switchErr) {
      chainId = await readChainId(ethereum);
      if (isSomniaChain(chainId)) return;
      if (walletErrorCode(switchErr) === 4001) {
        throw new Error("Network switch rejected in wallet.");
      }
      throw new Error(`Could not switch to Somnia (chain ${SOMNIA_CHAIN_ID}). ${walletErrorMessage(switchErr)}`);
    }
  }

  chainId = await readChainId(ethereum);
  if (!isSomniaChain(chainId)) {
    throw new Error(`Switch to Somnia (chain ${SOMNIA_CHAIN_ID}) in MetaMask, then try again.`);
  }
}
