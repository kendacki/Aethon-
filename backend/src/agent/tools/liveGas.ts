import type { Provider } from "ethers";

const DEFAULT_SWAP_GAS_LIMIT = 380_000n;

export type GasEstimate = {
  gasLimit: bigint;
  gasPriceWei: bigint;
  totalCostWei: bigint;
  source: "live_fee_data" | "fallback_estimate";
};

export async function estimateSwapGasCost(provider: Provider): Promise<GasEstimate> {
  try {
    const feeData = await provider.getFeeData();
    const gasPriceWei = feeData.gasPrice ?? feeData.maxFeePerGas ?? 22_000_000_000n;
    return {
      gasLimit: DEFAULT_SWAP_GAS_LIMIT,
      gasPriceWei,
      totalCostWei: DEFAULT_SWAP_GAS_LIMIT * gasPriceWei,
      source: "live_fee_data",
    };
  } catch {
    const gasPriceWei = 22_000_000_000n;
    return {
      gasLimit: DEFAULT_SWAP_GAS_LIMIT,
      gasPriceWei,
      totalCostWei: DEFAULT_SWAP_GAS_LIMIT * gasPriceWei,
      source: "fallback_estimate",
    };
  }
}
