/**
 * App Store Server API v1 - Subscription verification and transaction lookup.
 */

import { decode } from "jsonwebtoken"
import axios from "axios"
import type {
  AppleSignedTransactionInfo,
  AppleSignedTransactionInfoWithIsoDates,
  AppleSubscriptionStatusResponse,
  VerifiedSubscriptionResult,
} from "../types"
import { generateStoreKitToken } from "../utils/storekit.token"
import { getStoreKitConfigFromEnv } from "../config/storekit.config"
import type { StoreKitConfig } from "../types"
import {
  STOREKIT_PRODUCTION_BASE,
  STOREKIT_SANDBOX_BASE,
} from "../constants/storekit.constants"

export interface SubscriptionServiceConfig {
  /** Optional custom config. If not provided, uses env vars. */
  storeKitConfig?: StoreKitConfig
  /**
   * Optional mapper from productId to app-specific tier (e.g. 'pro', 'premium').
   * If not provided, tier is 'active' or 'none'.
   */
  productIdToTier?: (productId: string) => string | null
}

/**
 * Service for verifying Apple subscriptions and fetching transaction status
 * via the App Store Server API v1.
 */
export class AppStoreSubscriptionService {
  private config: SubscriptionServiceConfig

  constructor(config: SubscriptionServiceConfig = {}) {
    this.config = config
  }

  private getToken(): string {
    const cfg = this.config.storeKitConfig ?? getStoreKitConfigFromEnv()
    return generateStoreKitToken(cfg)
  }

  /**
   * Verify a subscription by original transaction ID.
   * Uses GET /inApps/v1/subscriptions/{originalTransactionId}
   */
  async verifySubscriptionV1(
    originalTransactionId: number,
    isSandbox = false
  ): Promise<VerifiedSubscriptionResult | null> {
    const base = isSandbox ? STOREKIT_SANDBOX_BASE : STOREKIT_PRODUCTION_BASE
    const url = `${base}/inApps/v1/subscriptions/${originalTransactionId}`
    const accessToken = `Bearer ${this.getToken()}`

    let response: { data?: { data?: unknown } } | null = null
    try {
      response = await axios.get(url, {
        headers: { Authorization: accessToken },
      })
    } catch {
      return null
    }

    const raw = response?.data?.data
    const latestSubscription = Array.isArray(raw) ? raw[0] : (raw as object | null)
    if (!latestSubscription || typeof latestSubscription !== "object") {
      return null
    }

    const { lastTransactions } = latestSubscription as { lastTransactions?: unknown[] }
    const lastTransaction = Array.isArray(lastTransactions)
      ? lastTransactions[0]
      : undefined
    const signedTransactionInfo =
      lastTransaction &&
      typeof lastTransaction === "object" &&
      "signedTransactionInfo" in lastTransaction
        ? (lastTransaction as { signedTransactionInfo: string }).signedTransactionInfo
        : null

    if (!signedTransactionInfo) {
      return null
    }

    const decoded = decode(signedTransactionInfo) as AppleSignedTransactionInfo | null
    if (!decoded) {
      return null
    }

    const subscription = decoded as AppleSignedTransactionInfo & {
      originalTransactionId?: string | number
    }

    const expiresDateRaw = subscription.expiresDate
    let expiresMs: number | null = null
    if (typeof expiresDateRaw === "number" || typeof expiresDateRaw === "string") {
      const parsed =
        typeof expiresDateRaw === "number" ? expiresDateRaw : Number(expiresDateRaw)
      if (Number.isFinite(parsed) && parsed > 0) {
        expiresMs = parsed
      }
    }

    const now = Date.now()
    const isActive =
      expiresMs != null && Number.isFinite(expiresMs) && now < expiresMs

    const expiresAt =
      expiresMs != null && Number.isFinite(expiresMs)
        ? new Date(expiresMs).toISOString()
        : new Date(0).toISOString()

    const transactionIdNum = Number(
      subscription.transactionId ??
        subscription.originalTransactionId ??
        originalTransactionId
    )

    const productId = subscription.productId ?? ""
    const tier = this.config.productIdToTier
      ? (isActive ? this.config.productIdToTier(productId) ?? "none" : "none")
      : isActive
        ? "active"
        : "none"

    return {
      expiresAt,
      productId,
      isTrial: subscription.offerDiscountType === "FREE_TRIAL",
      tier,
      subscriptionType:
        subscription.offerDiscountType === "FREE_TRIAL" ? "trial" : "paid",
      status: isActive ? "active" : "expired",
      transactionId: Number.isFinite(transactionIdNum)
        ? transactionIdNum
        : originalTransactionId,
      raw: subscription,
    }
  }

  /**
   * Get raw subscription status from Apple (full API response).
   * Uses GET /inApps/v1/subscriptions/{originalTransactionId}
   */
  async getSubscriptionStatusRaw(
    originalTransactionId: number,
    isSandbox = false
  ): Promise<AppleSubscriptionStatusResponse> {
    const base = isSandbox ? STOREKIT_SANDBOX_BASE : STOREKIT_PRODUCTION_BASE
    const url = `${base}/inApps/v1/subscriptions/${originalTransactionId}`
    const accessToken = `Bearer ${this.getToken()}`

    const response = await axios.get<AppleSubscriptionStatusResponse>(url, {
      headers: {
        Authorization: accessToken,
        "Content-Type": "application/json",
      },
    })

    return response.data
  }

  /**
   * Get the full subscription status for a transaction ID (decoded, with ISO dates).
   * Uses GET /inApps/v1/transactions/{transactionId}
   */
  async getSubscriptionStatus(
    originalTransactionId: string,
    isSandbox = false
  ): Promise<AppleSignedTransactionInfoWithIsoDates> {
    const base = isSandbox ? STOREKIT_SANDBOX_BASE : STOREKIT_PRODUCTION_BASE
    const url = `${base}/inApps/v1/transactions/${originalTransactionId}`
    const accessToken = `Bearer ${this.getToken()}`

    const response = await axios.get(url, {
      headers: { Authorization: accessToken },
    })

    const signedTransactionInfo = response?.data?.signedTransactionInfo
    if (!signedTransactionInfo) {
      throw new Error("No subscription data found")
    }

    const decoded = decode(signedTransactionInfo) as AppleSignedTransactionInfo | null
    if (!decoded) {
      throw new Error("Failed to decode signedTransactionInfo")
    }

    const sub = decoded as AppleSignedTransactionInfo
    const result: AppleSignedTransactionInfoWithIsoDates = {
      ...sub,
      purchaseDate: new Date(sub.purchaseDate).toISOString(),
      originalPurchaseDate: new Date(sub.originalPurchaseDate).toISOString(),
      expiresDate: new Date(sub.expiresDate).toISOString(),
      signedDate: new Date(sub.signedDate).toISOString(),
    }
    return result
  }
}
