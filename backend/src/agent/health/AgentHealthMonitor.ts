import { EventEmitter } from "events";
import { ethers } from "ethers";
import type { AgentConfig } from "../config.js";
import { HealthReporter } from "./HealthReporter.js";
import type { AgentHealthSnapshot, HealthCheck, HealthEvent, HealthStatus } from "./types.js";

const REGISTRY_ABI = [
  "function isAgentActive(address) view returns (bool)",
  "function getAgentStake(address) view returns (uint256)",
];

const MIN_BALANCE_WEI = BigInt(process.env.AGENT_MIN_BALANCE_WEI ?? "500000000000000000"); // 0.5 STT
const MAX_GAS_GWEI = BigInt(process.env.AGENT_MAX_GAS_GWEI ?? "100");
const MAX_RPC_LATENCY_MS = Number(process.env.AGENT_MAX_RPC_LATENCY_MS ?? 2000);

export class AgentHealthMonitor extends EventEmitter {
  private provider: ethers.JsonRpcProvider;
  private registry: ethers.Contract | null = null;
  private circuitBreaker: ethers.Contract | null = null;
  private interval: NodeJS.Timeout | null = null;
  private reporter = new HealthReporter();
  private startedAt = Date.now();
  private haltReasons = new Set<string>();
  private heartbeatFailures = 0;
  private lastHeartbeatAt: string | null = null;
  private tasksInFlight = 0;
  private lastRpcLatencyMs = 0;
  private lastGasPriceGwei = "0";
  private lastBalanceWei = "0";

  constructor(
    private config: AgentConfig,
    private wallet: ethers.Wallet,
  ) {
    super();
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);

