/**
 * IPFS Utility Functions for Cryptletter
 *
 * Provides integration with Pinata for IPFS operations:
 * - Upload encrypted content to IPFS
 * - Download content from IPFS
 * - Pin/unpin content management
 */

import { PinataSDK } from "pinata-web3";

/**
 * IPFS Configuration
 */
export interface IPFSConfig {
  jwt: string;
  gateway?: string;
}

/**
 * Upload Response
 */
export interface IPFSUploadResponse {
  cid: string;
  url: string;
  size: number;
}

/**
 * Pin Response
 */
export interface IPFSPinResponse {
  cid: string;
  pinned: boolean;
}

/**
 * IPFS Client Class
 */
export class IPFSClient {
  private pinata: PinataSDK;
  private gateway: string;

  constructor(config: IPFSConfig) {
    if (!config.jwt) {
      throw new Error("IPFS configuration requires JWT token");
    }

    this.gateway = config.gateway || "https://gateway.pinata.cloud";

    try {
      this.pinata = new PinataSDK({
        pinataJwt: config.jwt,
      });
    } catch (error) {
      console.error("Failed to initialize Pinata SDK:", error);
      throw new Error("IPFS client initialization failed");
    }
  }

  /**
   * Upload encrypted data to IPFS
   * @param encryptedData - The encrypted content as Uint8Array
   * @param metadata - Optional metadata for the upload
   * @returns Upload response with CID and URL
   */
  async uploadToIPFS(
    encryptedData: Uint8Array,
    metadata?: { name?: string; keyValues?: Record<string, string | number> }
  ): Promise<IPFSUploadResponse> {
    try {
      // Use simple filename to avoid directory creation in IPFS
      // Pinata creates directory structure from filename with special chars
      const file = new File([encryptedData], "content.bin", {
        type: "application/octet-stream",
      });

      // Upload to Pinata - metadata.name is for Pinata metadata only, not IPFS path
      const result = await this.pinata.upload.file(file as any, {
        metadata: metadata ? {
          name: metadata.name, // This is Pinata UI name, not IPFS filename
          keyValues: metadata.keyValues,
        } : undefined,
      });

      const cid = result.IpfsHash;
      const url = `${this.gateway}/ipfs/${cid}`;
      const size = result.PinSize;

      return {
        cid,
        url,
        size,
      };
    } catch (error) {
      console.error("IPFS upload failed:", error);
      throw new Error(`Failed to upload to IPFS: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Download content from IPFS by CID
   * @param cid - The IPFS Content Identifier
   * @returns The downloaded content as Uint8Array
   */
  async downloadFromIPFS(cid: string): Promise<Uint8Array> {
    if (!cid) {
      throw new Error("CID is required");
    }

    try {
      const url = `${this.gateway}/ipfs/${cid}`;
      const response = await fetch(url, { redirect: 'follow' });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if response is HTML (directory or error page)
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        const text = await response.text();
        console.error('[IPFS] Received HTML:', text.substring(0, 200));
        throw new Error(`IPFS returned HTML instead of file. CID may be a directory or does not exist.`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error("IPFS download failed:", error);
      throw new Error(`Failed to download from IPFS: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Pin existing content by CID
   * @param cid - The IPFS Content Identifier to pin
   * @param name - Optional name for the pinned content
   * @returns Pin response
   */
  async pinContent(cid: string, name?: string): Promise<IPFSPinResponse> {
    if (!cid) {
      throw new Error("CID is required");
    }

    try {
      // Pin by CID using Pinata
      await this.pinata.upload.cid(cid, {
        metadata: name ? { name } : undefined,
      });

      return {
        cid,
        pinned: true,
      };
    } catch (error) {
      console.error("IPFS pin failed:", error);
      throw new Error(`Failed to pin content: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Unpin content by CID
   * @param cid - The IPFS Content Identifier to unpin
   * @returns Success status
   */
  async unpinContent(cid: string): Promise<{ cid: string; unpinned: boolean }> {
    if (!cid) {
      throw new Error("CID is required");
    }

    try {
      await this.pinata.unpin([cid]);

      return {
        cid,
        unpinned: true,
      };
    } catch (error) {
      console.error("IPFS unpin failed:", error);
      throw new Error(`Failed to unpin content: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Test connection to IPFS/Pinata
   * @returns Connection status
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test authentication
      await this.pinata.testAuthentication();
      return true;
    } catch (error) {
      console.error("IPFS connection test failed:", error);
      return false;
    }
  }

  /**
   * List pinned files
   * @param limit - Maximum number of results to return
   * @returns List of pinned files
   */
  async listPins(limit: number = 10): Promise<Array<{ cid: string; name: string | null; size: number }>> {
    try {
      const result = await this.pinata.listFiles().pageLimit(limit);

      return result.map((item: any) => ({
        cid: item.ipfs_pin_hash,
        name: item.metadata?.name || null,
        size: item.size,
      }));
    } catch (error) {
      console.error("Failed to list pins:", error);
      throw new Error(`Failed to list pins: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

/**
 * Create an IPFS client instance
 * @param config - IPFS configuration
 * @returns IPFS client instance
 */
export function createIPFSClient(config: IPFSConfig): IPFSClient {
  return new IPFSClient(config);
}

/**
 * Helper function to upload encrypted data to IPFS
 * @param encryptedData - The encrypted content
 * @param config - IPFS configuration
 * @returns Upload response with CID
 */
export async function uploadToIPFS(
  encryptedData: Uint8Array,
  config: IPFSConfig,
  metadata?: { name?: string; keyValues?: Record<string, string | number> }
): Promise<IPFSUploadResponse> {
  const client = createIPFSClient(config);
  return await client.uploadToIPFS(encryptedData, metadata);
}

/**
 * Helper function to download content from IPFS
 * @param cid - The IPFS Content Identifier
 * @param config - IPFS configuration
 * @returns The downloaded content
 */
export async function downloadFromIPFS(
  cid: string,
  config: IPFSConfig
): Promise<Uint8Array> {
  const client = createIPFSClient(config);
  return await client.downloadFromIPFS(cid);
}

/**
 * Helper function to pin content
 * @param cid - The IPFS Content Identifier
 * @param config - IPFS configuration
 * @param name - Optional name for the pin
 * @returns Pin response
 */
export async function pinContent(
  cid: string,
  config: IPFSConfig,
  name?: string
): Promise<IPFSPinResponse> {
  const client = createIPFSClient(config);
  return await client.pinContent(cid, name);
}

/**
 * Helper function to unpin content
 * @param cid - The IPFS Content Identifier
 * @param config - IPFS configuration
 * @returns Unpin status
 */
export async function unpinContent(
  cid: string,
  config: IPFSConfig
): Promise<{ cid: string; unpinned: boolean }> {
  const client = createIPFSClient(config);
  return await client.unpinContent(cid);
}
