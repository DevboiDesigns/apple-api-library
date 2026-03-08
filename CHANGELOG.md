# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2025-03-09

### Added

- **App Store Server API (StoreKit) support**
  - `AppStoreSubscriptionService` – Verify subscriptions, fetch transaction status, get raw API responses
  - `AppStoreNotificationVerifier` – Verify and decode App Store Server Notifications V2 (JWT)
  - `generateStoreKitToken` – Low-level JWT generation for StoreKit API
  - `getStoreKitConfigFromEnv` – Load StoreKit config from environment (supports `APP_STORE_*` and `APPLE_*` vars)
  - `sendTestNotification` – Send test notifications to production or sandbox
  - `decodeSubscriptionStatus` – Decode Apple status codes (1=active, 2=expired, etc.)
  - `getAppStoreApiBaseUrl` – Get production or sandbox API base URL
  - `APPLE_STATUS_CODES` – Constants for status code mapping

- **Types**
  - `AppleSignedTransactionInfo`, `AppleSignedTransactionInfoWithIsoDates`
  - `SignedTransaction`, `SignedRenewalInfo`
  - `AppStoreNotificationV2`, `AppStoreNotificationType` (includes `REFUND_REVERSED`, `OFFER_REDEEMED`, `ONE_TIME_CHARGE`, `GRACE_PERIOD_EXPIRED`, `RENEWAL_EXTENDED`, `RENEWAL_EXTENSION`, etc.)
  - `VerifiedSubscriptionResult`, `AppleSubscriptionStatusResponse`
  - `StoreKitConfig`, `SubscriptionGroupData`, `SubscriptionTransaction`
  - `DecodedSubscriptionStatus`, `SendTestNotificationOptions`, `SubscriptionServiceConfig`

- **Constants**
  - `APP_STORE_API_PRODUCTION`, `APP_STORE_API_SANDBOX`
  - `STOREKIT_PRODUCTION_BASE`, `STOREKIT_SANDBOX_BASE`
  - `APPLE_PUBLIC_KEYS_URL`, `APPLE_SANDBOX_PUBLIC_KEYS_URL`

- **Config**
  - `storekit.config.ts` – Credentials from env only; no hardcoded secrets
  - Supports both `APP_STORE_KIT_*` and `APPLE_*` environment variable naming

### Dependencies

- Added `jwk-to-pem` as a direct dependency (for JWT verification of notifications)

### Security

- All credentials loaded from environment variables or injected config
- No private keys or secrets in source code

## [1.0.6] - Previous

- App Store Connect API (apps, beta testers)
- `AppleStoreKitToken` for Connect and StoreKit JWT
- `TestNotification` for connectivity testing
