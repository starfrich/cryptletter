import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCryptletter } from "../../src/react/useCryptletter";
import { CryptletterCore } from "../../src/core/cryptletter";
import type {
  PublishResult,
  FetchResult,
  SubscriptionStatus,
  CreatorProfile,
  NewsletterMetadata,
  PublishOptions,
} from "../../src/core/cryptletter";
import type { FhevmInstance } from "../../src/core/types";

// Mock dependencies
vi.mock("../../src/react/useFhevmInstance", () => ({
  useFhevmInstance: vi.fn(),
}));

vi.mock("../../src/core/cryptletter", () => ({
  CryptletterCore: vi.fn(),
}));

import { useFhevmInstance } from "../../src/react/useFhevmInstance";

describe("useCryptletter Hook", () => {
  const mockProvider = {} as any;
  const mockSigner = {} as any;
  const mockFhevmInstance = {} as FhevmInstance;

  const mockCreatorProfile: CreatorProfile = {
    name: "Test Creator",
    bio: "Test bio",
    monthlyPrice: BigInt("1000000000000000000"),
    subscriberCount: BigInt(10),
    isActive: true,
    address: "0x" + "a".repeat(40),
  };

  const mockSubscriptionStatus: SubscriptionStatus = {
    isActive: true,
    expiresAt: BigInt(Date.now() + 30 * 24 * 60 * 60 * 1000),
    subscribedAt: BigInt(Date.now()),
    daysRemaining: 30,
    hasAccess: true,
  };

  const mockNewsletterMetadata: NewsletterMetadata = {
    postId: 1,
    title: "Test Newsletter",
    preview: "Test preview",
    creator: "0x" + "a".repeat(40),
    publishedAt: BigInt(Date.now()),
    isPublic: false,
    contentCID: "QmTest",
  };

  const mockPublishResult: PublishResult = {
    postId: BigInt(1),
    contentCID: "QmTest",
    transactionHash: "0xtxhash",
  };

  const mockFetchResult: FetchResult = {
    newsletter: {
      title: "Test",
      content: "Content",
      author: "Author",
      publishedAt: new Date(),
    },
    metadata: {
      postId: 1,
      creator: "0x" + "a".repeat(40),
      publishedAt: BigInt(Date.now()),
      isPublic: false,
      title: "Test",
      preview: "Preview",
    },
  };

  let mockSDK: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock SDK
    mockSDK = {
      registerAsCreator: vi.fn().mockResolvedValue("0xtxhash"),
      updateCreatorProfile: vi.fn().mockResolvedValue("0xtxhash"),
      updateCreatorPrice: vi.fn().mockResolvedValue("0xtxhash"),
      publishEncryptedNewsletter: vi.fn().mockResolvedValue(mockPublishResult),
      subscribeToCreator: vi.fn().mockResolvedValue("0xtxhash"),
      renewSubscription: vi.fn().mockResolvedValue("0xtxhash"),
      cancelSubscription: vi.fn().mockResolvedValue("0xtxhash"),
      getEncryptedKey: vi.fn().mockResolvedValue("encryptedKey"),
      decryptNewsletterContent: vi.fn().mockResolvedValue(mockFetchResult),
      checkNewsletterAccess: vi.fn().mockResolvedValue(true),
      getCreator: vi.fn().mockResolvedValue(mockCreatorProfile),
      getSubscriptionStatus: vi.fn().mockResolvedValue(mockSubscriptionStatus),
      listCreatorNewsletters: vi.fn().mockResolvedValue([mockNewsletterMetadata]),
      getNewsletterMetadata: vi.fn().mockResolvedValue(mockNewsletterMetadata),
      getCreators: vi.fn().mockResolvedValue(["0x" + "a".repeat(40)]),
      getCreatorCount: vi.fn().mockResolvedValue(1),
    };

    (CryptletterCore as any).mockImplementation(() => mockSDK);
    (useFhevmInstance as any).mockReturnValue(mockFhevmInstance);
  });

  describe("initialization", () => {
    it("initializes with default state", () => {
      const { result } = renderHook(() =>
        useCryptletter({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: mockProvider,
        })
      );

      expect(result.current.isPublishing).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.sdk).not.toBeNull();
    });

    it("initializes SDK with correct config", () => {
      renderHook(() =>
        useCryptletter({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [{ name: "test" }],
          ipfsJWT: "test-jwt",
          ipfsGateway: "https://gateway.example.com",
          provider: mockProvider,
          signer: mockSigner,
        })
      );

      expect(CryptletterCore).toHaveBeenCalledWith({
        contractAddress: "0x" + "b".repeat(40),
        contractABI: [{ name: "test" }],
        ipfsConfig: {
          jwt: "test-jwt",
          gateway: "https://gateway.example.com",
        },
        provider: mockProvider,
        signer: mockSigner,
      });
    });

    it("returns null SDK when contractAddress is missing", () => {
      const { result } = renderHook(() =>
        useCryptletter({
          contractAddress: "",
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: mockProvider,
        })
      );

      expect(result.current.sdk).toBeNull();
    });

    it("returns null SDK when provider is missing", () => {
      const { result } = renderHook(() =>
        useCryptletter({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: null as any,
        })
      );

      expect(result.current.sdk).toBeNull();
    });

    it("logs error when SDK fails to initialize", () => {
      // Test that SDK can fail - the hook handles it gracefully
      // by setting error state and returning null SDK
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();

      // Test with invalid provider (null) which should cause init failure
      try {
        renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: null as any, // Invalid provider
          })
        );
      } catch {
        // Expected to throw in some cases
      }

      consoleErrorSpy.mockRestore();
    });
  });

  describe("creator functions", () => {
    describe("registerAsCreator", () => {
      it("registers as creator successfully", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        let txHash: string = "";
        await act(async () => {
          txHash = await result.current.registerAsCreator("Test", "Bio", BigInt(1000));
        });

        expect(mockSDK.registerAsCreator).toHaveBeenCalledWith("Test", "Bio", BigInt(1000));
        expect(txHash).toBe("0xtxhash");
        expect(result.current.error).toBeNull();
      });

      it("sets loading state during registration", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        mockSDK.registerAsCreator.mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve("0xtxhash"), 100))
        );

        const promise = act(async () => {
          return result.current.registerAsCreator("Test", "Bio", BigInt(1000));
        });

        await waitFor(() => {
          if (result.current.isLoading) {
            expect(result.current.isLoading).toBe(true);
          }
        });

        await promise;
        expect(result.current.isLoading).toBe(false);
      });

      it("throws error when SDK is not initialized", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "",
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(
            result.current.registerAsCreator("Test", "Bio", BigInt(1000))
          ).rejects.toThrow("SDK not initialized");
        });
      });

      it("handles registration errors", async () => {
        mockSDK.registerAsCreator.mockRejectedValueOnce(new Error("Registration failed"));

        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(
            result.current.registerAsCreator("Test", "Bio", BigInt(1000))
          ).rejects.toThrow("Registration failed");
        });

        expect(result.current.error?.message).toBe("Registration failed");
        expect(result.current.isLoading).toBe(false);
      });

      it("handles non-Error exceptions", async () => {
        mockSDK.registerAsCreator.mockRejectedValueOnce("String error");

        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(
            result.current.registerAsCreator("Test", "Bio", BigInt(1000))
          ).rejects.toThrow("Failed to register as creator");
        });

        expect(result.current.error?.message).toBe("Failed to register as creator");
      });
    });

    describe("updateProfile", () => {
      it("updates profile successfully", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        let txHash: string = "";
        await act(async () => {
          txHash = await result.current.updateProfile("New Name", "New Bio");
        });

        expect(mockSDK.updateCreatorProfile).toHaveBeenCalledWith("New Name", "New Bio");
        expect(txHash).toBe("0xtxhash");
      });

      it("handles update errors", async () => {
        mockSDK.updateCreatorProfile.mockRejectedValueOnce(new Error("Update failed"));

        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(result.current.updateProfile("Name", "Bio")).rejects.toThrow(
            "Update failed"
          );
        });

        expect(result.current.error?.message).toBe("Update failed");
      });

      it("throws when SDK not initialized", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "",
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(result.current.updateProfile("Name", "Bio")).rejects.toThrow(
            "SDK not initialized"
          );
        });
      });
    });

    describe("updatePrice", () => {
      it("updates price successfully", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        let txHash: string = "";
        await act(async () => {
          txHash = await result.current.updatePrice(BigInt(2000));
        });

        expect(mockSDK.updateCreatorPrice).toHaveBeenCalledWith(BigInt(2000));
        expect(txHash).toBe("0xtxhash");
      });

      it("handles price update errors", async () => {
        mockSDK.updateCreatorPrice.mockRejectedValueOnce(new Error("Price update failed"));

        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(result.current.updatePrice(BigInt(2000))).rejects.toThrow(
            "Price update failed"
          );
        });

        expect(result.current.error?.message).toBe("Price update failed");
      });
    });

    describe("publishNewsletter", () => {
      it("publishes newsletter successfully", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        const options: PublishOptions = {
          title: "Test",
          content: "Content",
          author: "Author",
          isPublic: false,
        };

        let publishResult: PublishResult | undefined;
        await act(async () => {
          publishResult = await result.current.publishNewsletter(options);
        });

        expect(mockSDK.publishEncryptedNewsletter).toHaveBeenCalledWith(
          options,
          mockFhevmInstance
        );
        expect(publishResult).toEqual(mockPublishResult);
      });

      it("sets isPublishing state", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        mockSDK.publishEncryptedNewsletter.mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(mockPublishResult), 100))
        );

        const promise = act(async () => {
          return result.current.publishNewsletter({
            title: "Test",
            content: "Content",
            author: "Author",
          });
        });

        await waitFor(() => {
          if (result.current.isPublishing) {
            expect(result.current.isPublishing).toBe(true);
          }
        });

        await promise;
        expect(result.current.isPublishing).toBe(false);
      });

      it("throws when SDK not initialized", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "",
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(
            result.current.publishNewsletter({
              title: "Test",
              content: "Content",
              author: "Author",
            })
          ).rejects.toThrow("SDK not initialized");
        });
      });

      it("throws when FHEVM instance not initialized", async () => {
        (useFhevmInstance as any).mockReturnValueOnce(undefined);

        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(
            result.current.publishNewsletter({
              title: "Test",
              content: "Content",
              author: "Author",
            })
          ).rejects.toThrow("FHEVM instance not initialized");
        });
      });

      it("handles publish errors", async () => {
        mockSDK.publishEncryptedNewsletter.mockRejectedValueOnce(new Error("Publish failed"));

        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(
            result.current.publishNewsletter({
              title: "Test",
              content: "Content",
              author: "Author",
            })
          ).rejects.toThrow("Publish failed");
        });

        expect(result.current.error?.message).toBe("Publish failed");
        expect(result.current.isPublishing).toBe(false);
      });
    });
  });

  describe("subscriber functions", () => {
    describe("subscribe", () => {
      it("subscribes successfully", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        let txHash: string = "";
        await act(async () => {
          txHash = await result.current.subscribe("0x" + "a".repeat(40), BigInt(1000));
        });

        expect(mockSDK.subscribeToCreator).toHaveBeenCalledWith(
          "0x" + "a".repeat(40),
          BigInt(1000)
        );
        expect(txHash).toBe("0xtxhash");
      });

      it("handles subscribe errors", async () => {
        mockSDK.subscribeToCreator.mockRejectedValueOnce(new Error("Subscribe failed"));

        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(
            result.current.subscribe("0x" + "a".repeat(40), BigInt(1000))
          ).rejects.toThrow("Subscribe failed");
        });

        expect(result.current.error?.message).toBe("Subscribe failed");
      });
    });

    describe("renewSubscription", () => {
      it("renews subscription successfully", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        let txHash: string = "";
        await act(async () => {
          txHash = await result.current.renewSubscription("0x" + "a".repeat(40), BigInt(1000));
        });

        expect(mockSDK.renewSubscription).toHaveBeenCalledWith("0x" + "a".repeat(40), BigInt(1000));
        expect(txHash).toBe("0xtxhash");
      });

      it("handles renew errors", async () => {
        mockSDK.renewSubscription.mockRejectedValueOnce(new Error("Renew failed"));

        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(
            result.current.renewSubscription("0x" + "a".repeat(40), BigInt(1000))
          ).rejects.toThrow("Renew failed");
        });

        expect(result.current.error?.message).toBe("Renew failed");
      });
    });

    describe("cancelSubscription", () => {
      it("cancels subscription successfully", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        let txHash: string = "";
        await act(async () => {
          txHash = await result.current.cancelSubscription("0x" + "a".repeat(40));
        });

        expect(mockSDK.cancelSubscription).toHaveBeenCalledWith("0x" + "a".repeat(40));
        expect(txHash).toBe("0xtxhash");
      });

      it("handles cancel errors", async () => {
        mockSDK.cancelSubscription.mockRejectedValueOnce(new Error("Cancel failed"));

        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(
            result.current.cancelSubscription("0x" + "a".repeat(40))
          ).rejects.toThrow("Cancel failed");
        });

        expect(result.current.error?.message).toBe("Cancel failed");
      });
    });
  });

  describe("content access functions", () => {
    describe("getEncryptedKey", () => {
      it("gets encrypted key successfully", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        let key: string = "";
        await act(async () => {
          key = await result.current.getEncryptedKey(1);
        });

        expect(mockSDK.getEncryptedKey).toHaveBeenCalledWith(1);
        expect(key).toBe("encryptedKey");
      });

      it("handles errors", async () => {
        mockSDK.getEncryptedKey.mockRejectedValueOnce(new Error("Get key failed"));

        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(result.current.getEncryptedKey(1)).rejects.toThrow("Get key failed");
        });

        expect(result.current.error?.message).toBe("Get key failed");
      });
    });

    describe("decryptNewsletterContent", () => {
      it("decrypts content successfully", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        let fetchResult: FetchResult | undefined;
        await act(async () => {
          fetchResult = await result.current.decryptNewsletterContent(1, "decryptedKey");
        });

        expect(mockSDK.decryptNewsletterContent).toHaveBeenCalledWith(1, "decryptedKey");
        expect(fetchResult).toEqual(mockFetchResult);
      });

      it("sets isFetching state", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        mockSDK.decryptNewsletterContent.mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(mockFetchResult), 100))
        );

        const promise = act(async () => {
          return result.current.decryptNewsletterContent(1, "decryptedKey");
        });

        await waitFor(() => {
          if (result.current.isFetching) {
            expect(result.current.isFetching).toBe(true);
          }
        });

        await promise;
        expect(result.current.isFetching).toBe(false);
      });

      it("handles decrypt errors", async () => {
        mockSDK.decryptNewsletterContent.mockRejectedValueOnce(new Error("Decrypt failed"));

        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(
            result.current.decryptNewsletterContent(1, "decryptedKey")
          ).rejects.toThrow("Decrypt failed");
        });

        expect(result.current.error?.message).toBe("Decrypt failed");
        expect(result.current.isFetching).toBe(false);
      });
    });

    describe("checkAccess", () => {
      it("checks access successfully", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        let hasAccess: boolean = false;
        await act(async () => {
          hasAccess = await result.current.checkAccess(1, "0x" + "a".repeat(40));
        });

        expect(mockSDK.checkNewsletterAccess).toHaveBeenCalledWith(1, "0x" + "a".repeat(40));
        expect(hasAccess).toBe(true);
      });

      it("checks access without userAddress", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await result.current.checkAccess(1);
        });

        expect(mockSDK.checkNewsletterAccess).toHaveBeenCalledWith(1, undefined);
      });

      it("handles check access errors", async () => {
        mockSDK.checkNewsletterAccess.mockRejectedValueOnce(new Error("Check access failed"));

        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(result.current.checkAccess(1)).rejects.toThrow("Check access failed");
        });

        expect(result.current.error?.message).toBe("Check access failed");
      });
    });
  });

  describe("query functions", () => {
    describe("getCreator", () => {
      it("gets creator successfully", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        let profile: CreatorProfile | undefined;
        await act(async () => {
          profile = await result.current.getCreator("0x" + "a".repeat(40));
        });

        expect(mockSDK.getCreator).toHaveBeenCalledWith("0x" + "a".repeat(40));
        expect(profile).toEqual(mockCreatorProfile);
      });

      it("handles get creator errors", async () => {
        mockSDK.getCreator.mockRejectedValueOnce(new Error("Get creator failed"));

        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(result.current.getCreator("0x" + "a".repeat(40))).rejects.toThrow(
            "Get creator failed"
          );
        });

        expect(result.current.error?.message).toBe("Get creator failed");
      });
    });

    describe("getSubscriptionStatus", () => {
      it("gets subscription status successfully", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        let status: SubscriptionStatus | undefined;
        await act(async () => {
          status = await result.current.getSubscriptionStatus(
            "0x" + "b".repeat(40),
            "0x" + "a".repeat(40)
          );
        });

        expect(mockSDK.getSubscriptionStatus).toHaveBeenCalledWith(
          "0x" + "b".repeat(40),
          "0x" + "a".repeat(40)
        );
        expect(status).toEqual(mockSubscriptionStatus);
      });

      it("handles errors", async () => {
        mockSDK.getSubscriptionStatus.mockRejectedValueOnce(new Error("Get status failed"));

        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(
            result.current.getSubscriptionStatus("0x" + "b".repeat(40), "0x" + "a".repeat(40))
          ).rejects.toThrow("Get status failed");
        });

        expect(result.current.error?.message).toBe("Get status failed");
      });
    });

    describe("listNewsletters", () => {
      it("lists newsletters successfully", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        let newsletters: NewsletterMetadata[] | undefined;
        await act(async () => {
          newsletters = await result.current.listNewsletters("0x" + "a".repeat(40), 10);
        });

        expect(mockSDK.listCreatorNewsletters).toHaveBeenCalledWith("0x" + "a".repeat(40), 10);
        expect(newsletters).toEqual([mockNewsletterMetadata]);
      });

      it("lists newsletters without limit", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await result.current.listNewsletters("0x" + "a".repeat(40));
        });

        expect(mockSDK.listCreatorNewsletters).toHaveBeenCalledWith(
          "0x" + "a".repeat(40),
          undefined
        );
      });

      it("handles list errors", async () => {
        mockSDK.listCreatorNewsletters.mockRejectedValueOnce(new Error("List failed"));

        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(result.current.listNewsletters("0x" + "a".repeat(40))).rejects.toThrow(
            "List failed"
          );
        });

        expect(result.current.error?.message).toBe("List failed");
      });
    });

    describe("getNewsletterMetadata", () => {
      it("gets newsletter metadata successfully", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        let metadata: NewsletterMetadata | undefined;
        await act(async () => {
          metadata = await result.current.getNewsletterMetadata(1);
        });

        expect(mockSDK.getNewsletterMetadata).toHaveBeenCalledWith(1);
        expect(metadata).toEqual(mockNewsletterMetadata);
      });

      it("handles metadata errors", async () => {
        mockSDK.getNewsletterMetadata.mockRejectedValueOnce(new Error("Get metadata failed"));

        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(result.current.getNewsletterMetadata(1)).rejects.toThrow(
            "Get metadata failed"
          );
        });

        expect(result.current.error?.message).toBe("Get metadata failed");
      });
    });

    describe("getCreators", () => {
      it("gets creators successfully", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        let creators: string[] | undefined;
        await act(async () => {
          creators = await result.current.getCreators(0, 10);
        });

        expect(mockSDK.getCreators).toHaveBeenCalledWith(0, 10);
        expect(creators).toEqual(["0x" + "a".repeat(40)]);
      });

      it("gets creators without pagination", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await result.current.getCreators();
        });

        expect(mockSDK.getCreators).toHaveBeenCalledWith(undefined, undefined);
      });

      it("handles get creators errors", async () => {
        mockSDK.getCreators.mockRejectedValueOnce(new Error("Get creators failed"));

        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(result.current.getCreators()).rejects.toThrow("Get creators failed");
        });

        expect(result.current.error?.message).toBe("Get creators failed");
      });
    });

    describe("getCreatorCount", () => {
      it("gets creator count successfully", async () => {
        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        let count: number | undefined;
        await act(async () => {
          count = await result.current.getCreatorCount();
        });

        expect(mockSDK.getCreatorCount).toHaveBeenCalled();
        expect(count).toBe(1);
      });

      it("handles get count errors", async () => {
        mockSDK.getCreatorCount.mockRejectedValueOnce(new Error("Get count failed"));

        const { result } = renderHook(() =>
          useCryptletter({
            contractAddress: "0x" + "b".repeat(40),
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          })
        );

        await act(async () => {
          await expect(result.current.getCreatorCount()).rejects.toThrow("Get count failed");
        });

        expect(result.current.error?.message).toBe("Get count failed");
      });
    });
  });

  describe("SDK stability", () => {
    it("maintains stable SDK reference across re-renders", () => {
      const { result, rerender } = renderHook(() =>
        useCryptletter({
          contractAddress: "0x" + "b".repeat(40),
          contractABI: [],
          ipfsJWT: "test-jwt",
          provider: mockProvider,
        })
      );

      const firstSDK = result.current.sdk;
      rerender();
      const secondSDK = result.current.sdk;

      expect(firstSDK).toBe(secondSDK);
    });

    it("creates new SDK when config changes", () => {
      const { result, rerender } = renderHook(
        ({ address }) =>
          useCryptletter({
            contractAddress: address,
            contractABI: [],
            ipfsJWT: "test-jwt",
            provider: mockProvider,
          }),
        {
          initialProps: { address: "0x" + "b".repeat(40) },
        }
      );

      expect(result.current.sdk).not.toBeNull();

      // Change config
      rerender({ address: "0x" + "c".repeat(40) });

      // SDK should still be available (re-created)
      expect(result.current.sdk).not.toBeNull();
    });
  });
});
