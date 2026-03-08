/**
 * App Store Server Notifications V2 - JWT verification and signed data decoding.
 * Verifies and decodes notification payloads and signed transaction/renewal info.
 */

import jwt from "jsonwebtoken"
import jwkToPem from "jwk-to-pem"
import axios from "axios"
import type {
  AppStoreNotificationV2,
  SignedTransaction,
  SignedRenewalInfo,
} from "../types"
import {
  APPLE_PUBLIC_KEYS_URL,
  APPLE_SANDBOX_PUBLIC_KEYS_URL,
} from "../constants/storekit.constants"

interface CachedKeys {
  keys: Array<{ kid: string; [key: string]: unknown }>
  expiresAt: Date
}

/**
 * Verifies and decodes App Store Server Notifications V2.
 * Fetches and caches Apple's public keys for JWT verification.
 */
export class AppStoreNotificationVerifier {
  private static keysCache: CachedKeys | null = null

  /**
   * Verify and decode an App Store Server Notification V2 JWT.
   * Returns the decoded payload or null if verification fails.
   */
  async verifyAndDecodeNotification(
    jwtToken: string
  ): Promise<AppStoreNotificationV2 | null> {
    try {
      const decodedHeader = jwt.decode(jwtToken, { complete: true })?.header as
        | { kid?: string; x5c?: string[] }
        | undefined

      if (!decodedHeader) {
        return null
      }

      let decoded: AppStoreNotificationV2

      if (decodedHeader.kid) {
        const publicKey = await this.getApplePublicKey(decodedHeader.kid)
        if (!publicKey) {
          return null
        }
        decoded = jwt.verify(jwtToken, publicKey, {
          algorithms: ["ES256"],
        }) as AppStoreNotificationV2
      } else if (decodedHeader.x5c?.length) {
        const certDer = decodedHeader.x5c[0]
        const certPem = `-----BEGIN CERTIFICATE-----\n${certDer}\n-----END CERTIFICATE-----`
        decoded = jwt.verify(jwtToken, certPem, {
          algorithms: ["ES256"],
        }) as AppStoreNotificationV2
      } else {
        return null
      }

      return decoded
    } catch {
      return null
    }
  }

  /**
   * Decode and verify signed transaction or renewal info from a notification.
   */
  async decodeSignedData<T extends SignedTransaction | SignedRenewalInfo>(
    signedData: string,
    type: "transaction" | "renewal"
  ): Promise<T | null> {
    try {
      const decodedHeader = jwt.decode(signedData, { complete: true })?.header as
        | { kid?: string; x5c?: string[] }
        | undefined

      if (!decodedHeader) {
        return null
      }

      let decoded: T

      if (decodedHeader.kid) {
        const publicKey = await this.getApplePublicKey(decodedHeader.kid)
        if (!publicKey) {
          return null
        }
        decoded = jwt.verify(signedData, publicKey, {
          algorithms: ["ES256"],
        }) as T
      } else if (decodedHeader.x5c?.length) {
        const certDer = decodedHeader.x5c[0]
        const certPem = `-----BEGIN CERTIFICATE-----\n${certDer}\n-----END CERTIFICATE-----`
        decoded = jwt.verify(signedData, certPem, {
          algorithms: ["ES256"],
        }) as T
      } else {
        return null
      }

      return decoded
    } catch {
      return null
    }
  }

  /**
   * Fetch Apple's public key by key ID.
   * Caches keys for 24 hours.
   */
  async getApplePublicKey(keyId: string): Promise<string | null> {
    const now = new Date()
    if (
      AppStoreNotificationVerifier.keysCache &&
      AppStoreNotificationVerifier.keysCache.expiresAt > now
    ) {
      const cached = AppStoreNotificationVerifier.keysCache.keys.find(
        (k) => k.kid === keyId
      )
      if (cached) {
        return jwkToPem(cached)
      }
    }

    try {
      const response = await axios.get<{ keys: Array<{ kid: string }> }>(
        APPLE_PUBLIC_KEYS_URL
      )
      const { keys } = response.data

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 1)
      AppStoreNotificationVerifier.keysCache = { keys, expiresAt }

      const key = keys.find((k) => k.kid === keyId)
      if (key) {
        return jwkToPem(key)
      }

      const sandboxResponse = await axios.get<{
        keys: Array<{ kid: string }>
      }>(APPLE_SANDBOX_PUBLIC_KEYS_URL)
      const sandboxKey = sandboxResponse.data.keys.find((k) => k.kid === keyId)
      if (sandboxKey) {
        return jwkToPem(sandboxKey)
      }

      return null
    } catch {
      return null
    }
  }

  /** Clear the public keys cache (e.g. for testing) */
  static clearKeysCache(): void {
    AppStoreNotificationVerifier.keysCache = null
  }
}
