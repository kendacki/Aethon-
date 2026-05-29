import { env } from "../config/env";

export const SOMNIA_CHAIN_ID = env.somniaChainId;

/** EIP-3085 chainId hex (0x prefixed, no leading zeros stripped incorrectly). */
export const SOMNIA_CHAIN_HEX = `0x${BigInt(SOMNIA_CHAIN_ID).toString(16)}`;

export const SOMNIA_CHAIN = {
  chainId: SOMNIA_CHAIN_HEX,
  chainName: "Somnia Shannon Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: [env.somniaRpcUrl],
  blockExplorerUrls: env.somniaExplorer ? [env.somniaExplorer] : [],
};
