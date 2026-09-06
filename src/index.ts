// App Store Connect & Beta Testers
import { AppStoreLib } from "./libs/app.store.lib"
import { AppStoreBetaTesterLib } from "./libs/app.store.connect.lib"
import { AppleStoreKitToken } from "./utils/app.store.token.util"
import { TestNotification } from "./utils/test.notification"

// StoreKit - Subscription & Notifications
import { AppStoreNotificationVerifier } from "./services/notification.verifier"
import { AppStoreSubscriptionService } from "./services/subscription.service"
import { generateStoreKitToken } from "./utils/storekit.token"
import {
  sendTestNotification,
  decodeSubscriptionStatus,
  getAppStoreApiBaseUrl,
  APPLE_STATUS_CODES,
} from "./utils/storekit.utils"

// Config
import { getStoreKitConfigFromEnv } from "./config/storekit.config"

// Constants
export {
  APP_STORE_API_PRODUCTION,
  APP_STORE_API_SANDBOX,
  STOREKIT_PRODUCTION_BASE,
  STOREKIT_SANDBOX_BASE,
  APPLE_PUBLIC_KEYS_URL,
  APPLE_SANDBOX_PUBLIC_KEYS_URL,
  APP_STORE_CONNECT_API,
} from "./constants/storekit.constants"

// Types
export type {
  AppleSignedTransactionInfo,
  AppleSignedTransactionInfoWithIsoDates,
  AppleSubscriptionStatusResponse,
  SignedTransaction,
  SignedRenewalInfo,
  AppStoreNotificationType,
  AppStoreNotificationV2,
  VerifiedSubscriptionResult,
  StoreKitConfig,
  SubscriptionGroupData,
  SubscriptionTransaction,
} from "./types"

export type {
  DecodedSubscriptionStatus,
  SendTestNotificationOptions,
} from "./utils/storekit.utils"

export type { SubscriptionServiceConfig } from "./services/subscription.service"

// Classes & utilities
export {
  AppStoreLib,
  AppStoreBetaTesterLib,
  AppleStoreKitToken,
  TestNotification,
  AppStoreNotificationVerifier,
  AppStoreSubscriptionService,
  generateStoreKitToken,
  getStoreKitConfigFromEnv,
  sendTestNotification,
  decodeSubscriptionStatus,
  getAppStoreApiBaseUrl,
  APPLE_STATUS_CODES,
}
