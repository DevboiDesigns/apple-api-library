/**
 * StoreKit configuration.
 * Credentials are loaded from environment variables - never hardcoded.
 * Supports multiple env var naming conventions for compatibility.
 */

import fs from "fs"

/** Environment variable names supported for StoreKit config */
const ENV_KEYS = {
  // Primary (package convention)
  KEY_ID: "APP_STORE_KIT_KEY_ID",
  ISSUER_ID: "APP_STORE_ISSUER_ID",
  BUNDLE_ID: "APP_STORE_BUNDLE_ID",
  PRIVATE_KEY: "APP_STORE_KIT_KEY",
  // Alternative (common convention)
  ALT_KEY_ID: "APPLE_KEY_ID",
  ALT_ISSUER_ID: "APPLE_ISSUER_ID",
  ALT_BUNDLE_ID: "APPLE_APP_BUNDLE_ID",
  ALT_PRIVATE_KEY: "APPLE_PRIVATE_KEY_PATH",
} as const

/**
 * Resolve StoreKit config from environment.
 * Uses APP_STORE_* vars first, falls back to APPLE_* vars.
 */
export function getStoreKitConfigFromEnv(): {
  keyId: string
  issuerId: string
  bundleId: string
  privateKey: string
  privateKeyIsPath: boolean
} {
  const keyId =
    process.env[ENV_KEYS.KEY_ID] || process.env[ENV_KEYS.ALT_KEY_ID] || ""
  const issuerId =
    process.env[ENV_KEYS.ISSUER_ID] || process.env[ENV_KEYS.ALT_ISSUER_ID] || ""
  const bundleId =
    process.env[ENV_KEYS.BUNDLE_ID] || process.env[ENV_KEYS.ALT_BUNDLE_ID] || ""
  const privateKeyRaw =
    process.env[ENV_KEYS.PRIVATE_KEY] || process.env[ENV_KEYS.ALT_PRIVATE_KEY] || ""

  if (!keyId || !issuerId || !bundleId || !privateKeyRaw) {
    throw new Error(
      "StoreKit config incomplete. Set APP_STORE_KIT_KEY_ID, APP_STORE_ISSUER_ID, APP_STORE_BUNDLE_ID, and APP_STORE_KIT_KEY (or APPLE_* equivalents)."
    )
  }

  let privateKey = privateKeyRaw
  const appIsLocal = process.env.APP_IS_LOCAL === "true"
  const privateKeyIsPath = appIsLocal && !privateKeyRaw.includes("-----BEGIN")

  if (privateKeyIsPath) {
    try {
      privateKey = fs.readFileSync(privateKeyRaw, "utf8")
    } catch (err) {
      throw new Error(
        `Failed to read StoreKit private key from path: ${privateKeyRaw}. ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  return {
    keyId,
    issuerId,
    bundleId,
    privateKey,
    privateKeyIsPath,
  }
}
