import fs from "fs"
import { getStoreKitConfigFromEnv } from "../src/config/storekit.config"

jest.mock("fs")

const mockedFs = fs as jest.Mocked<typeof fs>

describe("getStoreKitConfigFromEnv", () => {
  const mockPrivateKey = `-----BEGIN PRIVATE KEY-----
MOCK_KEY
-----END PRIVATE KEY-----`

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.APP_STORE_KIT_KEY_ID
    delete process.env.APP_STORE_ISSUER_ID
    delete process.env.APP_STORE_BUNDLE_ID
    delete process.env.APP_STORE_KIT_KEY
    delete process.env.APPLE_KEY_ID
    delete process.env.APPLE_ISSUER_ID
    delete process.env.APPLE_APP_BUNDLE_ID
    delete process.env.APPLE_PRIVATE_KEY_PATH
    delete process.env.APP_IS_LOCAL
  })

  describe("with APP_STORE_* vars", () => {
    it("should return config when all vars are set", () => {
      process.env.APP_STORE_KIT_KEY_ID = "key-123"
      process.env.APP_STORE_ISSUER_ID = "issuer-123"
      process.env.APP_STORE_BUNDLE_ID = "com.test"
      process.env.APP_STORE_KIT_KEY = mockPrivateKey

      const config = getStoreKitConfigFromEnv()

      expect(config.keyId).toBe("key-123")
      expect(config.issuerId).toBe("issuer-123")
      expect(config.bundleId).toBe("com.test")
      expect(config.privateKey).toBe(mockPrivateKey)
      expect(config.privateKeyIsPath).toBe(false)
      expect(mockedFs.readFileSync).not.toHaveBeenCalled()
    })

    it("should read key from file when APP_IS_LOCAL is true and key is path", () => {
      process.env.APP_STORE_KIT_KEY_ID = "key-123"
      process.env.APP_STORE_ISSUER_ID = "issuer-123"
      process.env.APP_STORE_BUNDLE_ID = "com.test"
      process.env.APP_STORE_KIT_KEY = "/path/to/key.p8"
      process.env.APP_IS_LOCAL = "true"
      mockedFs.readFileSync.mockReturnValue(mockPrivateKey)

      const config = getStoreKitConfigFromEnv()

      expect(config.privateKey).toBe(mockPrivateKey)
      expect(config.privateKeyIsPath).toBe(true)
      expect(mockedFs.readFileSync).toHaveBeenCalledWith("/path/to/key.p8", "utf8")
    })

    it("should not read from file when key content includes BEGIN", () => {
      process.env.APP_STORE_KIT_KEY_ID = "key-123"
      process.env.APP_STORE_ISSUER_ID = "issuer-123"
      process.env.APP_STORE_BUNDLE_ID = "com.test"
      process.env.APP_STORE_KIT_KEY = mockPrivateKey
      process.env.APP_IS_LOCAL = "true"

      const config = getStoreKitConfigFromEnv()

      expect(config.privateKey).toBe(mockPrivateKey)
      expect(mockedFs.readFileSync).not.toHaveBeenCalled()
    })
  })

  describe("with APPLE_* vars (fallback)", () => {
    it("should use APPLE_* when APP_STORE_* are not set", () => {
      process.env.APPLE_KEY_ID = "apple-key"
      process.env.APPLE_ISSUER_ID = "apple-issuer"
      process.env.APPLE_APP_BUNDLE_ID = "com.apple.app"
      process.env.APPLE_PRIVATE_KEY_PATH = mockPrivateKey

      const config = getStoreKitConfigFromEnv()

      expect(config.keyId).toBe("apple-key")
      expect(config.issuerId).toBe("apple-issuer")
      expect(config.bundleId).toBe("com.apple.app")
      expect(config.privateKey).toBe(mockPrivateKey)
    })

    it("should prefer APP_STORE_* over APPLE_* when both set", () => {
      process.env.APP_STORE_KIT_KEY_ID = "store-key"
      process.env.APP_STORE_ISSUER_ID = "store-issuer"
      process.env.APP_STORE_BUNDLE_ID = "com.store"
      process.env.APP_STORE_KIT_KEY = mockPrivateKey
      process.env.APPLE_KEY_ID = "apple-key"
      process.env.APPLE_ISSUER_ID = "apple-issuer"

      const config = getStoreKitConfigFromEnv()

      expect(config.keyId).toBe("store-key")
      expect(config.issuerId).toBe("store-issuer")
    })
  })

  describe("error handling", () => {
    it("should throw when keyId is missing", () => {
      process.env.APP_STORE_ISSUER_ID = "issuer"
      process.env.APP_STORE_BUNDLE_ID = "com.test"
      process.env.APP_STORE_KIT_KEY = mockPrivateKey

      expect(() => getStoreKitConfigFromEnv()).toThrow("StoreKit config incomplete")
    })

    it("should throw when issuerId is missing", () => {
      process.env.APP_STORE_KIT_KEY_ID = "key"
      process.env.APP_STORE_BUNDLE_ID = "com.test"
      process.env.APP_STORE_KIT_KEY = mockPrivateKey

      expect(() => getStoreKitConfigFromEnv()).toThrow("StoreKit config incomplete")
    })

    it("should throw when bundleId is missing", () => {
      process.env.APP_STORE_KIT_KEY_ID = "key"
      process.env.APP_STORE_ISSUER_ID = "issuer"
      process.env.APP_STORE_KIT_KEY = mockPrivateKey

      expect(() => getStoreKitConfigFromEnv()).toThrow("StoreKit config incomplete")
    })

    it("should throw when private key is missing", () => {
      process.env.APP_STORE_KIT_KEY_ID = "key"
      process.env.APP_STORE_ISSUER_ID = "issuer"
      process.env.APP_STORE_BUNDLE_ID = "com.test"

      expect(() => getStoreKitConfigFromEnv()).toThrow("StoreKit config incomplete")
    })

    it("should throw when file read fails for APP_IS_LOCAL", () => {
      process.env.APP_STORE_KIT_KEY_ID = "key"
      process.env.APP_STORE_ISSUER_ID = "issuer"
      process.env.APP_STORE_BUNDLE_ID = "com.test"
      process.env.APP_STORE_KIT_KEY = "/nonexistent/key.p8"
      process.env.APP_IS_LOCAL = "true"
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error("ENOENT: no such file")
      })

      expect(() => getStoreKitConfigFromEnv()).toThrow("Failed to read StoreKit private key")
    })
  })
})
