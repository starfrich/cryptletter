/**
 * Tests for Cryptletter Core SDK
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ethers } from "ethers";
import {
  CryptletterCore,
  type CryptletterConfig,
  type PublishOptions,
} from "../../src/core/cryptletter";
import type { FhevmInstance } from "../../src/types/fhevm";
import * as encryption from "../../src/utils/encryption";
import * as ipfsUtils from "../../src/utils/ipfs";
import * as imageProcessor from "../../src/utils/imageProcessor";
import * as coreEncryption from "../../src/core/encryption";

// Mock dependencies
vi.mock("../../src/utils/encryption");
vi.mock("../../src/utils/ipfs");
vi.mock("../../src/utils/imageProcessor");
vi.mock("../../src/core/encryption");

describe("CryptletterCore", () => {
  let core: CryptletterCore;
  let mockProvider: ethers.Provider;
  let mockSigner: ethers.Signer;
  let mockContract: any;
  let mockIPFSClient: any;
  let mockFhevmInstance: Partial<FhevmInstance>;
  let config: CryptletterConfig;

  const CONTRACT_ADDRESS = "0x" + "1".repeat(40);
  const USER_ADDRESS = "0x" + "2".repeat(40);
  const CREATOR_ADDRESS = "0x" + "3".repeat(40);

  beforeEach(() => {
    // Setup mock provider
    mockProvider = {
      getNetwork: vi.fn().mockResolvedValue({ chainId: 1n }),
    } as any;

    // Setup mock signer
    mockSigner = {
      getAddress: vi.fn().mockResolvedValue(USER_ADDRESS),
      provider: mockProvider,
    } as any;

    // Setup mock contract
    mockContract = {
      publishNewsletter: vi.fn().mockResolvedValue({
        wait: vi.fn().mockResolvedValue({
          hash: "0xtxhash",
          logs: [
            {
              topics: [],
              data: "0x",
            },
          ],
        }),
      }),
      getDecryptionKey: vi.fn().mockResolvedValue("0xencryptedkey"),
      grantDecryptionPermission: vi.fn().mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ hash: "0xpermissiontx" }),
      }),
      subscribe: vi.fn().mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ hash: "0xsubscribetx" }),
      }),
      renewSubscription: vi.fn().mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ hash: "0xrenewtx" }),
      }),
      cancelSubscription: vi.fn().mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ hash: "0xcanceltx" }),
      }),
      canAccessNewsletter: vi.fn().mockResolvedValue(true),
      getCreator: vi.fn().mockResolvedValue({
        name: "Test Creator",
        bio: "Test bio",
        monthlyPrice: 1000000000000000000n,
        subscriberCount: 5n,
        isActive: true,
      }),
      getSubscriptionStatus: vi.fn().mockResolvedValue([
        true, // isActive
        BigInt(Date.now() + 86400000), // expiresAt
        BigInt(Date.now() - 86400000), // subscribedAt
      ]),
      getNewsletter: vi.fn().mockResolvedValue({
        contentCID: "QmTestCID",
        title: "Test Newsletter",
        preview: "Test preview",
        creator: CREATOR_ADDRESS,
        publishedAt: BigInt(Date.now()),
        isPublic: false,
      }),
      postCounter: vi.fn().mockResolvedValue(10n),
      getCreators: vi.fn().mockResolvedValue([CREATOR_ADDRESS]),
      getCreatorCount: vi.fn().mockResolvedValue(BigInt(1)),
      registerCreator: vi.fn().mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ hash: "0xregistertx" }),
      }),
      updateProfile: vi.fn().mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ hash: "0xupdateprofiletx" }),
      }),
      updateMonthlyPrice: vi.fn().mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ hash: "0xupdatepricetx" }),
      }),
      interface: {
        parseLog: vi.fn().mockReturnValue({
          name: "NewsletterPublished",
          args: {
            postId: 1n,
          },
        }),
      },
    };

    // Setup mock IPFS client
    mockIPFSClient = {
      uploadToIPFS: vi.fn().mockResolvedValue({
        cid: "QmTestCID123",
        url: "https://ipfs.io/ipfs/QmTestCID123",
        size: 1024,
      }),
      downloadFromIPFS: vi.fn().mockResolvedValue(
        new TextEncoder().encode(
          JSON.stringify({
            title: "Test Newsletter",
            content: "Test content",
            author: USER_ADDRESS,
            timestamp: Date.now(),
          })
        )
      ),
    };

    // Mock IPFS client creation
    vi.mocked(ipfsUtils.createIPFSClient).mockReturnValue(
      mockIPFSClient as any
    );

    // Mock encryption utilities
    vi.mocked(encryption.generateAESKey).mockReturnValue(
      new Uint8Array(32).fill(1)
    );
    vi.mocked(encryption.encryptContent).mockResolvedValue({
      ciphertext: new Uint8Array([1, 2, 3]),
      iv: new Uint8Array([4, 5, 6]),
      authTag: new Uint8Array([7, 8, 9]),
      version: "1.0.0",
    });
    vi.mocked(encryption.serializeBundle).mockReturnValue("serialized-data");
    vi.mocked(encryption.aesKeyToFHEInput).mockReturnValue(
      "0x" + "1".repeat(64)
    );
    vi.mocked(encryption.fheOutputToAESKey).mockReturnValue(
      new Uint8Array(32).fill(2)
    );
    vi.mocked(encryption.deserializeBundle).mockReturnValue({
      ciphertext: new Uint8Array([1, 2, 3]),
      iv: new Uint8Array([4, 5, 6]),
      authTag: new Uint8Array([7, 8, 9]),
      version: "1.0.0",
    });
    vi.mocked(encryption.decryptContent).mockResolvedValue({
      title: "Decrypted Newsletter",
      content: "Decrypted content",
      author: CREATOR_ADDRESS,
      timestamp: Date.now(),
    });

    // Mock image processor
    vi.mocked(imageProcessor.processNewsletterImages).mockResolvedValue({
      html: "<p>Processed content</p>",
      json: { type: "doc", content: [] },
      imageCids: ["QmImage1", "QmImage2"],
    });

    // Setup mock FHEVM instance
    mockFhevmInstance = {
      createEncryptedInput: vi.fn().mockReturnValue({
        add256: vi.fn().mockReturnThis(),
        encrypt: vi.fn().mockResolvedValue({
          handles: [new Uint8Array([10, 11, 12])],
          inputProof: new Uint8Array([13, 14, 15]),
        }),
      }),
    };

    // Mock core encryption
    vi.mocked(coreEncryption.encryptValue).mockResolvedValue({
      handles: [new Uint8Array([10, 11, 12])],
      inputProof: new Uint8Array([13, 14, 15]),
    });

    // Create config
    config = {
      contractAddress: CONTRACT_ADDRESS,
      contractABI: [],
      ipfsConfig: { jwt: "test-jwt" },
      provider: mockProvider,
      signer: mockSigner,
    };

    // Initialize core and manually inject mock contract
    core = new CryptletterCore(config);
    (core as any).contract = mockContract;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with valid config", () => {
      expect(core).toBeDefined();
      expect(ipfsUtils.createIPFSClient).toHaveBeenCalledWith({
        jwt: "test-jwt",
      });
    });

    it("should use provider when signer is not available", () => {
      const configWithoutSigner = { ...config, signer: undefined };
      const coreWithoutSigner = new CryptletterCore(configWithoutSigner);

      expect(coreWithoutSigner).toBeDefined();
      expect(ipfsUtils.createIPFSClient).toHaveBeenCalled();
    });
  });

  describe("publishEncryptedNewsletter", () => {
    const publishOptions: PublishOptions = {
      title: "Test Newsletter",
      content: "<p>Test content with <img src='data:image/png;base64,abc' /> image</p>",
      author: USER_ADDRESS,
      isPublic: false,
    };

    it("should throw error if signer is not configured", async () => {
      const coreWithoutSigner = new CryptletterCore({
        ...config,
        signer: undefined,
      });

      await expect(
        coreWithoutSigner.publishEncryptedNewsletter(
          publishOptions,
          mockFhevmInstance as FhevmInstance
        )
      ).rejects.toThrow("Signer required to publish newsletter");
    });

    it("should publish encrypted newsletter successfully", async () => {
      const result = await core.publishEncryptedNewsletter(
        publishOptions,
        mockFhevmInstance as FhevmInstance
      );

      expect(result.postId).toBe(1n);
      expect(result.contentCID).toBe("QmTestCID123");
      expect(result.transactionHash).toBe("0xtxhash");

      expect(encryption.generateAESKey).toHaveBeenCalled();
      expect(encryption.encryptContent).toHaveBeenCalled();
      expect(mockIPFSClient.uploadToIPFS).toHaveBeenCalled();
      expect(mockContract.publishNewsletter).toHaveBeenCalledWith(
        "QmTestCID123",
        expect.any(Uint8Array),
        expect.any(Uint8Array),
        "Test Newsletter",
        expect.stringContaining("[Image]"), // Preview should have image replaced
        false
      );
    });

    it("should publish public newsletter without encryption", async () => {
      const publicOptions = { ...publishOptions, isPublic: true };

      const result = await core.publishEncryptedNewsletter(
        publicOptions,
        mockFhevmInstance as FhevmInstance
      );

      expect(result.postId).toBe(1n);
      // For public newsletters, AES key is not generated (aesKey is null)
      expect(encryption.encryptContent).not.toHaveBeenCalled(); // No content encryption for public
      expect(mockContract.publishNewsletter).toHaveBeenCalledWith(
        "QmTestCID123",
        expect.any(Uint8Array),
        expect.any(Uint8Array),
        "Test Newsletter",
        expect.any(String),
        true // isPublic
      );
    });

    it("should process images when contentJson is provided", async () => {
      const optionsWithJson = {
        ...publishOptions,
        contentJson: { type: "doc", content: [] },
      };

      await core.publishEncryptedNewsletter(
        optionsWithJson,
        mockFhevmInstance as FhevmInstance
      );

      expect(imageProcessor.processNewsletterImages).toHaveBeenCalledWith(
        publishOptions.content,
        optionsWithJson.contentJson,
        mockIPFSClient,
        true, // encrypt = true for premium
        expect.any(Uint8Array) // aesKey
      );
    });

    it("should create preview with image tags replaced", async () => {
      await core.publishEncryptedNewsletter(
        publishOptions,
        mockFhevmInstance as FhevmInstance
      );

      const publishCall = mockContract.publishNewsletter.mock.calls[0];
      const preview = publishCall[4];

      expect(preview).toContain("[Image]");
      expect(preview).not.toContain("<img");
      expect(preview.length).toBeLessThanOrEqual(200);
    });

    it("should throw error if post ID extraction fails", async () => {
      mockContract.interface.parseLog.mockReturnValue(null);

      await expect(
        core.publishEncryptedNewsletter(
          publishOptions,
          mockFhevmInstance as FhevmInstance
        )
      ).rejects.toThrow("Failed to extract post ID from transaction");
    });
  });

  describe("getEncryptedKey", () => {
    it("should throw error if signer is not configured", async () => {
      const coreWithoutSigner = new CryptletterCore({
        ...config,
        signer: undefined,
      });

      await expect(coreWithoutSigner.getEncryptedKey(1)).rejects.toThrow(
        "Signer required to access newsletter"
      );
    });

    it("should get encrypted key for accessible newsletter", async () => {
      const key = await core.getEncryptedKey(1);

      expect(key).toBe("0xencryptedkey");
      expect(mockContract.canAccessNewsletter).toHaveBeenCalledWith(
        1,
        USER_ADDRESS
      );
      expect(mockContract.getDecryptionKey).toHaveBeenCalledWith(1);
    });

    it("should throw error if user has no access", async () => {
      mockContract.canAccessNewsletter.mockResolvedValue(false);

      await expect(core.getEncryptedKey(1)).rejects.toThrow(
        "Access denied: No active subscription or permission"
      );
    });
  });

  describe("decryptNewsletterContent", () => {
    it("should decrypt newsletter content successfully", async () => {
      // decryptNewsletterContent now takes (postId, decryptedAESKey) instead of fhevmInstance
      const decryptedKeyHex = "0x" + "2".repeat(64);

      const result = await core.decryptNewsletterContent(1, decryptedKeyHex);

      expect(result.newsletter.title).toBe("Decrypted Newsletter");
      expect(result.metadata.postId).toBe(1);
      expect(mockIPFSClient.downloadFromIPFS).toHaveBeenCalledWith(
        "QmTestCID"
      );
      expect(encryption.fheOutputToAESKey).toHaveBeenCalledWith(decryptedKeyHex);
      expect(encryption.deserializeBundle).toHaveBeenCalled();
      expect(encryption.decryptContent).toHaveBeenCalled();
    });

    it("should handle serialized bundle correctly", async () => {
      const decryptedKeyHex = "0x" + "2".repeat(64);

      await core.decryptNewsletterContent(1, decryptedKeyHex);

      // Verify the flow: download -> decode -> deserialize -> decrypt
      expect(mockIPFSClient.downloadFromIPFS).toHaveBeenCalledWith("QmTestCID");
      expect(encryption.deserializeBundle).toHaveBeenCalled();
      expect(encryption.decryptContent).toHaveBeenCalled();
    });
  });

  describe("subscribeToCreator", () => {
    it("should throw error if signer is not configured", async () => {
      const coreWithoutSigner = new CryptletterCore({
        ...config,
        signer: undefined,
      });

      await expect(
        coreWithoutSigner.subscribeToCreator(CREATOR_ADDRESS, 1000000n)
      ).rejects.toThrow("Signer required to subscribe");
    });

    it("should subscribe to creator successfully", async () => {
      const txHash = await core.subscribeToCreator(
        CREATOR_ADDRESS,
        1000000000000000000n
      );

      expect(txHash).toBe("0xsubscribetx");
      expect(mockContract.subscribe).toHaveBeenCalledWith(CREATOR_ADDRESS, {
        value: 1000000000000000000n,
      });
    });
  });

  describe("renewSubscription", () => {
    it("should throw error if signer is not configured", async () => {
      const coreWithoutSigner = new CryptletterCore({
        ...config,
        signer: undefined,
      });

      await expect(
        coreWithoutSigner.renewSubscription(CREATOR_ADDRESS, 1000000n)
      ).rejects.toThrow("Signer required to renew subscription");
    });

    it("should renew subscription successfully", async () => {
      const txHash = await core.renewSubscription(
        CREATOR_ADDRESS,
        1000000000000000000n
      );

      expect(txHash).toBe("0xrenewtx");
      expect(mockContract.renewSubscription).toHaveBeenCalledWith(
        CREATOR_ADDRESS,
        { value: 1000000000000000000n }
      );
    });
  });

  describe("cancelSubscription", () => {
    it("should throw error if signer is not configured", async () => {
      const coreWithoutSigner = new CryptletterCore({
        ...config,
        signer: undefined,
      });

      await expect(
        coreWithoutSigner.cancelSubscription(CREATOR_ADDRESS)
      ).rejects.toThrow("Signer required to cancel subscription");
    });

    it("should cancel subscription successfully", async () => {
      const txHash = await core.cancelSubscription(CREATOR_ADDRESS);

      expect(txHash).toBe("0xcanceltx");
      expect(mockContract.cancelSubscription).toHaveBeenCalledWith(
        CREATOR_ADDRESS
      );
    });
  });

  describe("checkNewsletterAccess", () => {
    it("should check newsletter access for user", async () => {
      const hasAccess = await core.checkNewsletterAccess(1, USER_ADDRESS);

      expect(hasAccess).toBe(true);
      expect(mockContract.canAccessNewsletter).toHaveBeenCalledWith(
        1,
        USER_ADDRESS
      );
    });

    it("should return false when user has no access", async () => {
      mockContract.canAccessNewsletter.mockResolvedValue(false);

      const hasAccess = await core.checkNewsletterAccess(1, USER_ADDRESS);

      expect(hasAccess).toBe(false);
    });
  });

  describe("getCreator", () => {
    it("should get creator profile", async () => {
      const creator = await core.getCreator(CREATOR_ADDRESS);

      expect(creator.name).toBe("Test Creator");
      expect(creator.bio).toBe("Test bio");
      expect(creator.monthlyPrice).toBe(1000000000000000000n);
      expect(creator.subscriberCount).toBe(5n);
      expect(creator.isActive).toBe(true);
      expect(creator.address).toBe(CREATOR_ADDRESS);
    });
  });

  describe("getSubscriptionStatus", () => {
    it("should get subscription status", async () => {
      const status = await core.getSubscriptionStatus(
        USER_ADDRESS,
        CREATOR_ADDRESS
      );

      expect(status.isActive).toBe(true);
      expect(status.expiresAt).toBeGreaterThan(0n);
      expect(status.subscribedAt).toBeGreaterThan(0n);
      expect(status.daysRemaining).toBeGreaterThan(0);
      expect(status.hasAccess).toBe(true);
    });

    it("should calculate days remaining correctly", async () => {
      // Contract uses seconds, not milliseconds
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const futureExpiry = BigInt(nowInSeconds + 10 * 86400); // 10 days from now in seconds
      mockContract.getSubscriptionStatus.mockResolvedValueOnce([
        true,
        futureExpiry,
        BigInt(nowInSeconds),
      ]);

      const status = await core.getSubscriptionStatus(
        USER_ADDRESS,
        CREATOR_ADDRESS
      );

      // Should be approximately 10 days (allowing for small timing differences)
      expect(status.daysRemaining).toBeGreaterThanOrEqual(9);
      expect(status.daysRemaining).toBeLessThanOrEqual(11);
    });
  });

  describe("getNewsletterMetadata", () => {
    it("should get newsletter metadata", async () => {
      const metadata = await core.getNewsletterMetadata(1);

      expect(metadata.postId).toBe(1);
      expect(metadata.title).toBe("Test Newsletter");
      expect(metadata.preview).toBe("Test preview");
      expect(metadata.creator).toBe(CREATOR_ADDRESS);
      expect(metadata.isPublic).toBe(false);
      expect(metadata.contentCID).toBe("QmTestCID");
    });
  });

  describe("listCreatorNewsletters", () => {
    it("should list creator newsletters", async () => {
      // Mock postCounter to return 2 (2 posts exist: index 0 and 1)
      mockContract.postCounter.mockResolvedValue(2n);

      // Mock newsletters - implementation iterates backwards from postCounter-1 to 0
      // So first call will be for postId 1, then postId 0
      mockContract.getNewsletter
        .mockResolvedValueOnce({
          contentCID: "QmCID2",
          title: "Newsletter 2",
          preview: "Preview 2",
          creator: CREATOR_ADDRESS,
          publishedAt: BigInt(Date.now()),
          isPublic: true,
        })
        .mockResolvedValueOnce({
          contentCID: "QmCID1",
          title: "Newsletter 1",
          preview: "Preview 1",
          creator: CREATOR_ADDRESS,
          publishedAt: BigInt(Date.now()),
          isPublic: false,
        });

      const newsletters = await core.listCreatorNewsletters(CREATOR_ADDRESS);

      expect(newsletters).toHaveLength(2);
      // Results are in reverse chronological order (most recent first)
      expect(newsletters[0].title).toBe("Newsletter 2");
      expect(newsletters[1].title).toBe("Newsletter 1");
    });

    it("should filter out newsletters from different creators", async () => {
      const otherCreator = "0x" + "9".repeat(40);
      mockContract.postCounter.mockResolvedValue(2n);

      // First newsletter (postId 1) is from other creator
      // Second newsletter (postId 0) is from target creator
      mockContract.getNewsletter
        .mockResolvedValueOnce({
          contentCID: "QmCID2",
          title: "Newsletter 2",
          preview: "Preview 2",
          creator: otherCreator,
          publishedAt: BigInt(Date.now()),
          isPublic: true,
        })
        .mockResolvedValueOnce({
          contentCID: "QmCID1",
          title: "Newsletter 1",
          preview: "Preview 1",
          creator: CREATOR_ADDRESS,
          publishedAt: BigInt(Date.now()),
          isPublic: false,
        });

      const newsletters = await core.listCreatorNewsletters(CREATOR_ADDRESS);

      expect(newsletters).toHaveLength(1);
      expect(newsletters[0].creator).toBe(CREATOR_ADDRESS);
      expect(newsletters[0].title).toBe("Newsletter 1");
    });
  });

  describe("getCreators", () => {
    it("should get creators list with pagination", async () => {
      const creators = await core.getCreators(0, 10);

      expect(creators).toEqual([CREATOR_ADDRESS]);
      expect(mockContract.getCreators).toHaveBeenCalledWith(0, 10);
    });

    it("should use default pagination values", async () => {
      await core.getCreators();

      expect(mockContract.getCreators).toHaveBeenCalledWith(0, 10);
    });
  });

  describe("getCreatorCount", () => {
    it("should get total creator count", async () => {
      const count = await core.getCreatorCount();

      // Count is returned as number, not bigint
      expect(count).toBe(1);
      expect(mockContract.getCreatorCount).toHaveBeenCalled();
    });
  });

  describe("registerAsCreator", () => {
    it("should throw error if signer is not configured", async () => {
      const coreWithoutSigner = new CryptletterCore({
        ...config,
        signer: undefined,
      });

      await expect(
        coreWithoutSigner.registerAsCreator("Name", "Bio", 1000000n)
      ).rejects.toThrow("Signer required to register as creator");
    });

    it("should register as creator successfully", async () => {
      const txHash = await core.registerAsCreator(
        "Test Creator",
        "Test bio",
        1000000000000000000n
      );

      expect(txHash).toBe("0xregistertx");
      expect(mockContract.registerCreator).toHaveBeenCalledWith(
        "Test Creator",
        "Test bio",
        1000000000000000000n
      );
    });
  });

  describe("updateCreatorProfile", () => {
    it("should throw error if signer is not configured", async () => {
      const coreWithoutSigner = new CryptletterCore({
        ...config,
        signer: undefined,
      });

      await expect(
        coreWithoutSigner.updateCreatorProfile("New Name", "New Bio")
      ).rejects.toThrow("Signer required to update profile");
    });

    it("should update creator profile successfully", async () => {
      const txHash = await core.updateCreatorProfile(
        "Updated Name",
        "Updated Bio"
      );

      expect(txHash).toBe("0xupdateprofiletx");
      expect(mockContract.updateProfile).toHaveBeenCalledWith(
        "Updated Name",
        "Updated Bio"
      );
    });
  });

  describe("updateCreatorPrice", () => {
    it("should throw error if signer is not configured", async () => {
      const coreWithoutSigner = new CryptletterCore({
        ...config,
        signer: undefined,
      });

      await expect(
        coreWithoutSigner.updateCreatorPrice(2000000n)
      ).rejects.toThrow("Signer required to update price");
    });

    it("should update creator price successfully", async () => {
      const txHash = await core.updateCreatorPrice(2000000000000000000n);

      expect(txHash).toBe("0xupdatepricetx");
      expect(mockContract.updateMonthlyPrice).toHaveBeenCalledWith(
        2000000000000000000n
      );
    });
  });
});
