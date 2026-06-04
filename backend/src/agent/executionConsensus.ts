import { ethers } from "ethers";
import type { SkillResult } from "./skills/types.js";

export type ExecutionConsensus = {
  proceed: boolean;
  targetContract: string;
  executionPayload: string;
  summary: string;
};

const SWAP_IFACE = new ethers.Interface([
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)",
]);

type SkillRow = { agentType: string; result: SkillResult };

function roleData(results: SkillRow[], role: string): Record<string, unknown> | undefined {
  const row = results.find((r) => r.agentType === role);
  if (!row?.result?.data) return undefined;
  return row.result.data as Record<string, unknown>;
}

/**
 * Compile swarm consensus into executable calldata when ARBITRAGE + RISK_MGMT approve.
 * Additive — does not replace advisory skill outputs.
 */
export function compileExecutionConsensus(results: SkillRow[]): ExecutionConsensus | null {
  const arb = roleData(results, "ARBITRAGE");
  const risk = roleData(results, "RISK_MGMT");
  const oracle = roleData(results, "ORACLE");

  const arbProceed = arb?.proceed === true || arb?.profitable === true;
  const riskProceed =
    risk?.proceed === true ||
    (typeof risk?.compositeScore === "number" &&
      (risk.compositeScore as number) >= 70 &&
      risk?.circuitPaused !== true);

  if (!arbProceed || !riskProceed) {
    return null;
  }

  const router =
    process.env.SWARM_EXECUTION_ROUTER_ADDR ??
    process.env.AETHON_FLEET_VAULT_ADDR ??
    process.env.SWARM_EXECUTION_TARGET_ADDR;
  if (!router?.startsWith("0x")) {
    return null;
  }

  const notionalEth = Number(arb?.notionalEth ?? 0.01);
  const amountIn = ethers.parseEther(String(Math.max(0.001, notionalEth)));
  const refUsd = Number(oracle?.price ?? arb?.referenceUsd ?? 0);
  const slippageBps = Number(arb?.slippageBps ?? 50);
  const amountOutMin =
    refUsd > 0
      ? BigInt(
          Math.floor(
            notionalEth * refUsd * (1 - slippageBps / 10_000) * 1e6,
          ),
        )
      : 0n;

  const weth = process.env.SWARM_WETH_ADDR ?? ethers.ZeroAddress;
  const stable = process.env.SWARM_STABLE_ADDR ?? ethers.ZeroAddress;
  const path = weth !== ethers.ZeroAddress && stable !== ethers.ZeroAddress ? [weth, stable] : [router, router];
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const to = process.env.SWARM_EXECUTION_RECIPIENT_ADDR ?? router;

  const executionPayload = SWAP_IFACE.encodeFunctionData("swapExactTokensForTokens", [
    amountIn,
    amountOutMin,
    path,
    to,
    deadline,
  ]);

  return {
    proceed: true,
    targetContract: router,
    executionPayload,
    summary: `Consensus swap ${ethers.formatEther(amountIn)} ETH → stable (minOut ${amountOutMin}, spread ${arb?.spreadBps ?? "?"} bps)`,
  };
}
