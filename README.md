# Apple App Store Connect & StoreKit API Library

A TypeScript library for interacting with Apple's App Store Connect API and App Store Server API (StoreKit). This package provides utilities for:

- **App Store Connect**: Beta testers, app information, JWT tokens
- **App Store Server API (StoreKit)**: Subscription verification, transaction lookup, App Store Server Notifications V2 verification

[![NPM Downloads](https://img.shields.io/npm/v/apple-api-library)](https://www.npmjs.com/package/apple-api-library)

## Table of Contents

- [Installation](#installation)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [AppleStoreKitToken](#applestorekittoken)
  - [AppStoreLib](#appstorelib)
  - [AppStoreBetaTesterLib](#appstorebetatesterlib)
  - [TestNotification](#testnotification)
  - [StoreKit: Subscription & Notifications](#storekit-subscription--notifications)
- [Usage Examples](#usage-examples)
- [Environment Variables](#environment-variables)
- [Error Handling](#error-handling)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Installation

Install the package using npm:

```bash
npm install apple-api-library
```

Or using yarn:

```bash
yarn add apple-api-library
```

### Dependencies

- **Direct**: `jwk-to-pem` (^2.0.5) – bundled for App Store Server Notifications V2 JWT verification
- **Peer** (install in your project):
  - `axios` (^1.9.0) – HTTP requests
  - `dotenv` (^16.5.0) – environment variable loading
  - `jsonwebtoken` (^9.0.2) – JWT signing and decoding

```bash
npm install axios dotenv jsonwebtoken
```

## Prerequisites

Before using this library, you need:

1. **Apple Developer Account** - An active Apple Developer account
2. **App Store Connect API Key** - Generate an API key in App Store Connect:

   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Navigate to Users and Access → Keys → App Store Connect API
   - Create a new key and download the `.p8` private key file
   - Note the Key ID and Issuer ID

3. **App Store Server API Key** (required for StoreKit features) - If you plan to use subscription verification or notifications:

   - Generate an API key in App Store Connect (Users and Access → Keys → App Store Connect API)
   - Download the `.p8` private key file (available only once)
   - Note the Key ID (same issuer ID as Connect; you can use one key for both Connect and StoreKit)

4. **App Information**:
   - Your app's Bundle ID
   - Your app's Apple ID (found in App Store Connect)

## Configuration

### Environment Variables

Create a `.env` file (or `.env.production`, `.env.development` based on your `NODE_ENV`) in your project root with the following variables:

```env
# Required: App Store Connect API Configuration
APP_STORE_ISSUER_ID=your-issuer-id
APP_STORE_BUNDLE_ID=com.yourcompany.yourapp
APP_APPLE_ID=your-apple-id

# Required: App Store Connect API Key
APP_STORE_CONNECT_KEY_ID=your-connect-key-id
APP_STORE_CONNECT_KEY=/path/to/AuthKey_N262NK6NP4.p8

# Optional: StoreKit API Key (if using StoreKit features)
APP_STORE_KIT_KEY_ID=your-storekit-key-id
APP_STORE_KIT_KEY=/path/to/SubscriptionKey_D5X8SVY366.p8

# Optional: Local Development Flag
APP_IS_LOCAL=true  # Set to "true" if running locally (reads key from file path)
```

### Environment Variable Details

| Variable                   | Required | Description                                                          |
| -------------------------- | -------- | -------------------------------------------------------------------- |
| `APP_STORE_ISSUER_ID`      | Yes      | Issuer ID from App Store Connect                                     |
| `APP_STORE_BUNDLE_ID`      | Yes      | Your app's bundle identifier (e.g., `com.company.app`)                |
| `APP_APPLE_ID`             | Yes      | Your app's Apple ID (numeric ID from App Store Connect)               |
| `APP_STORE_CONNECT_KEY_ID` | Yes      | Key ID for App Store Connect API                                     |
| `APP_STORE_CONNECT_KEY`    | Yes      | Path to `.p8` file (local) OR key content (production)                |
| `APP_STORE_KIT_KEY_ID`     | Yes**    | Key ID for App Store Server API                                      |
| `APP_STORE_KIT_KEY`        | Yes**    | Path to `.p8` file (local) OR key content (production)               |
| `APP_IS_LOCAL`             | No       | Set to `"true"` to read keys from file paths instead of env content  |

\*\* Required only when using StoreKit features (subscription verification, notifications).

### Security: No Hardcoded Credentials

**This package never stores or hardcodes credentials.** All sensitive values (private keys, issuer IDs, key IDs) are loaded from:

1. **Environment variables** – Set in your deployment (Cloud Run, Vercel, etc.)
2. **Optional config injection** – Pass `StoreKitConfig` or `storeKitConfig` at runtime for serverless/edge use cases

Use your platform's secret manager (e.g. Google Secret Manager, AWS Secrets Manager) and inject values as env vars. Never commit `.p8` files or keys to version control.

### Key File Setup

**For Local Development (`APP_IS_LOCAL=true`):**

- Set `APP_STORE_CONNECT_KEY` to the file path: `/path/to/AuthKey_N262NK6NP4.p8`
- The library will read the key file from disk

**For Production (`APP_IS_LOCAL` not set or `false`):**

- Set `APP_STORE_CONNECT_KEY` to the actual key content (the entire contents of the `.p8` file)
- This is typically done via environment variables in your hosting platform

## Quick Start

### Basic Setup

```typescript
import { AppStoreLib } from "apple-api-library"

// Initialize the library
const appStore = new AppStoreLib()

// Fetch all apps
const apps = await appStore.getApps()
console.log("Apps:", apps)
```

### Beta Tester Management

```typescript
import { AppStoreBetaTesterLib } from "apple-api-library"

// Initialize the beta tester library
const betaTesterLib = new AppStoreBetaTesterLib()

// Add a tester to a beta group by name
await betaTesterLib.addTesterToGroupByName(
  "Public Testing",
  "tester@example.com",
  "John",
  "Doe"
)
```

## API Reference

### AppleStoreKitToken

Utility class for generating JWT tokens for Apple API authentication.

#### Methods

##### `token(type: TokenType): string`

Generates a JWT token for Apple API authentication.

**Parameters:**

- `type` (`"connect" | "store-kit"`): The type of token to generate
  - `"connect"`: For App Store Connect API
  - `"store-kit"`: For App Store StoreKit v2 API

**Returns:** `string` - The generated JWT token

**Throws:** `Error` - If token generation fails or private key is not set

**Token Validity:** 20 minutes

**Example:**

```typescript
import { AppleStoreKitToken } from "apple-api-library"

// Generate token for App Store Connect API
const connectToken = AppleStoreKitToken.token("connect")

// Generate token for StoreKit API
const storeKitToken = AppleStoreKitToken.token("store-kit")
```

---

### AppStoreLib

Main library class for interacting with App Store Connect API.

#### Constructor

```typescript
new AppStoreLib()
```

**Throws:** `Error` - If token generation fails

#### Methods

##### `getApps(): Promise<any[]>`

Fetches all apps associated with your Apple Developer account.

**Returns:** `Promise<any[]>` - Array of app objects

**Example:**

```typescript
const appStore = new AppStoreLib()
const apps = await appStore.getApps()
apps.forEach((app) => {
  console.log(`App: ${app.attributes.name} (ID: ${app.id})`)
})
```

##### `getAppDetails(appId: string): Promise<any>`

Fetches detailed information about a specific app.

**Parameters:**

- `appId` (`string`): The Apple ID of the app

**Returns:** `Promise<any>` - App details object

**Example:**

```typescript
const appStore = new AppStoreLib()
const appDetails = await appStore.getAppDetails("1234567890")
console.log("App Details:", appDetails)
```

---

### AppStoreBetaTesterLib

Library class for managing beta testers and beta groups.

#### Constructor

```typescript
new AppStoreBetaTesterLib()
```

**Throws:** `Error` - If token generation fails

#### Methods

##### `addTesterToGroupByName(groupName: string, email: string, firstName?: string, lastName?: string): Promise<void>`

Adds a tester to a beta group by group name. If the tester doesn't exist, they will be created automatically.

**Parameters:**

- `groupName` (`string`): Name of the beta group
- `email` (`string`): Email address of the tester
- `firstName` (`string`, optional): First name of the tester
- `lastName` (`string`, optional): Last name of the tester

**Throws:** `Error` - If the beta group is not found

**Example:**

```typescript
const betaLib = new AppStoreBetaTesterLib()
await betaLib.addTesterToGroupByName(
  "Public Testing",
  "tester@example.com",
  "Jane",
  "Smith"
)
```

##### `getBetaGroups(): Promise<any[]>`

Retrieves all beta groups for your app.

**Returns:** `Promise<any[]>` - Array of beta group objects

**Example:**

```typescript
const betaLib = new AppStoreBetaTesterLib()
const groups = await betaLib.getBetaGroups()
groups.forEach((group) => {
  console.log(`Group: ${group.attributes.name} (ID: ${group.id})`)
})
```

##### `getBetaGroupIdByName(groupName: string): Promise<string | null>`

Finds a beta group ID by its name.

**Parameters:**

- `groupName` (`string`): Name of the beta group

**Returns:** `Promise<string | null>` - The group ID if found, `null` otherwise

**Example:**

```typescript
const betaLib = new AppStoreBetaTesterLib()
const groupId = await betaLib.getBetaGroupIdByName("Public Testing")
if (groupId) {
  console.log(`Group ID: ${groupId}`)
}
```

##### `getBetaTestersInGroup(betaGroupId: string): Promise<any[]>`

Lists all testers in a specific beta group.

**Parameters:**

- `betaGroupId` (`string`): The ID of the beta group

**Returns:** `Promise<any[]>` - Array of tester objects

**Example:**

```typescript
const betaLib = new AppStoreBetaTesterLib()
const groupId = await betaLib.getBetaGroupIdByName("Public Testing")
if (groupId) {
  const testers = await betaLib.getBetaTestersInGroup(groupId)
  testers.forEach((tester) => {
    console.log(`Tester: ${tester.attributes.email}`)
  })
}
```

##### `getBetaTesters(nextUrl?: string): Promise<any>`

Lists all beta testers (across all groups) with pagination support.

**Parameters:**

- `nextUrl` (`string`, optional): URL for the next page of results

**Returns:** `Promise<any>` - Object containing `data` array and `links` object with pagination info

**Example:**

```typescript
const betaLib = new AppStoreBetaTesterLib()
const result = await betaLib.getBetaTesters()
console.log(`Total testers: ${result.data.length}`)
if (result.links.next) {
  const nextPage = await betaLib.getBetaTesters(result.links.next)
}
```

##### `getAllBetaTesters(): Promise<any[]>`

Fetches all beta testers across all pages automatically.

**Returns:** `Promise<any[]>` - Array of all tester objects

**Example:**

```typescript
const betaLib = new AppStoreBetaTesterLib()
const allTesters = await betaLib.getAllBetaTesters()
console.log(`Total testers: ${allTesters.length}`)
```

##### `addTesterToGroup(betaGroupId: string, email: string, firstName?: string, lastName?: string): Promise<void>`

Adds a tester to a beta group by group ID. If the tester doesn't exist, they will be created automatically.

**Parameters:**

- `betaGroupId` (`string`): The ID of the beta group
- `email` (`string`): Email address of the tester
- `firstName` (`string`, optional): First name of the tester
- `lastName` (`string`, optional): Last name of the tester

**Throws:** `Error` - If tester cannot be created or added to group

**Example:**

```typescript
const betaLib = new AppStoreBetaTesterLib()
await betaLib.addTesterToGroup(
  "abc123-group-id",
  "tester@example.com",
  "John",
  "Doe"
)
```

##### `removeTesterFromGroup(betaGroupId: string, testerId: string): Promise<void>`

Removes a tester from a beta group.

**Parameters:**

- `betaGroupId` (`string`): The ID of the beta group
- `testerId` (`string`): The ID of the tester

**Example:**

```typescript
const betaLib = new AppStoreBetaTesterLib()
const groupId = await betaLib.getBetaGroupIdByName("Public Testing")
const testers = await betaLib.getBetaTestersInGroup(groupId)
if (testers.length > 0) {
  await betaLib.removeTesterFromGroup(groupId, testers[0].id)
}
```

##### `updatePublicTestingGroup(emails: string[]): Promise<void>`

Updates the "Public Testing" beta group to match a new list of email addresses. This method will:

- Add any new email addresses that aren't in the group
- Remove any testers whose emails aren't in the provided list

**Parameters:**

- `emails` (`string[]`): Array of email addresses to sync with the group

**Throws:** `Error` - If "Public Testing" group is not found

**Example:**

```typescript
const betaLib = new AppStoreBetaTesterLib()
const emails = [
  "tester1@example.com",
  "tester2@example.com",
  "tester3@example.com",
]
await betaLib.updatePublicTestingGroup(emails)
```

##### `getBetaTesterByEmail(email: string): Promise<any | null>`

Fetches a beta tester by their email address.

**Parameters:**

- `email` (`string`): Email address of the tester

**Returns:** `Promise<any | null>` - Tester object if found, `null` otherwise

**Example:**

```typescript
const betaLib = new AppStoreBetaTesterLib()
const tester = await betaLib.getBetaTesterByEmail("tester@example.com")
if (tester) {
  console.log(`Found tester: ${tester.id}`)
}
```

---

### TestNotification

Utility class for testing API connectivity and sending test notifications.

#### Methods

##### `test(): Promise<void>`

Tests the Apple JWT token by making a request to the App Store Connect API.

**Throws:** `Error` - If the test fails

**Example:**

```typescript
import { TestNotification } from "apple-api-library"

try {
  await TestNotification.test()
  console.log("API connection successful!")
} catch (error) {
  console.error("API connection failed:", error)
}
```

##### `testNotification(): Promise<void>`

Sends a test notification to the StoreKit API. **Note:** This requires at least one active subscription product in App Store Connect.

**Throws:** `Error` - If the test notification fails

**Example:**

```typescript
import { TestNotification } from "apple-api-library"

try {
  await TestNotification.testNotification()
  console.log("Test notification sent successfully!")
} catch (error) {
  console.error("Failed to send test notification:", error)
}
```

---

### StoreKit: Subscription & Notifications

App Store Server API v1 utilities for subscription verification, transaction lookup, and App Store Server Notifications V2 verification.

#### Environment Variables (StoreKit)

| Variable                 | Required | Description                                                                 |
| ------------------------ | -------- | --------------------------------------------------------------------------- |
| `APP_STORE_KIT_KEY_ID`   | Yes*     | Key ID for App Store Server API (StoreKit)                                 |
| `APP_STORE_ISSUER_ID`    | Yes*     | Issuer ID from App Store Connect                                            |
| `APP_STORE_BUNDLE_ID`    | Yes*     | Your app's bundle identifier                                                |
| `APP_STORE_KIT_KEY`      | Yes*     | `.p8` private key content (production) or file path when `APP_IS_LOCAL=true` |
| `APP_IS_LOCAL`           | No       | Set to `"true"` to read key from file path instead of env var content       |
| `APPLE_KEY_ID`           | Alt      | Alternative to `APP_STORE_KIT_KEY_ID`                                       |
| `APPLE_ISSUER_ID`        | Alt      | Alternative to `APP_STORE_ISSUER_ID`                                        |
| `APPLE_APP_BUNDLE_ID`    | Alt      | Alternative to `APP_STORE_BUNDLE_ID`                                        |
| `APPLE_PRIVATE_KEY_PATH` | Alt      | Alternative to `APP_STORE_KIT_KEY`                                          |

\* Required for StoreKit features. The package supports both `APP_STORE_*` and `APPLE_*` naming conventions.

#### `AppStoreSubscriptionService`

Verifies subscriptions and fetches transaction status via the App Store Server API v1.

**Constructor options:**

- `storeKitConfig` – Optional. Override env-based config (e.g. for serverless).
- `productIdToTier` – Optional. Map product IDs to app-specific tiers (e.g. `'pro'`, `'premium'`).

**Methods:**

| Method                     | Returns                    | Throws | Description                                                |
| -------------------------- | -------------------------- | ------ | ---------------------------------------------------------- |
| `verifySubscriptionV1(id, isSandbox?)` | `VerifiedSubscriptionResult \| null` | No     | Verifies subscription; returns `null` if not found/error   |
| `getSubscriptionStatus(transactionId, isSandbox?)` | `AppleSignedTransactionInfoWithIsoDates` | Yes    | Full decoded status with ISO date strings                  |
| `getSubscriptionStatusRaw(id, isSandbox?)` | `AppleSubscriptionStatusResponse` | Yes    | Raw Apple API response                                     |

```typescript
import {
  AppStoreSubscriptionService,
  decodeSubscriptionStatus,
} from "apple-api-library"

const service = new AppStoreSubscriptionService({
  // Optional: custom productId → tier mapping
  productIdToTier: (productId) => {
    const map: Record<string, string> = {
      "com.app.monthly": "pro",
      "com.app.yearly": "pro",
    }
    return map[productId] ?? null
  },
  // Optional: inject config instead of using env vars
  // storeKitConfig: { keyId, issuerId, bundleId, privateKey },
})

// Verify subscription by original transaction ID (returns null on error)
const result = await service.verifySubscriptionV1(1234567890, false)
if (result) {
  console.log(result.status, result.tier, result.expiresAt)
}

// Get full subscription status (decoded, with ISO dates) – throws on error
const status = await service.getSubscriptionStatus("1234567890", false)

// Get raw Apple API response – throws on error
const raw = await service.getSubscriptionStatusRaw(1234567890, false)
```

#### `AppStoreNotificationVerifier`

Verifies and decodes App Store Server Notifications V2 (JWT signed by Apple). Supports both `kid` (JWK lookup) and `x5c` (certificate chain) in the JWT header.

```typescript
import { AppStoreNotificationVerifier } from "apple-api-library"

const verifier = new AppStoreNotificationVerifier()

// In your webhook handler: POST /webhooks/apple/subscription-notifications
// Extract JWT from body (Apple may send { signedPayload: "..." } or the raw JWT string)
const jwtToken = req.body?.signedPayload ?? req.body
const decoded = await verifier.verifyAndDecodeNotification(jwtToken)
if (decoded) {
  if (decoded.notificationType === "TEST") {
    // Handle test notification
    return
  }
  const transactionInfo = await verifier.decodeSignedData(
    decoded.data.signedTransactionInfo!,
    "transaction"
  )
  const renewalInfo = decoded.data.signedRenewalInfo
    ? await verifier.decodeSignedData(
        decoded.data.signedRenewalInfo,
        "renewal"
      )
    : null
  // Handle SUBSCRIBED, DID_RENEW, DID_FAIL_TO_RENEW, EXPIRED, REFUND, REVOKE,
  // DID_CHANGE_RENEWAL_STATUS, OFFER_REDEEMED, etc. (see AppStoreNotificationType)
}
```

#### `generateStoreKitToken` & `getStoreKitConfigFromEnv`

Low-level token generation when you need full control:

```typescript
import {
  generateStoreKitToken,
  getStoreKitConfigFromEnv,
  sendTestNotification,
  getAppStoreApiBaseUrl,
  APPLE_STATUS_CODES,
} from "apple-api-library"

const token = generateStoreKitToken() // Uses env vars
// Or with explicit config:
const token = generateStoreKitToken({
  keyId: "...",
  issuerId: "...",
  bundleId: "com.app",
  privateKey: "-----BEGIN PRIVATE KEY...",
})

// Returns { testNotificationToken } – use with Get Test Notification Status to verify delivery
await sendTestNotification({ sandbox: true })
const baseUrl = getAppStoreApiBaseUrl(false)
const decoded = decodeSubscriptionStatus(APPLE_STATUS_CODES.ACTIVE)
```

#### Constants

| Constant                     | Description                                      |
| ---------------------------- | ------------------------------------------------ |
| `APP_STORE_API_PRODUCTION`   | Production inApps v1 base URL                    |
| `APP_STORE_API_SANDBOX`      | Sandbox inApps v1 base URL                       |
| `STOREKIT_PRODUCTION_BASE`   | Production StoreKit root URL                     |
| `STOREKIT_SANDBOX_BASE`      | Sandbox StoreKit root URL                        |
| `APPLE_PUBLIC_KEYS_URL`      | Production public keys for JWT verification      |
| `APPLE_SANDBOX_PUBLIC_KEYS_URL` | Sandbox public keys for JWT verification     |
| `APP_STORE_CONNECT_API`      | App Store Connect API base URL                   |
| `APPLE_STATUS_CODES`         | Status code constants: `ACTIVE` (1), `EXPIRED` (2), `BILLING_RETRY` (3), `BILLING_GRACE` (4), `REVOKED` (5) |

#### `decodeSubscriptionStatus(statusCode: number)`

Maps Apple's numeric status (1–5) to `{ status, isActive, description }`. Use with `APPLE_STATUS_CODES` for type-safe checks.

---

## Usage Examples

### Example 1: Managing Beta Testers

```typescript
import { AppStoreBetaTesterLib } from "apple-api-library"

async function manageBetaTesters() {
  const betaLib = new AppStoreBetaTesterLib()

  // Get all beta groups
  const groups = await betaLib.getBetaGroups()
  console.log(
    "Available beta groups:",
    groups.map((g) => g.attributes.name)
  )

  // Add a new tester to a group
  await betaLib.addTesterToGroupByName(
    "Public Testing",
    "newtester@example.com",
    "Alice",
    "Johnson"
  )

  // Get all testers in a group
  const groupId = await betaLib.getBetaGroupIdByName("Public Testing")
  if (groupId) {
    const testers = await betaLib.getBetaTestersInGroup(groupId)
    console.log(`Testers in Public Testing: ${testers.length}`)
  }

  // Update the Public Testing group with a new list
  const newTesterList = [
    "tester1@example.com",
    "tester2@example.com",
    "tester3@example.com",
  ]
  await betaLib.updatePublicTestingGroup(newTesterList)
}

manageBetaTesters().catch(console.error)
```

### Example 2: Fetching App Information

```typescript
import { AppStoreLib } from "apple-api-library"

async function getAppInfo() {
  const appStore = new AppStoreLib()

  // Get all apps
  const apps = await appStore.getApps()
  console.log(`You have ${apps.length} app(s)`)

  // Get details for a specific app
  if (apps.length > 0) {
    const appDetails = await appStore.getAppDetails(apps[0].id)
    console.log("App Details:", JSON.stringify(appDetails, null, 2))
  }
}

getAppInfo().catch(console.error)
```

### Example 3: Testing API Connection

```typescript
import { TestNotification } from "apple-api-library"

async function testConnection() {
  try {
    console.log("Testing App Store Connect API connection...")
    await TestNotification.test()
    console.log("✓ Connection successful!")
  } catch (error) {
    console.error("✗ Connection failed:", error)
  }
}

testConnection()
```

### Example 4: Bulk Beta Tester Management

```typescript
import { AppStoreBetaTesterLib } from "apple-api-library"

async function bulkAddTesters() {
  const betaLib = new AppStoreBetaTesterLib()
  const groupName = "Public Testing"

  const testers = [
    { email: "tester1@example.com", firstName: "John", lastName: "Doe" },
    { email: "tester2@example.com", firstName: "Jane", lastName: "Smith" },
    { email: "tester3@example.com", firstName: "Bob", lastName: "Johnson" },
  ]

  for (const tester of testers) {
    try {
      await betaLib.addTesterToGroupByName(
        groupName,
        tester.email,
        tester.firstName,
        tester.lastName
      )
      console.log(`✓ Added ${tester.email}`)
    } catch (error) {
      console.error(`✗ Failed to add ${tester.email}:`, error)
    }
  }
}

bulkAddTesters().catch(console.error)
```

## Error Handling

The library throws errors in various scenarios. Always wrap API calls in try-catch blocks:

```typescript
import { AppStoreBetaTesterLib } from "apple-api-library"

async function safeAddTester() {
  const betaLib = new AppStoreBetaTesterLib()

  try {
    await betaLib.addTesterToGroupByName("Public Testing", "tester@example.com")
    console.log("Tester added successfully")
  } catch (error: any) {
    if (error.response) {
      // API error response
      console.error("API Error:", error.response.status, error.response.data)
    } else if (error.message) {
      // General error
      console.error("Error:", error.message)
    } else {
      // Unknown error
      console.error("Unknown error:", error)
    }
  }
}
```

### Common Error Scenarios

1. **Token Generation Failure**

   - **Cause:** Missing or invalid private key
   - **Solution:** Verify environment variables are set correctly

2. **Beta Group Not Found**

   - **Cause:** Group name doesn't exist or is misspelled
   - **Solution:** Use `getBetaGroups()` to list available groups

3. **Tester Already Exists (409 Conflict)**

   - **Cause:** Tester email already registered
   - **Solution:** The library handles this automatically, but you can check with `getBetaTesterByEmail()` first

4. **Authentication Failure (401)**
   - **Cause:** Invalid or expired token
   - **Solution:** Tokens are auto-generated and valid for 20 minutes. Check your API key configuration

## Troubleshooting

### Issue: "Failed to generate App Store Connect token"

**Possible Causes:**

- Environment variables not set correctly
- Private key file path incorrect (for local development)
- Private key content invalid (for production)

**Solutions:**

1. Verify all required environment variables are set
2. For local development, ensure `APP_IS_LOCAL=true` and the file path is correct
3. For production, ensure the key content is properly escaped in your environment variable
4. Check that the key file has proper permissions (readable)

### Issue: "Beta group not found"

**Possible Causes:**

- Group name is misspelled or doesn't exist
- Wrong app Apple ID configured

**Solutions:**

1. List all groups using `getBetaGroups()` to see available names
2. Verify `APP_APPLE_ID` matches your app in App Store Connect
3. Check group names are case-sensitive

### Issue: "No subscription products found" (StoreKit)

**Possible Causes:**

- No active subscription products configured in App Store Connect
- Wrong StoreKit API key configured

**Solutions:**

1. Ensure you have at least one active subscription product in App Store Connect
2. Verify StoreKit API key configuration
3. Check that `APP_STORE_KIT_KEY_ID` and `APP_STORE_KIT_KEY` are set correctly

### Issue: API requests timing out

**Possible Causes:**

- Network connectivity issues
- Apple API rate limiting

**Solutions:**

1. Check your internet connection
2. Implement retry logic with exponential backoff
3. Reduce request frequency if hitting rate limits

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC

---

## Additional Resources

- [Apple App Store Connect API Documentation](https://developer.apple.com/documentation/appstoreconnectapi)
- [App Store Connect API Keys Guide](https://developer.apple.com/documentation/appstoreconnectapi/managing_your_keys_for_app_store_connect_api)
- [StoreKit 2 API Documentation](https://developer.apple.com/documentation/appstoreserverapi)
