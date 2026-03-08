/**
 * StoreKit utility functions for App Store Server API.
 */

import axios from "axios"
import type { StoreKitConfig } from "../types"
import { generateStoreKitToken } from "./storekit.token"
import { getStoreKitConfigFromEnv } from "../config/storekit.config"
import {
  APP_STORE_API_PRODUCTION,
  APP_STORE_API_SANDBOX,
} from "../constants/storekit.constants"

/** Apple subscription status codes (App Store Server API v1) */
export const APPLE_STATUS_CODES = {
  ACTIVE: 1,
  EXPIRED: 2,
  BILLING_RETRY: 3,
  BILLING_GRACE: 4,
  REVOKED: 5,
} as const

export interface DecodedSubscriptionStatus {
  status: string
  isActive: boolean
  description: string
}

/**
 * Get the App Store Server API base URL.
 * @param isSandbox - Use sandbox environment when true
 */
export function getAppStoreApiBaseUrl(isSandbox = false): string {
  return isSandbox ? APP_STORE_API_SANDBOX : APP_STORE_API_PRODUCTION
}

/**
 * Decode Apple's subscription status code into a human-readable format.
 * @param statusCode - Numeric status from Apple's StoreKit API
 */
export function decodeSubscriptionStatus(
  statusCode: number
): DecodedSubscriptionStatus {
  switch (statusCode) {
    case APPLE_STATUS_CODES.ACTIVE:
      return {
        status: "active",
        isActive: true,
        description: "Subscription is active and auto-renewable",
      }
    case APPLE_STATUS_CODES.EXPIRED:
      return {
        status: "expired",
        isActive: false,
        description: "Subscription has expired and is no longer active",
      }
    case APPLE_STATUS_CODES.BILLING_RETRY:
      return {
        status: "billing_retry",
        isActive: true,
        description:
          "Payment failed but Apple is retrying billing (billing retry period)",
      }
    case APPLE_STATUS_CODES.BILLING_GRACE:
      return {
        status: "grace_period",
        isActive: true,
        description:
          "Subscription is in billing grace period; customer retains access while Apple retries",
      }
    case APPLE_STATUS_CODES.REVOKED:
      return {
        status: "revoked",
        isActive: false,
        description: "Subscription was refunded or revoked by Apple",
      }
    default:
      return {
        status: "unknown",
        isActive: false,
        description: `Unrecognized status code: ${statusCode}`,
      }
  }
}

export interface SendTestNotificationOptions {
  /** Use sandbox environment when true */
  sandbox?: boolean
  /** Optional custom config. If not provided, uses env vars. */
  storeKitConfig?: StoreKitConfig
}

/**
 * Send a test notification to the App Store Server API.
 * Requires at least one active subscription product in App Store Connect.
 */
export async function sendTestNotification(
  options: SendTestNotificationOptions = {}
): Promise<unknown> {
  const { sandbox = false, storeKitConfig } = options
  const base = sandbox ? APP_STORE_API_SANDBOX : APP_STORE_API_PRODUCTION
  const url = `${base}/notifications/test`

  const config = storeKitConfig ?? getStoreKitConfigFromEnv()
  const token = generateStoreKitToken(config)

  const response = await axios.post(
    url,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  )

  return response.data
}
