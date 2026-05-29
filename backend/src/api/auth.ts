import { Router } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { SiweMessage } from "siwe";
import { z } from "zod";
import { consumeNonce, issueNonce, purgeExpiredNonces } from "../services/nonceStore.js";
import { JWT_SECRET } from "./authenticateToken.js";

export const authRouter = Router();

const JWT_EXPIRES = process.env.JWT_EXPIRES_IN ?? "24h";
function parseAllowedList(raw: string | undefined): string[] | null {
  if (!raw?.trim()) return null;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

const ALLOWED_SIWE_DOMAINS = parseAllowedList(process.env.SIWE_DOMAIN);
const ALLOWED_SIWE_URIS = parseAllowedList(process.env.SIWE_URI);

authRouter.get("/nonce", (req, res) => {
  purgeExpiredNonces();
  const address = typeof req.query.address === "string" ? req.query.address : undefined;

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    res.status(400).json({ error: "Query param address (0x…) is required" });
    return;
  }

  const nonce = issueNonce(address);
  res.json({ data: { nonce, address: address.toLowerCase() } });
});

const verifySchema = z.object({
  message: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

authRouter.post("/verify", async (req, res, next) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const siweMessage = new SiweMessage(parsed.data.message);
    const fields = await siweMessage.verify({ signature: parsed.data.signature });

    const expectedChainId = Number(process.env.SOMNIA_CHAIN_ID ?? 50312);
    if (Number(fields.data.chainId) !== expectedChainId) {
      return res.status(401).json({ error: `Invalid chain. Expected Somnia chain ${expectedChainId}.` });
    }

    if (ALLOWED_SIWE_DOMAINS && !ALLOWED_SIWE_DOMAINS.includes(fields.data.domain)) {
      return res.status(401).json({ error: "Invalid SIWE domain" });
    }

    if (ALLOWED_SIWE_URIS && !ALLOWED_SIWE_URIS.includes(fields.data.uri)) {
      return res.status(401).json({ error: "Invalid SIWE uri" });
    }

    const address = fields.data.address.toLowerCase();
    if (!consumeNonce(address, fields.data.nonce)) {
      return res.status(401).json({ error: "Invalid or expired nonce. Request a new nonce." });
    }

    const signOptions: SignOptions = { expiresIn: JWT_EXPIRES as SignOptions["expiresIn"] };
    const token = jwt.sign({ address }, JWT_SECRET, signOptions);

    res.json({
      data: {
        token,
        address,
        expiresIn: JWT_EXPIRES,
      },
    });
  } catch (err) {
    next(err);
  }
});
