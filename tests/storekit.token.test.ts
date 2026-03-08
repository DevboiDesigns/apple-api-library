import jwt from "jsonwebtoken"
import { generateStoreKitToken } from "../src/utils/storekit.token"

jest.mock("../src/config/storekit.config", () => ({
  getStoreKitConfigFromEnv: jest.fn(),
}))
jest.mock("jsonwebtoken", () => ({
  ...jest.requireActual("jsonwebtoken"),
  sign: jest.fn((payload: object) => {
    return [
      Buffer.from(JSON.stringify({ alg: "ES256", kid: "test", typ: "JWT" })).toString("base64url"),
      Buffer.from(JSON.stringify(payload)).toString("base64url"),
      "sig",
    ].join(".")
  }),
}))

const mockPrivateKey = "mock-key"
const { getStoreKitConfigFromEnv } = jest.requireMock("../src/config/storekit.config")

describe("generateStoreKitToken", () => {
  const mockConfig = {
    keyId: "test-key-id",
    issuerId: "test-issuer-id",
    bundleId: "com.test.app",
    privateKey: mockPrivateKey,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getStoreKitConfigFromEnv as jest.Mock).mockReturnValue(mockConfig)
  })

  describe("with explicit config", () => {
    it("should generate a valid JWT token", () => {
      const token = generateStoreKitToken(mockConfig)

      expect(typeof token).toBe("string")
      expect(token.length).toBeGreaterThan(0)
      expect(getStoreKitConfigFromEnv).not.toHaveBeenCalled()
    })

    it("should include correct payload properties", () => {
      const token = generateStoreKitToken(mockConfig)
      const parts = token.split(".")
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString())

      expect(payload).toHaveProperty("iss", mockConfig.issuerId)
      expect(payload).toHaveProperty("iat")
      expect(payload).toHaveProperty("exp")
      expect(payload).toHaveProperty("aud", "appstoreconnect-v1")
      expect(payload).toHaveProperty("bid", mockConfig.bundleId)
    })

    it("should set token expiration to 20 minutes", () => {
      const token = generateStoreKitToken(mockConfig)
      const parts = token.split(".")
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString())

      expect(payload.exp - payload.iat).toBe(20 * 60)
    })
  })

  describe("with env config", () => {
    it("should call getStoreKitConfigFromEnv when no config provided", () => {
      generateStoreKitToken()

      expect(getStoreKitConfigFromEnv).toHaveBeenCalledTimes(1)
    })

    it("should generate token using env config", () => {
      const token = generateStoreKitToken()

      expect(typeof token).toBe("string")
      expect(token.length).toBeGreaterThan(0)
    })
  })

  describe("error handling", () => {
    it("should call sign with correct options", () => {
      const { sign } = jest.requireMock("jsonwebtoken")
      generateStoreKitToken(mockConfig)
      expect(sign).toHaveBeenCalledWith(
        expect.objectContaining({
          iss: mockConfig.issuerId,
          aud: "appstoreconnect-v1",
          bid: mockConfig.bundleId,
        }),
        mockPrivateKey,
        expect.objectContaining({
          header: expect.objectContaining({
            alg: "ES256",
            kid: mockConfig.keyId,
            typ: "JWT",
          }),
        })
      )
    })

    it("should throw when getStoreKitConfigFromEnv throws", () => {
      ;(getStoreKitConfigFromEnv as jest.Mock).mockImplementation(() => {
        throw new Error("StoreKit config incomplete")
      })

      expect(() => generateStoreKitToken()).toThrow("StoreKit config incomplete")
    })
  })
})