    if (config.agentRegistryAddr !== ethers.ZeroAddress) {
      this.registry = new ethers.Contract(config.agentRegistryAddr, REGISTRY_ABI, this.provider);
    }
    if (config.circuitBreakerAddr !== ethers.ZeroAddress) {
      this.circuitBreaker = new ethers.Contract(
        config.circuitBreakerAddr,
        config.circuitBreakerABI,
        this.provider,
      );
      if (config.dataStreamsEnabled) {
        this.circuitBreaker.on("CircuitBroken", (failures: bigint) => {
          this.haltReasons.add("CIRCUIT_BREAK");
          this.emit("halt", {
            type: "CIRCUIT_BREAK",
            msg: `Circuit breaker ACTIVE — ${failures} consecutive failures`,
          } satisfies HealthEvent);
        });
      }
    }
  }

  start(): void {
    void this.runChecks();
    this.interval = setInterval(() => void this.runChecks(), this.config.watchdogIntervalMs);
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
    this.removeAllListeners();
  }

  getSnapshot(): AgentHealthSnapshot {
    return this.buildSnapshot(this.lastChecks);
  }

  canAcceptTasks(): boolean {
    const blocked = ["CIRCUIT_BREAK", "LOW_BALANCE", "NOT_REGISTERED", "HIGH_GAS", "HIGH_LATENCY"];
    return !blocked.some((r) => this.haltReasons.has(r));
  }

  isDegraded(): boolean {
    return this.haltReasons.has("HIGH_GAS") || this.haltReasons.has("HIGH_LATENCY") || this.heartbeatFailures >= 2;
  }

  recordHeartbeat(success: boolean): void {
    if (success) {
      this.heartbeatFailures = 0;
      this.lastHeartbeatAt = new Date().toISOString();
    } else {
      this.heartbeatFailures += 1;
    }
  }

  setTasksInFlight(count: number): void {
    this.tasksInFlight = Math.max(0, count);
  }

  incrementTasksInFlight(): void {
    this.tasksInFlight += 1;
  }

  decrementTasksInFlight(): void {
    this.tasksInFlight = Math.max(0, this.tasksInFlight - 1);
  }

  private lastChecks: HealthCheck[] = [];

  async runChecks(): Promise<AgentHealthSnapshot> {
    const prevHalt = new Set(this.haltReasons);
    this.haltReasons.clear();

    const checks = await Promise.all([
      this.checkRpcLatency(),
      this.checkGasPrice(),
      this.checkCircuitBreaker(),
      this.checkWalletBalance(),
      this.checkApiReachability(),
      this.checkOnChainRegistration(),
      this.checkHeartbeatHealth(),
    ]);

    this.lastChecks = checks;
    const snapshot = this.buildSnapshot(checks);
    this.reporter.publish(snapshot);

    for (const check of checks) {
      if (!check.ok && check.severity === "critical") {
        const reason = check.name.toUpperCase();
        this.haltReasons.add(reason === "CIRCUIT_BREAKER" ? "CIRCUIT_BREAK" : reason);
      }
      if (!check.ok && check.severity === "warning") {
        if (check.name === "gas_price") this.haltReasons.add("HIGH_GAS");
        if (check.name === "rpc_latency") this.haltReasons.add("HIGH_LATENCY");
      }
    }

    if (this.haltReasons.has("CIRCUIT_BREAK")) {
      this.emit("halt", { type: "CIRCUIT_BREAK", msg: "Circuit breaker ACTIVE — all operations halted" });
    } else if (this.haltReasons.has("LOW_BALANCE")) {
      this.emit("halt", { type: "LOW_BALANCE", msg: "Wallet balance too low for gas — pausing task intake" });
    } else if (this.haltReasons.has("NOT_REGISTERED")) {
      this.emit("halt", { type: "NOT_REGISTERED", msg: "Agent not active on registry" });
    } else {
      for (const reason of ["HIGH_GAS", "HIGH_LATENCY"]) {
        if (this.haltReasons.has(reason)) {
          this.emit("warning", {
            type: reason,
            msg: reason === "HIGH_GAS" ? "Gas price elevated — task intake paused" : "RPC latency elevated",
          });
        }
      }
      const recovered = [...prevHalt].filter((r) => !this.haltReasons.has(r));
      if (recovered.length > 0) {
        this.emit("recovered", { type: "RECOVERED", msg: `Conditions cleared: ${recovered.join(", ")}` });
      }
    }

    return snapshot;
  }

  private buildSnapshot(checks: HealthCheck[]): AgentHealthSnapshot {
    const hasCritical = checks.some((c) => !c.ok && c.severity === "critical");
    const hasWarning = checks.some((c) => !c.ok && c.severity === "warning");
    let status: HealthStatus = "HEALTHY";
    if (hasCritical) status = "HALTED";
    else if (hasWarning || this.heartbeatFailures >= 2) status = "DEGRADED";

    return {
      status,
      agentType: this.config.agentType,
      address: this.wallet.address,
      halted: hasCritical,
      haltReasons: [...this.haltReasons],
      checks,
      metrics: {
        rpcLatencyMs: this.lastRpcLatencyMs,
        gasPriceGwei: this.lastGasPriceGwei,
        walletBalanceWei: this.lastBalanceWei,
        tasksInFlight: this.tasksInFlight,
        heartbeatFailures: this.heartbeatFailures,
        lastHeartbeatAt: this.lastHeartbeatAt,
        uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      },
      updatedAt: new Date().toISOString(),
    };
  }

  private async checkRpcLatency(): Promise<HealthCheck> {
    const t0 = Date.now();
    try {
      await this.provider.getBlockNumber();
      this.lastRpcLatencyMs = Date.now() - t0;
      const ok = this.lastRpcLatencyMs <= MAX_RPC_LATENCY_MS;
      return this.check("rpc_latency", ok, ok ? "info" : "warning", ok
        ? `RPC responsive (${this.lastRpcLatencyMs}ms)`
        : `RPC latency ${this.lastRpcLatencyMs}ms — above ${MAX_RPC_LATENCY_MS}ms threshold`, this.lastRpcLatencyMs);
    } catch (err) {
      return this.check("rpc_latency", false, "critical", err instanceof Error ? err.message : "RPC unreachable");
    }
  }

  private async checkGasPrice(): Promise<HealthCheck> {
    try {
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice ?? 0n;
      this.lastGasPriceGwei = ethers.formatUnits(gasPrice, "gwei");
      const ok = gasPrice <= ethers.parseUnits(String(MAX_GAS_GWEI), "gwei");
      return this.check("gas_price", ok, ok ? "info" : "warning", ok
        ? `Gas ${this.lastGasPriceGwei} gwei`
        : `Gas ${this.lastGasPriceGwei} gwei exceeds ${MAX_GAS_GWEI} gwei`, this.lastGasPriceGwei);
    } catch (err) {
      return this.check("gas_price", false, "warning", err instanceof Error ? err.message : "Gas check failed");
    }
  }

  private async checkCircuitBreaker(): Promise<HealthCheck> {
    if (!this.circuitBreaker) {
      return this.check("circuit_breaker", true, "info", "Circuit breaker not configured");
    }
    try {
      const paused = await this.circuitBreaker.isPaused();
      return this.check("circuit_breaker", !paused, paused ? "critical" : "info", paused
        ? "Circuit breaker is PAUSED"
        : "Circuit breaker open");
    } catch (err) {
      return this.check("circuit_breaker", false, "warning", err instanceof Error ? err.message : "CB check failed");
    }
  }

  private async checkWalletBalance(): Promise<HealthCheck> {
    try {
      const balance = await this.provider.getBalance(this.wallet.address);
      this.lastBalanceWei = balance.toString();
      const ok = balance >= MIN_BALANCE_WEI;
      return this.check("wallet_balance", ok, ok ? "info" : "critical", ok
        ? `Balance ${ethers.formatEther(balance)} STT`
        : `Balance ${ethers.formatEther(balance)} STT below minimum ${ethers.formatEther(MIN_BALANCE_WEI)} STT`, this.lastBalanceWei);
    } catch (err) {
      return this.check("wallet_balance", false, "warning", err instanceof Error ? err.message : "Balance check failed");
    }
  }

  private async checkApiReachability(): Promise<HealthCheck> {
    const base = this.config.apiBaseUrl.replace(/\/+$/, "");
    try {
      const res = await fetch(`${base}/health/live`, { signal: AbortSignal.timeout(5000) });
      const ok = res.ok;
      return this.check("api_reachable", ok, ok ? "info" : "warning", ok ? "API reachable" : `API returned ${res.status}`);
    } catch (err) {
      return this.check("api_reachable", false, "warning", err instanceof Error ? err.message : "API unreachable");
    }
  }

  private async checkOnChainRegistration(): Promise<HealthCheck> {
    if (!this.registry || this.config.agentRegistryAddr === ethers.ZeroAddress) {
      return this.check("on_chain_registration", true, "info", "Registry not configured — skipped");
    }
    try {
      const active = await this.registry.isAgentActive(this.wallet.address);
      const stake = await this.registry.getAgentStake(this.wallet.address);
      return this.check("on_chain_registration", active, active ? "info" : "critical", active
        ? `Registered, stake ${ethers.formatEther(stake)} STT`
        : "Agent not active on registry", { active, stakeWei: stake.toString() });
    } catch (err) {
      return this.check("on_chain_registration", false, "warning", err instanceof Error ? err.message : "Registry check failed");
    }
  }

  private checkHeartbeatHealth(): HealthCheck {
    const ok = this.heartbeatFailures < 3;
    return this.check("heartbeat", ok, ok ? "info" : "warning", ok
      ? `Heartbeats healthy (${this.heartbeatFailures} recent failures)`
      : `${this.heartbeatFailures} consecutive heartbeat failures`, this.heartbeatFailures);
  }

  private check(
    name: string,
    ok: boolean,
    severity: HealthCheck["severity"],
    message: string,
    value?: unknown,
  ): HealthCheck {
    return { name, ok, severity, message, value, updatedAt: new Date().toISOString() };
  }
}
