/**
 * Core Cryptletter Logic (Framework-Agnostic)
 *
 * Provides framework-independent business logic for Cryptletter operations:
 * - Publishing encrypted newsletters
 * - Fetching and decrypting newsletters
 * - Subscription management
 * - Access control verification
 */

import { ethers } from "ethers";
import type { FhevmInstance } from "../types/fhevm";
import { encryptValue } from "./encryption";
import {
  type NewsletterData,
  type EncryptedBundle,
  encryptContent,
  decryptContent,
  generateAESKey,
  aesKeyToFHEInput,
  fheOutputToAESKey,
  serializeBundle,
  deserializeBundle,
} from "../utils/encryption";
import {
  type IPFSConfig,
  type IPFSUploadResponse,
  createIPFSClient,
} from "../utils/ipfs";
import { processNewsletterImages } from "../utils/imageProcessor";

/**
 * Cryptletter SDK Configuration
 */
export interface CryptletterConfig {
  contractAddress: string;
  contractABI: any[];
  ipfsConfig: IPFSConfig;
  provider: ethers.Provider;
  signer?: ethers.Signer;
}

/**
 * Newsletter publish options
 */
export interface PublishOptions {
  title: string;
  content: string; // HTML content from Tiptap
  contentJson?: any; // Tiptap JSON (for processing images)
  author: string;
  isPublic?: boolean;
  images?: string[]; // IPFS CIDs (populated after image upload)
  metadata?: Record<string, any>;
}

/**
 * Published newsletter result
 */
export interface PublishResult {
  postId: bigint;
  contentCID: string;
  transactionHash: string;
}

/**
 * Newsletter fetch result
 */
export interface FetchResult {
  newsletter: NewsletterData;
  metadata: {
    postId: number;
    creator: string;
    publishedAt: bigint;
    isPublic: boolean;
    title: string;
    preview: string;
  };
}

/**
 * Subscription status
 */
export interface SubscriptionStatus {
  isActive: boolean;
  expiresAt: bigint;
  subscribedAt: bigint;
  daysRemaining: number;
  hasAccess: boolean; // Whether user can still access content (even if cancelled)
}

/**
 * Creator profile
 */
export interface CreatorProfile {
  name: string;
  bio: string;
  monthlyPrice: bigint;
  subscriberCount: bigint;
  isActive: boolean;
  address: string;
}

/**
 * Newsletter metadata (public information)
 */
export interface NewsletterMetadata {
  postId: number;
  title: string;
  preview: string;
  creator: string;
  publishedAt: bigint;
  isPublic: boolean;
  contentCID: string;
}

/**
 * Core Cryptletter SDK Class
 */
export class CryptletterCore {
  private contract: ethers.Contract;
  private ipfsClient: ReturnType<typeof createIPFSClient>;
  private config: CryptletterConfig;

  constructor(config: CryptletterConfig) {
    this.config = config;

    // Initialize contract
    const signerOrProvider = config.signer || config.provider;
    this.contract = new ethers.Contract(
      config.contractAddress,
      config.contractABI,
      signerOrProvider
    );

    // Initialize IPFS client
    this.ipfsClient = createIPFSClient(config.ipfsConfig);
  }

