import jwt from "jsonwebtoken"
import jwkToPem from "jwk-to-pem"
import axios from "axios"
import { AppStoreNotificationVerifier } from "../src/services/notification.verifier"
import {
  APPLE_PUBLIC_KEYS_URL,
  APPLE_SANDBOX_PUBLIC_KEYS_URL,
} from "../src/constants/storekit.constants"

jest.mock("jsonwebtoken")
jest.mock("jwk-to-pem")
jest.mock("axios")

const mockedJwt = jwt as jest.Mocked<typeof jwt>
const mockedJwkToPem = jwkToPem as jest.MockedFunction<typeof jwkToPem>
const mockedAxios = axios as jest.Mocked<typeof axios>

describe("AppStoreNotificationVerifier", () => {
  const mockPublicKey = "-----BEGIN PUBLIC KEY-----\nMOCK\n-----END PUBLIC KEY-----"

  const mockNotificationPayload = {
    notificationType: "SUBSCRIBED" as const,
    notificationUUID: "uuid-123",
    data: {
      appAppleId: 123,
      bundleId: "com.test",
      environment: "Production" as const,
      signedTransactionInfo: "signed-tx-jwt",
      signedRenewalInfo: "signed-renewal-jwt",
    },
    version: "2.0",
  }

  const mockTransactionPayload = {
    originalTransactionId: "1000",
    webOrderLineItemId: "woli",
    productId: "com.test.monthly",
    subscriptionGroupIdentifier: "group1",
    purchaseDate: Date.now(),
    expiresDate: Date.now() + 86400000 * 30,
    environment: "Production",
  }

  const mockRenewalPayload = {
    autoRenewStatus: 1,
    autoRenewProductId: "com.test.monthly",
  }

  beforeEach(() => {
    jest.clearAllMocks()
    AppStoreNotificationVerifier.clearKeysCache()
    mockedJwkToPem.mockReturnValue(mockPublicKey)
  })

  describe("verifyAndDecodeNotification", () => {
    it("should verify and decode notification with kid in header", async () => {
      mockedJwt.decode.mockReturnValue({
        header: { kid: "key-123", alg: "ES256" },
        payload: {},
        signature: "",
      } as any)
      mockedJwt.verify.mockReturnValue(mockNotificationPayload as any)
      mockedAxios.get.mockResolvedValueOnce({
        data: { keys: [{ kid: "key-123" }] },
      })

      const verifier = new AppStoreNotificationVerifier()
      const result = await verifier.verifyAndDecodeNotification("jwt-token")

      expect(result).toEqual(mockNotificationPayload)
      expect(mockedJwt.decode).toHaveBeenCalledWith("jwt-token", { complete: true })
      expect(mockedAxios.get).toHaveBeenCalledWith(APPLE_PUBLIC_KEYS_URL)
      expect(mockedJwt.verify).toHaveBeenCalledWith(
        "jwt-token",
        mockPublicKey,
        { algorithms: ["ES256"] }
      )
    })

    it("should verify and decode notification with x5c in header", async () => {
      mockedJwt.decode.mockReturnValue({
        header: { x5c: ["cert-base64"], alg: "ES256" },
        payload: {},
        signature: "",
      } as any)
      mockedJwt.verify.mockReturnValue(mockNotificationPayload as any)

      const verifier = new AppStoreNotificationVerifier()
      const result = await verifier.verifyAndDecodeNotification("jwt-token")

      expect(result).toEqual(mockNotificationPayload)
      expect(mockedAxios.get).not.toHaveBeenCalled()
      expect(mockedJwt.verify).toHaveBeenCalledWith(
        "jwt-token",
        expect.stringContaining("-----BEGIN CERTIFICATE-----"),
        { algorithms: ["ES256"] }
      )
    })

    it("should return null when header is missing", async () => {
      mockedJwt.decode.mockReturnValue(null)

      const verifier = new AppStoreNotificationVerifier()
      const result = await verifier.verifyAndDecodeNotification("jwt-token")

      expect(result).toBeNull()
    })

    it("should return null when header has neither kid nor x5c", async () => {
      mockedJwt.decode.mockReturnValue({
        header: { alg: "ES256" },
        payload: {},
        signature: "",
      } as any)

      const verifier = new AppStoreNotificationVerifier()
      const result = await verifier.verifyAndDecodeNotification("jwt-token")

      expect(result).toBeNull()
    })

    it("should return null when public key not found for kid", async () => {
      mockedJwt.decode.mockReturnValue({
        header: { kid: "unknown-key", alg: "ES256" },
        payload: {},
        signature: "",
      } as any)
      mockedAxios.get
        .mockResolvedValueOnce({ data: { keys: [{ kid: "other-key" }] } })
        .mockResolvedValueOnce({ data: { keys: [{ kid: "other-key" }] } })

      const verifier = new AppStoreNotificationVerifier()
      const result = await verifier.verifyAndDecodeNotification("jwt-token")

      expect(result).toBeNull()
    })

    it("should return null when JWT verification fails", async () => {
      mockedJwt.decode.mockReturnValue({
        header: { kid: "key-123", alg: "ES256" },
        payload: {},
        signature: "",
      } as any)
      mockedAxios.get.mockResolvedValueOnce({
        data: { keys: [{ kid: "key-123" }] },
      })
      mockedJwt.verify.mockImplementation(() => {
        throw new Error("Invalid signature")
      })

      const verifier = new AppStoreNotificationVerifier()
      const result = await verifier.verifyAndDecodeNotification("jwt-token")

      expect(result).toBeNull()
    })

    it("should try sandbox keys when production keys do not match", async () => {
      mockedJwt.decode.mockReturnValue({
        header: { kid: "sandbox-key", alg: "ES256" },
        payload: {},
        signature: "",
      } as any)
      mockedAxios.get
        .mockResolvedValueOnce({ data: { keys: [{ kid: "prod-key" }] } })
        .mockResolvedValueOnce({ data: { keys: [{ kid: "sandbox-key" }] } })
      mockedJwt.verify.mockReturnValue(mockNotificationPayload as any)

      const verifier = new AppStoreNotificationVerifier()
      const result = await verifier.verifyAndDecodeNotification("jwt-token")

      expect(result).toEqual(mockNotificationPayload)
      expect(mockedAxios.get).toHaveBeenCalledWith(APPLE_PUBLIC_KEYS_URL)
      expect(mockedAxios.get).toHaveBeenCalledWith(APPLE_SANDBOX_PUBLIC_KEYS_URL)
    })
  })

  describe("decodeSignedData", () => {
    it("should decode transaction data with kid", async () => {
      mockedJwt.decode.mockReturnValue({
        header: { kid: "key-123", alg: "ES256" },
        payload: {},
        signature: "",
      } as any)
      mockedAxios.get.mockResolvedValueOnce({
        data: { keys: [{ kid: "key-123" }] },
      })
      mockedJwt.verify.mockReturnValue(mockTransactionPayload as any)

      const verifier = new AppStoreNotificationVerifier()
      const result = await verifier.decodeSignedData(
        "signed-tx-jwt",
        "transaction"
      )

      expect(result).toEqual(mockTransactionPayload)
      expect(mockedJwt.verify).toHaveBeenCalledWith(
        "signed-tx-jwt",
        mockPublicKey,
        { algorithms: ["ES256"] }
      )
    })

    it("should decode renewal data", async () => {
      mockedJwt.decode.mockReturnValue({
        header: { kid: "key-123", alg: "ES256" },
        payload: {},
        signature: "",
      } as any)
      mockedAxios.get.mockResolvedValueOnce({
        data: { keys: [{ kid: "key-123" }] },
      })
      mockedJwt.verify.mockReturnValue(mockRenewalPayload as any)

      const verifier = new AppStoreNotificationVerifier()
      const result = await verifier.decodeSignedData(
        "signed-renewal-jwt",
        "renewal"
      )

      expect(result).toEqual(mockRenewalPayload)
    })

    it("should return null when header is missing", async () => {
      mockedJwt.decode.mockReturnValue(null)

      const verifier = new AppStoreNotificationVerifier()
      const result = await verifier.decodeSignedData("invalid", "transaction")

      expect(result).toBeNull()
    })

    it("should return null when verification fails", async () => {
      mockedJwt.decode.mockReturnValue({
        header: { kid: "key-123", alg: "ES256" },
        payload: {},
        signature: "",
      } as any)
      mockedAxios.get.mockResolvedValueOnce({
        data: { keys: [{ kid: "key-123" }] },
      })
      mockedJwt.verify.mockImplementation(() => {
        throw new Error("Invalid")
      })

      const verifier = new AppStoreNotificationVerifier()
      const result = await verifier.decodeSignedData("bad-jwt", "transaction")

      expect(result).toBeNull()
    })
  })

  describe("getApplePublicKey cache", () => {
    it("should cache keys and reuse for subsequent calls", async () => {
      mockedJwt.decode.mockReturnValue({
        header: { kid: "key-123", alg: "ES256" },
        payload: {},
        signature: "",
      } as any)
      mockedAxios.get.mockResolvedValueOnce({
        data: { keys: [{ kid: "key-123" }] },
      })
      mockedJwt.verify.mockReturnValue(mockNotificationPayload as any)

      const verifier = new AppStoreNotificationVerifier()
      await verifier.verifyAndDecodeNotification("jwt-1")
      await verifier.verifyAndDecodeNotification("jwt-2")

      expect(mockedAxios.get).toHaveBeenCalledTimes(1)
    })
  })

  describe("clearKeysCache", () => {
    it("should clear cache so keys are fetched again", async () => {
      mockedJwt.decode.mockReturnValue({
        header: { kid: "key-123", alg: "ES256" },
        payload: {},
        signature: "",
      } as any)
      mockedAxios.get.mockResolvedValue({
        data: { keys: [{ kid: "key-123" }] },
      })
      mockedJwt.verify.mockReturnValue(mockNotificationPayload as any)

      const verifier = new AppStoreNotificationVerifier()
      await verifier.verifyAndDecodeNotification("jwt-1")
      AppStoreNotificationVerifier.clearKeysCache()
      await verifier.verifyAndDecodeNotification("jwt-2")

      expect(mockedAxios.get).toHaveBeenCalledTimes(2)
    })
  })
})
