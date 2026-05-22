import { EventEmitter } from "events";
import { ethers } from "ethers";
import type { AgentConfig } from "./config.js";

export class Watchdog extends EventEmitter {
  private provider: ethers.JsonRpcProvider;
  private circuitBreaker: ethers.Contract;
  private interval: NodeJS.Timeout | null = null;

  constructor(private config: AgentConfig) {
    super();
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(config.privateKey, this.provider);
    this.circuitBreaker = new ethers.Contract(
      config.circuitBreakerAddr,
      config.circuitBreakerABI,
      wallet
    );

    if (config.dataStreamsEnabled && config.circuitBreakerAddr !== ethers.ZeroAddress) {
      this.circuitBreaker.on("CircuitBroken", (failures: bigint) => {
        this.emit("halt", {
          type: "CIRCUIT_BREAK",
          msg: `Circuit breaker ACTIVE — ${failures} consecutive failures`,
        });
      });
    }
  }

  start(): void {
    this.interval = setInterval(async () => {
      await this.checkGasPrice();
      await this.checkCircuitBreaker();
      await this.checkLatency();
    }, this.config.watchdogIntervalMs);
  }

  private async checkGasPrice(): Promise<void> {
    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? 0n;
    if (gasPrice > ethers.parseUnits("100", "gwei")) {
      this.emit("warning", {
        type: "HIGH_GAS",
        value: ethers.formatUnits(gasPrice, "gwei"),
        msg: "Gas price exceeded 100 gwei — pausing task intake",
      });
    }
  }

  private async checkCircuitBreaker(): Promise<void> {
    if (this.config.circuitBreakerAddr === ethers.ZeroAddress) return;
    const paused = await this.circuitBreaker.isPaused();
    if (paused) {
      this.emit("halt", {
        type: "CIRCUIT_BREAK",
        msg: "Circuit breaker ACTIVE — all operations halted",
      });
    }
  }

  private async checkLatency(): Promise<void> {
    const t0 = Date.now();
    await this.provider.getBlockNumber();
    const latency = Date.now() - t0;
    if (latency > 2000) {
      this.emit("warning", {
        type: "HIGH_LATENCY",
        value: latency,
        msg: `RPC latency ${latency}ms — above 2s threshold`,
      });
    }
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
    this.removeAllListeners();
  }
}
