import axios from "axios"
import { AppStoreSubscriptionService } from "../src/services/subscription.service"
import { STOREKIT_PRODUCTION_BASE, STOREKIT_SANDBOX_BASE } from "../src/constants/storekit.constants"

jest.mock("axios")
jest.mock("jsonwebtoken", () => ({
  ...jest.requireActual("jsonwebtoken"),
  decode: jest.fn(),
}))
jest.mock("../src/utils/storekit.token", () => ({
  generateStoreKitToken: jest.fn().mockReturnValue("mock-token"),
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
const { decode: mockedDecode } = jest.requireMock("jsonwebtoken")

describe("AppStoreSubscriptionService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedDecode.mockImplementation((token: string) => {
      if (token === "active-subscription-jwt") {
        return {
          transactionId: "1001",
          originalTransactionId: "1000",
          webOrderLineItemId: "woli",
          bundleId: "com.test",
          productId: "com.test.monthly",
          subscriptionGroupIdentifier: "group1",
          purchaseDate: Date.now() - 86400000,
          originalPurchaseDate: Date.now() - 86400000,
          expiresDate: Date.now() + 86400000 * 30,
          quantity: 1,
          type: "Auto-Renewable Subscription",
          inAppOwnershipType: "PURCHASED",
          signedDate: Date.now(),
          environment: "Production",
        }
      }
      if (token === "expired-subscription-jwt") {
        return {
          transactionId: "1002",
          originalTransactionId: "1000",
          webOrderLineItemId: "woli",
          bundleId: "com.test",
          productId: "com.test.monthly",
          subscriptionGroupIdentifier: "group1",
          purchaseDate: Date.now() - 86400000 * 60,
          originalPurchaseDate: Date.now() - 86400000 * 60,
          expiresDate: Date.now() - 86400000,
          quantity: 1,
          type: "Auto-Renewable Subscription",
          inAppOwnershipType: "PURCHASED",
          signedDate: Date.now(),
          environment: "Production",
        }
      }
      if (token === "trial-subscription-jwt") {
        return {
          transactionId: "1003",
          originalTransactionId: "1000",
          webOrderLineItemId: "woli",
          bundleId: "com.test",
          productId: "com.test.trial",
          subscriptionGroupIdentifier: "group1",
          purchaseDate: Date.now() - 86400000,
          originalPurchaseDate: Date.now() - 86400000,
          expiresDate: Date.now() + 86400000 * 7,
          quantity: 1,
          type: "Auto-Renewable Subscription",
          inAppOwnershipType: "PURCHASED",
          signedDate: Date.now(),
          environment: "Production",
          offerDiscountType: "FREE_TRIAL",
        }
      }
      return null
    })
  })

  describe("verifySubscriptionV1", () => {
    it("should return verified subscription when active", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              subscriptionGroupIdentifier: "group1",
              lastTransactions: [
                {
                  status: 1,
                  originalTransactionId: "1000",
                  signedTransactionInfo: "active-subscription-jwt",
                  signedRenewalInfo: "renewal-jwt",
                },
              ],
            },
          ],
        },
      })

      const service = new AppStoreSubscriptionService()
      const result = await service.verifySubscriptionV1(12345, false)

      expect(result).not.toBeNull()
      expect(result!.status).toBe("active")
      expect(result!.tier).toBe("active")
      expect(result!.subscriptionType).toBe("paid")
      expect(result!.productId).toBe("com.test.monthly")
      expect(result!.isTrial).toBe(false)
      expect(result!.transactionId).toBe(1001)
      expect(result!.expiresAt).toBeDefined()
      expect(result!.raw).toBeDefined()

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${STOREKIT_PRODUCTION_BASE}/inApps/v1/subscriptions/12345`,
        { headers: { Authorization: "Bearer mock-token" } }
      )
    })

    it("should return expired status when subscription has expired", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              subscriptionGroupIdentifier: "group1",
              lastTransactions: [
                {
                  status: 2,
                  originalTransactionId: "1000",
                  signedTransactionInfo: "expired-subscription-jwt",
                  signedRenewalInfo: "renewal-jwt",
                },
              ],
            },
          ],
        },
      })

      const service = new AppStoreSubscriptionService()
      const result = await service.verifySubscriptionV1(12345, false)

      expect(result).not.toBeNull()
      expect(result!.status).toBe("expired")
      expect(result!.tier).toBe("none")
      expect(result!.subscriptionType).toBe("paid")
    })

    it("should return trial subscription type when offerDiscountType is FREE_TRIAL", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              subscriptionGroupIdentifier: "group1",
              lastTransactions: [
                {
                  status: 1,
                  originalTransactionId: "1000",
                  signedTransactionInfo: "trial-subscription-jwt",
                  signedRenewalInfo: "renewal-jwt",
                },
              ],
            },
          ],
        },
      })

      const service = new AppStoreSubscriptionService()
      const result = await service.verifySubscriptionV1(12345, false)

      expect(result).not.toBeNull()
      expect(result!.subscriptionType).toBe("trial")
      expect(result!.isTrial).toBe(true)
    })

    it("should use productIdToTier when provided", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              subscriptionGroupIdentifier: "group1",
              lastTransactions: [
                {
                  status: 1,
                  originalTransactionId: "1000",
                  signedTransactionInfo: "active-subscription-jwt",
                  signedRenewalInfo: "renewal-jwt",
                },
              ],
            },
          ],
        },
      })

      const service = new AppStoreSubscriptionService({
        productIdToTier: (productId) =>
          productId === "com.test.monthly" ? "pro" : null,
      })
      const result = await service.verifySubscriptionV1(12345, false)

      expect(result!.tier).toBe("pro")
    })

    it("should return null when API throws", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Network error"))

      const service = new AppStoreSubscriptionService()
      const result = await service.verifySubscriptionV1(12345, false)

      expect(result).toBeNull()
    })

    it("should return null when data is empty", async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { data: [] } })

      const service = new AppStoreSubscriptionService()
      const result = await service.verifySubscriptionV1(12345, false)

      expect(result).toBeNull()
    })

    it("should return null when lastTransactions is empty", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              subscriptionGroupIdentifier: "group1",
              lastTransactions: [],
            },
          ],
        },
      })

      const service = new AppStoreSubscriptionService()
      const result = await service.verifySubscriptionV1(12345, false)

      expect(result).toBeNull()
    })

    it("should use sandbox URL when isSandbox is true", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              subscriptionGroupIdentifier: "group1",
              lastTransactions: [
                {
                  status: 1,
                  originalTransactionId: "1000",
                  signedTransactionInfo: "active-subscription-jwt",
                  signedRenewalInfo: "renewal-jwt",
                },
              ],
            },
          ],
        },
      })

      const service = new AppStoreSubscriptionService()
      await service.verifySubscriptionV1(12345, true)

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${STOREKIT_SANDBOX_BASE}/inApps/v1/subscriptions/12345`,
        expect.any(Object)
      )
    })
  })

  describe("getSubscriptionStatusRaw", () => {
    it("should return raw API response", async () => {
      const mockResponse = {
        environment: "Production",
        bundleId: "com.test",
        appAppleId: 123,
        data: [
          {
            subscriptionGroupIdentifier: "group1",
            lastTransactions: [],
          },
        ],
      }
      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse })

      const service = new AppStoreSubscriptionService()
      const result = await service.getSubscriptionStatusRaw(12345, false)

      expect(result).toEqual(mockResponse)
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${STOREKIT_PRODUCTION_BASE}/inApps/v1/subscriptions/12345`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer mock-token",
            "Content-Type": "application/json",
          }),
        })
      )
    })

    it("should throw on API error", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Unauthorized"))

      const service = new AppStoreSubscriptionService()

      await expect(service.getSubscriptionStatusRaw(12345, false)).rejects.toThrow(
        "Unauthorized"
      )
    })
  })

  describe("getSubscriptionStatus", () => {
    it("should return decoded status with ISO dates", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          signedTransactionInfo: "active-subscription-jwt",
        },
      })

      const service = new AppStoreSubscriptionService()
      const result = await service.getSubscriptionStatus("12345", false)

      expect(result.productId).toBe("com.test.monthly")
      expect(result.purchaseDate).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(result.originalPurchaseDate).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(result.expiresDate).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(result.signedDate).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it("should throw when signedTransactionInfo is missing", async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: {} })

      const service = new AppStoreSubscriptionService()

      await expect(service.getSubscriptionStatus("12345", false)).rejects.toThrow(
        "No subscription data found"
      )
    })

    it("should throw when decode returns null", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { signedTransactionInfo: "invalid-jwt" },
      })
      mockedDecode.mockReturnValueOnce(null)

      const service = new AppStoreSubscriptionService()

      await expect(service.getSubscriptionStatus("12345", false)).rejects.toThrow(
        "Failed to decode signedTransactionInfo"
      )
    })
  })
})
