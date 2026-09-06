/**
 * App Store Server API constants.
 * All URLs are official Apple endpoints - no credentials are stored here.
 */

/** Production App Store Server API base URL (inApps v1) */
export const APP_STORE_API_PRODUCTION =
  "https://api.storekit.itunes.apple.com/inApps/v1"

/** Sandbox App Store Server API base URL (inApps v1) */
export const APP_STORE_API_SANDBOX =
  "https://api.storekit-sandbox.itunes.apple.com/inApps/v1"

/** Production StoreKit base URL (root, for transactions endpoint) */
export const STOREKIT_PRODUCTION_BASE = "https://api.storekit.itunes.apple.com"

/** Sandbox StoreKit base URL (root) */
export const STOREKIT_SANDBOX_BASE =
  "https://api.storekit-sandbox.itunes.apple.com"

/** Production Apple public keys URL for JWT verification */
export const APPLE_PUBLIC_KEYS_URL =
  "https://api.storekit.itunes.apple.com/cert/download"

/** Sandbox Apple public keys URL for JWT verification */
export const APPLE_SANDBOX_PUBLIC_KEYS_URL =
  "https://api.storekit-sandbox.itunes.apple.com/cert/download"

/** App Store Connect API base URL */
export const APP_STORE_CONNECT_API = "https://api.appstoreconnect.apple.com/v1"
