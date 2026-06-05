import type { TaskPayload } from "../../shared/taskPayload.js";
import { fetchSpotQuote, type SpotQuote } from "./http.js";
import { enrichSkillData } from "./meta.js";
import { skillFail, skillOk, type SkillExecutor } from "./types.js";

const SANITY_BOUNDS: Record<string, { min: number; max: number }> = {
  bitcoin: { min: 1_000, max: 500_000 },
  ethereum: { min: 100, max: 50_000 },
  somnia: { min: 0.001, max: 100 },
  solana: { min: 1, max: 10_000 },
  "usd-coin": { min: 0.95, max: 1.05 },
  tether: { min: 0.95, max: 1.05 },
};

const COINGECKO_SIMPLE_PRICE = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";

export const executeOracle: SkillExecutor = async (payload, ctx) => {
  if (payload.action !== "fetch_price" && payload.action !== "swarm_execute") {
    return skillFail("ORACLE", payload.action, `Unknown action: ${payload.action}`);
  }

  try {
    const asset = String(payload.params.asset ?? "ethereum");
    const currency = String(payload.params.currency ?? "usd");
    const maxStalenessSec = Number(payload.params.maxStalenessSec ?? 120);

    let quote = await fetchSpotQuote(asset);
    const coingeckoUrl =
      asset === "ethereum"
        ? COINGECKO_SIMPLE_PRICE
        : `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(asset)}&vs_currencies=${encodeURIComponent(currency)}`;
    if (ctx.somnia && process.env.ORACLE_PREFER_SOMNIA === "true") {
      try {
        const selector = `${asset}.${currency}`;
        const price = await ctx.somnia.fetchJsonUint(coingeckoUrl, selector, 8);
        quote = {
          price,
          source: "somnia_json_api",
          fetchedAt: Math.floor(Date.now() / 1000),
          apiUrl: coingeckoUrl,
        };
      } catch (err) {
        console.warn("[ORACLE] Somnia JSON API unavailable, using HTTP quote:", err);
      }
    }
    const ageSec = Math.floor(Date.now() / 1000) - quote.fetchedAt;
    const stale = ageSec > maxStalenessSec;

    const bounds = SANITY_BOUNDS[asset];
    if (bounds && (quote.price < bounds.min || quote.price > bounds.max)) {
      return skillFail("ORACLE", payload.action, `Price ${quote.price} outside sanity bounds for ${asset}`);
    }

    const attestation = {
      asset,
      currency,
      price: quote.price,
      fetchedAt: quote.fetchedAt,
      source: quote.source,
      agent: ctx.agentAddress,
      maxStalenessSec,
      ageSec,
    };
    const digest = JSON.stringify(attestation);
    const signature = await ctx.signMessage(digest);

    const confidence =
      quote.source === "somnia_json_api"
        ? 0.98
        : quote.source === "coingecko" && !stale
          ? 0.95
          : quote.source === "fallback_table"
            ? 0.6
            : 0.75;

    const criteriaMet = !stale && confidence >= 0.7;

    return skillOk(
      "ORACLE",
      payload.action,
      enrichSkillData("ORACLE", payload, {
        ...attestation,
        attestation: digest,
        signature,
        stale,
        confidence: Number(confidence.toFixed(2)),
        quality: stale
          ? "DEGRADED"
          : quote.source === "somnia_json_api"
            ? "SOMNIA_CONSENSUS"
            : quote.source === "coingecko"
              ? "PRIMARY"
              : "FALLBACK",
      }, criteriaMet),
    );
  } catch (err) {
    return skillFail("ORACLE", payload.action, err instanceof Error ? err.message : "Oracle fetch failed");
  }
};