  /**
   * Publish an encrypted newsletter (end-to-end flow)
   * @param options - Newsletter content and metadata
   * @param fhevmInstance - FHEVM instance for encryption
   * @returns Published result with post ID and CID
   */
  async publishEncryptedNewsletter(
    options: PublishOptions,
    fhevmInstance: FhevmInstance
  ): Promise<PublishResult> {
    if (!this.config.signer) {
      throw new Error("Signer required to publish newsletter");
    }

    // Create preview: replace images with [Image] text, strip other HTML tags, and truncate
    // First, replace all img tags (including those with very long base64 src) with [Image]
    let preview = options.content
      .replace(/<img\s+[^>]*?src\s*=\s*["'][^"']*["'][^>]*?>/gi, "[Image]") // Replace img with src
      .replace(/<img[^>]*>/gi, "[Image]") // Fallback for any other img tags
      .replace(/<[^>]*>/g, "") // Strip all other HTML tags
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim()
      .substring(0, 200) // Truncate to 200 chars
      .trim();
    const isPublic = options.isPublic || false;

    // Generate AES key once (used for both content and images)
    const aesKey = !isPublic ? generateAESKey() : null;

    // Process images before creating newsletter data
    let finalHtml = options.content;
    let finalJson = options.contentJson;
    let imageCids: string[] = [];

    // Only process if contentJson exists and has images
    if (options.contentJson) {
      const imageProcessResult = await processNewsletterImages(
        options.content,
        options.contentJson,
        this.ipfsClient,
        !isPublic, // Encrypt images for premium content
        aesKey || undefined // Use same AES key as content encryption
      );

      finalHtml = imageProcessResult.html;
      finalJson = imageProcessResult.json;
      imageCids = imageProcessResult.imageCids;
    }

    const newsletterData: NewsletterData = {
      title: options.title,
      content: finalHtml,
      author: options.author,
      timestamp: Date.now(),
      images: imageCids,
      metadata: {
        ...options.metadata,
        contentJson: finalJson, // Store processed JSON for future editing
      },
    };

    if (isPublic) {
      // For free/public content, store as plain JSON (no encryption)
      const jsonString = JSON.stringify(newsletterData);
      const uploadResult = await this.ipfsClient.uploadToIPFS(
        new TextEncoder().encode(jsonString),
        {
          name: `newsletter-free-${options.title}-${Date.now()}`,
          keyValues: {
            type: "cryptletter-newsletter-free",
            author: options.author,
            timestamp: Date.now(),
          },
        }
      );

      // For public posts, we still need to provide dummy encrypted key (contract requires it)
      // Use a zero handle since it won't be used for decryption
      const userAddress = await this.config.signer.getAddress();
      const dummyValue = "0x0000000000000000000000000000000000000000000000000000000000000000";

      const encryptResult = await encryptValue(
        fhevmInstance,
        this.config.contractAddress,
        userAddress,
        dummyValue,
        "euint256"
      );

      const encryptedKeyHandle = encryptResult.handles[0];
      const inputProof = encryptResult.inputProof;

      // Publish to smart contract
      const tx = await this.contract.publishNewsletter(
        uploadResult.cid,
        encryptedKeyHandle,
        inputProof,
        options.title,
        preview,
        true // isPublic
      );

      const receipt = await tx.wait();

      // Extract postId from event
      const event = receipt.logs
        .map((log: any) => {
          try {
            return this.contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "NewsletterPublished");

      if (!event) {
        throw new Error("Failed to extract post ID from transaction");
      }

      return {
        postId: event.args.postId,
        contentCID: uploadResult.cid,
        transactionHash: receipt.hash,
      };
    }

    // For premium content, use full encryption flow
    // Step 1: AES key already generated above (used for both content and images)
    if (!aesKey) {
      throw new Error("AES key should be generated for premium content");
    }

    // Step 2: Encrypt newsletter content with AES
    const encryptedBundle = await encryptContent(newsletterData, aesKey);

    // Step 3: Upload encrypted content to IPFS
    const serialized = serializeBundle(encryptedBundle);
    const uploadResult = await this.ipfsClient.uploadToIPFS(
      new TextEncoder().encode(serialized),
      {
        name: `newsletter-${options.title}-${Date.now()}`,
        keyValues: {
          type: "cryptletter-newsletter",
          author: options.author,
          timestamp: Date.now(),
        },
      }
    );

    // Step 4: Encrypt AES key with FHE
    const aesKeyHex = aesKeyToFHEInput(aesKey);
    const userAddress = await this.config.signer.getAddress();

    // Use encryptValue to encrypt the AES key as euint256
    const encryptResult = await encryptValue(
      fhevmInstance,
      this.config.contractAddress,
      userAddress,
      aesKeyHex,
      "euint256"
    );

    const encryptedKeyHandle = encryptResult.handles[0];
    const inputProof = encryptResult.inputProof;

    // Step 5: Publish to smart contract
    const tx = await this.contract.publishNewsletter(
      uploadResult.cid,
      encryptedKeyHandle,
      inputProof,
      options.title,
      preview,
      false // isPublic
    );

    const receipt = await tx.wait();

    // Extract postId from event
    const event = receipt.logs
      .map((log: any) => {
        try {
          return this.contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === "NewsletterPublished");

    if (!event) {
      throw new Error("Failed to extract post ID from transaction");
    }

    return {
      postId: event.args.postId,
      contentCID: uploadResult.cid,
      transactionHash: receipt.hash,
    };
  }

  /**
   * Get encrypted AES key for a newsletter (for manual decryption)
   * @param postId - Newsletter post ID
   * @returns Encrypted key handle
   */
  async getEncryptedKey(postId: number): Promise<string> {
    if (!this.config.signer) {
      throw new Error("Signer required to access newsletter");
    }

    // Check access permission
    const userAddress = await this.config.signer.getAddress();
    const hasAccess = await this.contract.canAccessNewsletter(postId, userAddress);

    if (!hasAccess) {
      throw new Error("Access denied: No active subscription or permission");
    }

    // Get encrypted key from contract
    return await this.contract.getDecryptionKey(postId);
  }

  /**
   * Decrypt newsletter content with a decrypted AES key
   * @param postId - Newsletter post ID
   * @param decryptedAESKey - Decrypted AES key (from FHE decryption)
   * @returns Decrypted newsletter data
   */
  async decryptNewsletterContent(
    postId: number,
    decryptedAESKey: string
  ): Promise<FetchResult> {
    // Step 1: Get newsletter metadata from contract
    const newsletter = await this.contract.getNewsletter(postId);

    // Step 2: Convert decrypted hex back to AES key
    const aesKey = fheOutputToAESKey(decryptedAESKey);

    // Step 3: Download encrypted content from IPFS
    const encryptedData = await this.ipfsClient.downloadFromIPFS(newsletter.contentCID);

    // Step 4: Deserialize encrypted bundle
    const serialized = new TextDecoder().decode(encryptedData);
    const encryptedBundle = deserializeBundle(serialized);

    // Step 5: Decrypt content with AES key
    const newsletterData = await decryptContent(encryptedBundle, aesKey);

    return {
      newsletter: newsletterData,
      metadata: {
        postId,
        creator: newsletter.creator,
        publishedAt: newsletter.publishedAt,
        isPublic: newsletter.isPublic,
        title: newsletter.title,
        preview: newsletter.preview,
      },
    };
  }

  /**
   * Subscribe to a creator
   * @param creatorAddress - Creator's address
   * @param paymentAmount - Payment amount in wei
   * @returns Transaction hash
   */
  async subscribeToCreator(
    creatorAddress: string,
    paymentAmount: bigint
  ): Promise<string> {
    if (!this.config.signer) {
      throw new Error("Signer required to subscribe");
    }

    const tx = await this.contract.subscribe(creatorAddress, {
      value: paymentAmount,
    });

    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Renew an existing subscription
   * @param creatorAddress - Creator's address
   * @param paymentAmount - Payment amount in wei
   * @returns Transaction hash
   */
  async renewSubscription(
    creatorAddress: string,
    paymentAmount: bigint
  ): Promise<string> {
    if (!this.config.signer) {
      throw new Error("Signer required to renew subscription");
    }

    const tx = await this.contract.renewSubscription(creatorAddress, {
      value: paymentAmount,
    });

    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Cancel a subscription
   * @param creatorAddress - Creator's address
   * @returns Transaction hash
   */
  async cancelSubscription(creatorAddress: string): Promise<string> {
    if (!this.config.signer) {
      throw new Error("Signer required to cancel subscription");
    }

    const tx = await this.contract.cancelSubscription(creatorAddress);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Check if user can access a newsletter
   * @param postId - Newsletter post ID
   * @param userAddress - User address (optional, defaults to signer)
   * @returns Access permission
   */
  async checkNewsletterAccess(
    postId: number,
    userAddress?: string
  ): Promise<boolean> {
    const address = userAddress || (await this.config.signer?.getAddress());
    if (!address) {
      throw new Error("User address required");
    }

    return await this.contract.canAccessNewsletter(postId, address);
  }

  /**
   * Get creator profile
   * @param creatorAddress - Creator's address
   * @returns Creator profile
   */
  async getCreator(creatorAddress: string): Promise<CreatorProfile> {
    const creator = await this.contract.getCreator(creatorAddress);

    return {
      name: creator.name,
      bio: creator.bio,
      monthlyPrice: creator.monthlyPrice,
      subscriberCount: creator.subscriberCount,
      isActive: creator.isActive,
      address: creatorAddress,
    };
  }

  /**
   * Get subscription status
   * @param subscriberAddress - Subscriber's address
   * @param creatorAddress - Creator's address
   * @returns Subscription status
   */
  async getSubscriptionStatus(
    subscriberAddress: string,
    creatorAddress: string
  ): Promise<SubscriptionStatus> {
    const result = await this.contract.getSubscriptionStatus(subscriberAddress, creatorAddress);

    // Handle both old (3 values) and new (4 values) contract versions
    const isActive = result[0];
    const expiresAt = result[1];
    const subscribedAt = result[2];
    const hasAccess = result.length > 3 ? result[3] : (expiresAt > BigInt(Math.floor(Date.now() / 1000)));

    const now = BigInt(Math.floor(Date.now() / 1000));
    const daysRemaining = hasAccess
      ? Number((expiresAt - now) / BigInt(86400))
      : 0;

    return {
      isActive,
      expiresAt,
      subscribedAt,
      daysRemaining,
      hasAccess,
    };
  }

  /**
   * Get newsletter metadata (public info only)
   * @param postId - Newsletter post ID
   * @returns Newsletter metadata
   */
  async getNewsletterMetadata(postId: number): Promise<NewsletterMetadata> {
    const newsletter = await this.contract.getNewsletter(postId);

    return {
      postId,
      title: newsletter.title,
      preview: newsletter.preview,
      creator: newsletter.creator,
      publishedAt: newsletter.publishedAt,
      isPublic: newsletter.isPublic,
      contentCID: newsletter.contentCID,
    };
  }

  /**
   * List all newsletters for a creator (metadata only)
   * @param creatorAddress - Creator's address
   * @param limit - Maximum number of newsletters to fetch
   * @returns Array of newsletter metadata
   */
  async listCreatorNewsletters(
    creatorAddress: string,
    limit: number = 50
  ): Promise<NewsletterMetadata[]> {
    // Get total post count
    const postCounter = await this.contract.postCounter();
    const total = Number(postCounter);

    const newsletters: NewsletterMetadata[] = [];

    // Iterate backwards through posts (most recent first)
    for (let i = total - 1; i >= 0 && newsletters.length < limit; i--) {
      try {
        const newsletter = await this.contract.getNewsletter(i);
        if (newsletter.creator.toLowerCase() === creatorAddress.toLowerCase()) {
          newsletters.push({
            postId: i,
            title: newsletter.title,
            preview: newsletter.preview,
            creator: newsletter.creator,
            publishedAt: newsletter.publishedAt,
            isPublic: newsletter.isPublic,
            contentCID: newsletter.contentCID,
          });
        }
      } catch (error) {
        // Skip invalid posts
        console.warn(`Failed to fetch newsletter ${i}:`, error);
      }
    }

    return newsletters;
  }

  /**
   * Get list of creators
   * @param offset - Starting index
   * @param limit - Number of creators to fetch
   * @returns Array of creator addresses
   */
  async getCreators(offset: number = 0, limit: number = 10): Promise<string[]> {
    return await this.contract.getCreators(offset, limit);
  }

  /**
   * Get total creator count
   * @returns Total number of creators
   */
  async getCreatorCount(): Promise<number> {
    const count = await this.contract.getCreatorCount();
    return Number(count);
  }

  /**
   * Register as a creator
   * @param name - Creator name
   * @param bio - Creator bio
   * @param monthlyPrice - Monthly subscription price in wei
   * @returns Transaction hash
   */
  async registerAsCreator(
    name: string,
    bio: string,
    monthlyPrice: bigint
  ): Promise<string> {
    if (!this.config.signer) {
      throw new Error("Signer required to register as creator");
    }

    const tx = await this.contract.registerCreator(name, bio, monthlyPrice);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Update creator profile
   * @param name - New name
   * @param bio - New bio
   * @returns Transaction hash
   */
  async updateCreatorProfile(name: string, bio: string): Promise<string> {
    if (!this.config.signer) {
      throw new Error("Signer required to update profile");
    }

    const tx = await this.contract.updateProfile(name, bio);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Update creator monthly price
   * @param newPrice - New monthly price in wei
   * @returns Transaction hash
   */
  async updateCreatorPrice(newPrice: bigint): Promise<string> {
    if (!this.config.signer) {
      throw new Error("Signer required to update price");
    }

    const tx = await this.contract.updateMonthlyPrice(newPrice);
    const receipt = await tx.wait();
    return receipt.hash;
  }
}

/**
 * Create a Cryptletter SDK instance
 * @param config - SDK configuration
 * @returns Cryptletter SDK instance
 */
export function createCryptletterSDK(config: CryptletterConfig): CryptletterCore {
  return new CryptletterCore(config);
}
