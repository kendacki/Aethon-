import { SiweMessage } from "siwe";
import { getAddress, type JsonRpcSigner } from "ethers";
import { env } from "../config/env";
import { setAuthToken } from "./token";

export class Web3AuthError extends Error {
  constructor(
    message: string,
    readonly code?: "WALLET_REJECTED" | "RATE_LIMIT" | "VERIFY_FAILED" | "NETWORK" | "WRONG_CHAIN",
  ) {
    super(message);
    this.name = "Web3AuthError";
  }
}

async function parseApiError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string | { message?: string } };
    if (typeof body.error === "string") return body.error;
    if (body.error && typeof body.error === "object" && "message" in body.error) {
      return String(body.error.message);
    }
  } catch {
    /* ignore */
  }
  return `Request failed (${res.status})`;
}

function siweDomain(): string {
  return env.siweDomain ?? window.location.host;
}

function siweUri(): string {
  return env.siweUri ?? window.location.origin;
}

export async function signInWithSomnia(signer: JsonRpcSigner, address: string): Promise<string> {
  const checksummed = getAddress(address);
  const normalized = checksummed.toLowerCase();

  const network = await signer.provider?.getNetwork();
  const walletChainId = network ? Number(network.chainId) : null;
  if (walletChainId !== null && walletChainId !== env.somniaChainId) {
    throw new Web3AuthError(
      `Wrong network. Switch to Somnia Shannon Testnet (chain ${env.somniaChainId}).`,
      "WRONG_CHAIN",
    );
  }

  let nonceRes: Response;
  try {
    nonceRes = await fetch(`${env.apiBase}/auth/nonce?address=${normalized}`);
  } catch {
    throw new Web3AuthError("Unable to reach authentication server.", "NETWORK");
  }

  if (nonceRes.status === 429) {
    throw new Web3AuthError("Too many sign in attempts. Please wait a minute.", "RATE_LIMIT");
  }
  if (!nonceRes.ok) {
    throw new Web3AuthError(await parseApiError(nonceRes), "VERIFY_FAILED");
  }

  const { data } = (await nonceRes.json()) as { data: { nonce: string } };

  const message = new SiweMessage({
    domain: siweDomain(),
    address: checksummed,
    statement: "Sign in to AETHON to submit tasks and use the app.",
    uri: siweUri(),
    version: "1",
    chainId: env.somniaChainId,
    nonce: data.nonce,
  });

  const prepared = message.prepareMessage();

  let signature: string;
  try {
    signature = await signer.signMessage(prepared);
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 4001) {
      throw new Web3AuthError("Signature request rejected in wallet.", "WALLET_REJECTED");
    }
    throw new Web3AuthError(err instanceof Error ? err.message : "Wallet signing failed.", "WALLET_REJECTED");
  }

  let verifyRes: Response;
  try {
    verifyRes = await fetch(`${env.apiBase}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prepared, signature }),
    });
  } catch {
    throw new Web3AuthError("Unable to verify signature with server.", "NETWORK");
  }

  if (verifyRes.status === 429) {
    throw new Web3AuthError("Too many verification attempts. Please wait a minute.", "RATE_LIMIT");
  }
  if (!verifyRes.ok) {
    throw new Web3AuthError(await parseApiError(verifyRes), "VERIFY_FAILED");
  }

  const verifyBody = (await verifyRes.json()) as { data: { token: string } };
  setAuthToken(verifyBody.data.token);
  return verifyBody.data.token;
}
