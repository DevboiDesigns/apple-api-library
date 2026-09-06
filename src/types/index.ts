/**
 * Apple App Store Server API types.
 * These types align with Apple's App Store Server API v1 and StoreKit v2 documentation.
 */

/** Signed transaction info from Apple (decoded JWT payload) */
export interface AppleSignedTransactionInfo {
  transactionId: string
  originalTransactionId: string
  webOrderLineItemId: string
  bundleId: string
  productId: string
  subscriptionGroupIdentifier: string
  purchaseDate: number
  originalPurchaseDate: number
  expiresDate: number
  quantity: number
  type: string
  inAppOwnershipType: string
  signedDate: number
  offerType?: number
  environment: string
  transactionReason?: string
  storefront?: string
  storefrontId?: string
  price?: number
  currency?: string
  offerDiscountType?: string
  appTransactionId?: string
  offerPeriod?: string
  [key: string]: unknown
}

/** Decoded signed transaction from notification payload */
export interface SignedTransaction {
  originalTransactionId: string
  webOrderLineItemId: string
  productId: string
  subscriptionGroupIdentifier: string
  purchaseDate: number
  expiresDate: number
  environment: string
  originalPurchaseDate?: number
  offerType?: string
  [key: string]: unknown
}

/** Decoded signed renewal info from notification payload */
export interface SignedRenewalInfo {
  autoRenewStatus: number
  autoRenewProductId: string
  expirationIntent?: number
  [key: string]: unknown
}

/** App Store Server Notification V2 types (per Apple documentation) */
export type AppStoreNotificationType =
  | "SUBSCRIBED"
  | "DID_RENEW"
  | "DID_FAIL_TO_RENEW"
  | "EXPIRED"
  | "DID_CHANGE_RENEWAL_STATUS"
  | "DID_CHANGE_RENEWAL_PREF"
  | "REFUND"
  | "REFUND_REVERSED"
  | "REFUND_DECLINED"
  | "REVOKE"
  | "PRICE_INCREASE"
  | "CONSUMPTION_REQUEST"
  | "OFFER_REDEEMED"
  | "ONE_TIME_CHARGE"
  | "GRACE_PERIOD_EXPIRED"
  | "RENEWAL_EXTENDED"
  | "RENEWAL_EXTENSION"
  | "TEST"

/** Decoded App Store Server Notification V2 payload */
export interface AppStoreNotificationV2 {
  notificationType: AppStoreNotificationType
  subtype?: string
  notificationUUID: string
  data: {
    appAppleId: number
    bundleId: string
    bundleVersion?: string
    environment: "Sandbox" | "Production"
    signedTransactionInfo?: string
    signedRenewalInfo?: string
    [key: string]: unknown
  }
  version: string
}

/** Result of subscription verification */
export interface VerifiedSubscriptionResult {
  expiresAt: string
  productId: string
  isTrial: boolean
  tier: string
  subscriptionType: "trial" | "paid"
  status: "active" | "expired"
  transactionId: number
  raw?: AppleSignedTransactionInfo
}

/** Raw Apple subscription status API response (v1) */
export interface AppleSubscriptionStatusResponse {
  environment: string
  bundleId: string
  appAppleId: number
  data: SubscriptionGroupData[]
}

export interface SubscriptionGroupData {
  subscriptionGroupIdentifier: string
  lastTransactions: SubscriptionTransaction[]
}

export interface SubscriptionTransaction {
  originalTransactionId: string
  status: number
  signedTransactionInfo: string
  /** Optional per Apple's LastTransactionsItem; may be absent for some transaction types */
  signedRenewalInfo?: string
}

/** Subscription status with ISO date strings (from getSubscriptionStatus) */
export interface AppleSignedTransactionInfoWithIsoDates
  extends Omit<AppleSignedTransactionInfo, "purchaseDate" | "originalPurchaseDate" | "expiresDate" | "signedDate"> {
  purchaseDate: string
  originalPurchaseDate: string
  expiresDate: string
  signedDate: string
}

/** Configuration for StoreKit/App Store Server API */
export interface StoreKitConfig {
  /** Key ID from App Store Connect (StoreKit or Connect key) */
  keyId: string
  /** Issuer ID from App Store Connect */
  issuerId: string
  /** App bundle ID */
  bundleId: string
  /** Private key content (preferred in production) or path to .p8 file */
  privateKey: string
}
