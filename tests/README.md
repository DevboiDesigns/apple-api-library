# Test Suite Documentation

This directory contains comprehensive tests for the Apple App Store Connect & StoreKit API library.

## Test Files

### Unit Tests (Mocked)

These tests use mocks and don't require actual API credentials:

1. **app.store.lib.test.ts**
   - Tests for `AppStoreLib` class
   - Covers app fetching, app details retrieval
   - Tests error handling and edge cases

2. **app.store.beta.tester.lib.test.ts**
   - Tests for `AppStoreBetaTesterLib` class
   - Covers all beta tester management methods:
     - Getting beta groups
     - Finding groups by name
     - Fetching testers (single group, all testers, pagination)
     - Adding testers to groups
     - Removing testers from groups
     - Updating Public Testing group
   - Tests all error scenarios including 409 conflicts, 404 errors, etc.

3. **app.store.token.util.test.ts**
   - Comprehensive tests for `AppleStoreKitToken` utility
   - Tests token generation for both "connect" and "store-kit" types
   - Tests token structure, expiration, header properties
   - Tests error handling for missing keys, invalid formats
   - Tests local vs production key reading

4. **test.notification.test.ts**
   - Tests for `TestNotification` utility class
   - Tests App Store Connect API connection testing
   - Tests StoreKit notification sending
   - Tests error handling for various scenarios

5. **storekit.token.test.ts**
   - Tests for `generateStoreKitToken` utility
   - Tests token generation with explicit config and env config
   - Tests payload structure, expiration, and error handling

6. **storekit.config.test.ts**
   - Tests for `getStoreKitConfigFromEnv`
   - Tests APP_STORE_* and APPLE_* env var resolution
   - Tests local file key reading and error cases

7. **storekit.utils.test.ts**
   - Tests for `getAppStoreApiBaseUrl`, `decodeSubscriptionStatus`, `sendTestNotification`
   - Tests `APPLE_STATUS_CODES` constants
   - Tests production vs sandbox URLs and API error handling

8. **subscription.service.test.ts**
   - Tests for `AppStoreSubscriptionService`
   - Tests `verifySubscriptionV1` (active, expired, trial, productIdToTier)
   - Tests `getSubscriptionStatusRaw` and `getSubscriptionStatus`
   - Tests error handling and sandbox mode

9. **notification.verifier.test.ts**
   - Tests for `AppStoreNotificationVerifier`
   - Tests `verifyAndDecodeNotification` (kid and x5c verification)
   - Tests `decodeSignedData` for transaction and renewal info
   - Tests public key caching and `clearKeysCache`

### Integration Tests

10. **integration.test.ts**
   - Full integration tests that make real API calls
   - Requires actual Apple App Store Connect API credentials
   - Tests end-to-end functionality
   - **Note:** These tests are skipped by default (`.skip`)
   - To run: Remove `.skip` and ensure all environment variables are set

11. **app.store.test.ts** (Legacy)
   - Legacy integration test file
   - Kept for backward compatibility
   - Skipped by default

12. **app.store.token.test.ts** (Legacy)
   - Basic integration tests for token generation
   - Requires actual environment variables
   - Simpler than the comprehensive unit test version

## Running Tests

### Run All Tests (Unit Tests Only)
```bash
npm test
```

### Run with Coverage
```bash
npm test -- --coverage
```

### Run Specific Test File
```bash
npm test -- app.store.lib.test.ts
```

### Run Integration Tests
1. Set all required environment variables
2. Remove `.skip` from `integration.test.ts`
3. Run: `npm test -- integration.test.ts`

### Watch Mode
```bash
npm test -- --watch
```

## Test Coverage

The test suite aims for comprehensive coverage of:

- ✅ All public methods
- ✅ Error handling (401, 403, 404, 409, 500, network errors)
- ✅ Edge cases (empty arrays, null values, missing data)
- ✅ Token generation and validation
- ✅ Pagination handling
- ✅ Race conditions and concurrent operations
- ✅ Different error response formats from Apple API

## Environment Variables for Integration Tests

Required environment variables:
- `APP_STORE_ISSUER_ID`
- `APP_STORE_BUNDLE_ID`
- `APP_APPLE_ID`
- `APP_STORE_CONNECT_KEY_ID`
- `APP_STORE_CONNECT_KEY`
- `APP_STORE_KIT_KEY_ID` (optional, for StoreKit tests)
- `APP_STORE_KIT_KEY` (optional, for StoreKit tests)
- `APP_IS_LOCAL` (optional, set to "true" for local file reading)

## Test Structure

Each test file follows this structure:
1. **Setup**: Mock dependencies and clear previous mocks
2. **Tests**: Grouped by method/functionality
3. **Assertions**: Verify expected behavior
4. **Error Cases**: Test error handling

## Mocking Strategy

- **axios**: Mocked to avoid real API calls in unit tests
- **AppleStoreKitToken**: Mocked to return predictable tokens
- **fs**: Mocked for file system operations in token tests

## Writing New Tests

When adding new functionality:

1. Add unit tests with mocks in the appropriate test file
2. Add integration tests (if applicable) in `integration.test.ts`
3. Ensure error cases are covered
4. Test edge cases (null, empty, invalid inputs)
5. Update this README if adding new test files

## Continuous Integration

Tests are designed to run in CI/CD environments:
- Unit tests run without external dependencies
- Integration tests are skipped by default
- Coverage reports are generated automatically

