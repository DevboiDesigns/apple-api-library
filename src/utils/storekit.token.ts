/**
 * StoreKit JWT token generator for App Store Server API v1.
 * Used for subscription verification and transaction lookups.
 */

import { sign, SignOptions } from "jsonwebtoken"
import { getStoreKitConfigFromEnv } from "../config/storekit.config"
import type { StoreKitConfig } from "../types"

/** Generate a JWT token for App Store Server API (StoreKit v1) */
export function generateStoreKitToken(config?: StoreKitConfig): string {
  const cfg = config ?? getStoreKitConfigFromEnv()

  const payload = {
    iss: cfg.issuerId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 20 * 60,
    aud: "appstoreconnect-v1",
    bid: cfg.bundleId,
  }

  const options: SignOptions = {
    header: {
      alg: "ES256",
      kid: cfg.keyId,
      typ: "JWT",
    },
  }

  return sign(payload, cfg.privateKey, options)
}
