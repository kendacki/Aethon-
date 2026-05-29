import { env } from "../config/env";

export const SOMNIA_CHAIN_ID = env.somniaChainId;

/** EIP-3085 chainId hex (0x-prefixed). */
export const SOMNIA_CHAIN_HEX = `0x${BigInt(SOMNIA_CHAIN_ID).toString(16)}`;

const rpcUrls = Array.from(
  new Set(
    [
      env.somniaRpcUrl,
      "https://dream-rpc.somnia.network",
      "https://api.infra.testnet.somnia.network",
    ].filter(Boolean),
  ),
);

export const SOMNIA_CHAIN = {
  chainId: SOMNIA_CHAIN_HEX,
  chainName: "Somnia Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls,
  blockExplorerUrls: env.somniaExplorer ? [env.somniaExplorer] : ["https://shannon-explorer.somnia.network"],
};
