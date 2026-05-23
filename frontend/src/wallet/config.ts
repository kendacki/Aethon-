export const SOMNIA_CHAIN_ID = Number(import.meta.env.VITE_SOMNIA_CHAIN_ID ?? 50312);

export const SOMNIA_CHAIN_HEX = `0x${SOMNIA_CHAIN_ID.toString(16)}`;

export const SOMNIA_CHAIN = {
  chainId: SOMNIA_CHAIN_HEX,
  chainName: "Somnia Shannon Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: [import.meta.env.VITE_SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network"],
  blockExplorerUrls: [import.meta.env.VITE_SOMNIA_EXPLORER ?? "https://shannon-explorer.somnia.network"],
};
