import axios from "axios"
import {
  getAppStoreApiBaseUrl,
  decodeSubscriptionStatus,
  sendTestNotification,
  APPLE_STATUS_CODES,
} from "../src/utils/storekit.utils"
import {
  APP_STORE_API_PRODUCTION,
  APP_STORE_API_SANDBOX,
} from "../src/constants/storekit.constants"

jest.mock("axios")
jest.mock("../src/utils/storekit.token", () => ({
  generateStoreKitToken: jest.fn().mockReturnValue("mock-storekit-token"),
}))
jest.mock("../src/config/storekit.config", () => ({
  getStoreKitConfigFromEnv: jest.fn().mockReturnValue({
    keyId: "test",
    issuerId: "test",
    bundleId: "com.test",
    privateKey: "-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----",
  }),
}))

const mockedAxios = axios as jest.Mocked<typeof axios>

describe("storekit.utils", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("APPLE_STATUS_CODES", () => {
    it("should have correct numeric values", () => {
      expect(APPLE_STATUS_CODES.ACTIVE).toBe(1)
      expect(APPLE_STATUS_CODES.EXPIRED).toBe(2)
      expect(APPLE_STATUS_CODES.BILLING_RETRY).toBe(3)
      expect(APPLE_STATUS_CODES.BILLING_GRACE).toBe(4)
      expect(APPLE_STATUS_CODES.REVOKED).toBe(5)
    })
  })

  describe("getAppStoreApiBaseUrl", () => {
    it("should return production URL when isSandbox is false", () => {
      expect(getAppStoreApiBaseUrl(false)).toBe(APP_STORE_API_PRODUCTION)
      expect(getAppStoreApiBaseUrl()).toBe(APP_STORE_API_PRODUCTION)
    })

    it("should return sandbox URL when isSandbox is true", () => {
      expect(getAppStoreApiBaseUrl(true)).toBe(APP_STORE_API_SANDBOX)
    })
  })

  describe("decodeSubscriptionStatus", () => {
    it("should decode status 1 as active", () => {
      const result = decodeSubscriptionStatus(1)
      expect(result.status).toBe("active")
      expect(result.isActive).toBe(true)
      expect(result.description).toContain("active")
    })

    it("should decode status 2 as expired", () => {
      const result = decodeSubscriptionStatus(2)
      expect(result.status).toBe("expired")
      expect(result.isActive).toBe(false)
      expect(result.description).toContain("expired")
    })

    it("should decode status 3 as billing_retry", () => {
      const result = decodeSubscriptionStatus(3)
      expect(result.status).toBe("billing_retry")
      expect(result.isActive).toBe(true)
      expect(result.description).toContain("retrying")
    })

    it("should decode status 4 as grace_period", () => {
      const result = decodeSubscriptionStatus(4)
      expect(result.status).toBe("grace_period")
      expect(result.isActive).toBe(true)
      expect(result.description).toContain("grace period")
    })

    it("should decode status 5 as revoked", () => {
      const result = decodeSubscriptionStatus(5)
      expect(result.status).toBe("revoked")
      expect(result.isActive).toBe(false)
      expect(result.description).toContain("refunded")
    })

    it("should decode unknown status as unknown", () => {
      const result = decodeSubscriptionStatus(99)
      expect(result.status).toBe("unknown")
      expect(result.isActive).toBe(false)
      expect(result.description).toContain("99")
    })

    it("should decode status 0 as unknown", () => {
      const result = decodeSubscriptionStatus(0)
      expect(result.status).toBe("unknown")
    })
  })

  describe("sendTestNotification", () => {
    it("should send test notification to production URL", async () => {
      const mockResponse = { testNotificationToken: "token-123" }
      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse })

      const result = await sendTestNotification()

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${APP_STORE_API_PRODUCTION}/notifications/test`,
        {},
        {
          headers: {
            Authorization: "Bearer mock-storekit-token",
            "Content-Type": "application/json",
          },
        }
      )
      expect(result).toEqual(mockResponse)
    })

    it("should send test notification to sandbox URL when sandbox is true", async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: {} })

      await sendTestNotification({ sandbox: true })

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${APP_STORE_API_SANDBOX}/notifications/test`,
        expect.any(Object),
        expect.any(Object)
      )
    })

    it("should use provided storeKitConfig when passed", async () => {
      const { generateStoreKitToken } = jest.requireMock("../src/utils/storekit.token")
      ;(generateStoreKitToken as jest.Mock).mockReturnValueOnce("custom-token")
      mockedAxios.post.mockResolvedValueOnce({ data: {} })

      await sendTestNotification({
        storeKitConfig: {
          keyId: "custom",
          issuerId: "custom",
          bundleId: "com.custom",
          privateKey: "-----BEGIN PRIVATE KEY-----\nX\n-----END PRIVATE KEY-----",
        },
      })

      expect(generateStoreKitToken).toHaveBeenCalledWith(
        expect.objectContaining({
          keyId: "custom",
          bundleId: "com.custom",
        })
      )
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        {},
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer custom-token",
          }),
        })
      )
    })

    it("should throw on API error", async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error("Network error"))

      await expect(sendTestNotification()).rejects.toThrow("Network error")
    })

    it("should throw on 401", async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error("Request failed with status code 401"))

      await expect(sendTestNotification()).rejects.toThrow("401")
    })
  })
})
