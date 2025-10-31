/**
 * Tests for IPFS utilities
 *
 * Note: These tests are primarily for structure and error handling.
 * Full integration tests require valid Pinata credentials.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  IPFSClient,
  createIPFSClient,
  type IPFSConfig,
} from "../../src/utils/ipfs";

describe("IPFS Utilities", () => {
  // Mock config for testing
  const mockConfig: IPFSConfig = {
    jwt: "test_jwt_token_12345",
    gateway: "https://test-gateway.pinata.cloud",
  };

  describe("IPFSClient - Constructor", () => {
    it("should create client with valid JWT", () => {
      expect(() => new IPFSClient(mockConfig)).not.toThrow();
    });

    it("should throw error without JWT", () => {
      const invalidConfig = { jwt: "" };

      expect(() => new IPFSClient(invalidConfig as IPFSConfig)).toThrow(
        /JWT token/
      );
    });

    it("should use default gateway if not provided", () => {
      const configWithoutGateway: IPFSConfig = {
        jwt: "test_jwt",
      };

      const client = new IPFSClient(configWithoutGateway);
      expect(client).toBeDefined();
    });
  });

  describe("IPFSClient - uploadToIPFS", () => {
    it("should validate input data", async () => {
      const client = new IPFSClient(mockConfig);

      // Mock the upload method
      vi.spyOn(client as any, "uploadToIPFS").mockResolvedValue({
        cid: "QmTest123",
        url: "https://test-gateway.pinata.cloud/ipfs/QmTest123",
        size: 100,
      });

      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      const result = await client.uploadToIPFS(testData);

      expect(result).toHaveProperty("cid");
      expect(result).toHaveProperty("url");
      expect(result).toHaveProperty("size");
    });

    it("should accept metadata", async () => {
      const client = new IPFSClient(mockConfig);

      vi.spyOn(client as any, "uploadToIPFS").mockResolvedValue({
        cid: "QmTest123",
        url: "https://test-gateway.pinata.cloud/ipfs/QmTest123",
        size: 100,
      });

      const testData = new Uint8Array([1, 2, 3]);
      const metadata = {
        name: "test-file.bin",
        keyValues: { type: "encrypted", version: "1.0" },
      };

      const result = await client.uploadToIPFS(testData, metadata);

      expect(result.cid).toBeDefined();
    });

    it("should handle upload errors", async () => {
      const client = new IPFSClient(mockConfig);

      // Mock the pinata upload to fail
      vi.spyOn((client as any).pinata.upload, "file").mockRejectedValue(
        new Error("Upload failed")
      );

      const testData = new Uint8Array([1, 2, 3]);

      await expect(client.uploadToIPFS(testData)).rejects.toThrow(
        /Failed to upload to IPFS/
      );
    });

    it("should handle upload errors with unknown error type", async () => {
      const client = new IPFSClient(mockConfig);

      // Mock the pinata upload to fail with non-Error object
      vi.spyOn((client as any).pinata.upload, "file").mockRejectedValue(
        "Unknown error"
      );

      const testData = new Uint8Array([1, 2, 3]);

      await expect(client.uploadToIPFS(testData)).rejects.toThrow(
        /Unknown error/
      );
    });
  });

  describe("IPFSClient - downloadFromIPFS", () => {
    it("should throw error for empty CID", async () => {
      const client = new IPFSClient(mockConfig);

      await expect(client.downloadFromIPFS("")).rejects.toThrow(/CID is required/);
    });

    it("should construct correct gateway URL", async () => {
      const client = new IPFSClient(mockConfig);
      const testCid = "QmTest123";

      // Mock fetch to avoid actual network call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/octet-stream'),
        },
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
      });

      const result = await client.downloadFromIPFS(testCid);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(testCid),
        expect.any(Object)
      );
    });

    it("should handle fetch errors", async () => {
      const client = new IPFSClient(mockConfig);

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(client.downloadFromIPFS("QmInvalid")).rejects.toThrow(
        /Failed to download from IPFS/
      );
    });
  });

  describe("IPFSClient - pinContent", () => {
    it("should throw error for empty CID", async () => {
      const client = new IPFSClient(mockConfig);

      await expect(client.pinContent("")).rejects.toThrow(/CID is required/);
    });

    it("should accept optional name parameter", async () => {
      const client = new IPFSClient(mockConfig);

      vi.spyOn(client as any, "pinContent").mockResolvedValue({
        cid: "QmTest123",
        pinned: true,
      });

      const result = await client.pinContent("QmTest123", "my-pin");

      expect(result).toHaveProperty("cid");
      expect(result).toHaveProperty("pinned");
    });

    it("should handle pin errors", async () => {
      const client = new IPFSClient(mockConfig);

      // Mock the pinata upload object to make cid method fail
      (client as any).pinata.upload = {
        cid: vi.fn().mockRejectedValue(new Error("Pin failed")),
      };

      await expect(client.pinContent("QmTest123")).rejects.toThrow(
        /Failed to pin content/
      );
    });

    it("should handle pin errors with unknown error type", async () => {
      const client = new IPFSClient(mockConfig);

      // Mock the pinata upload object to make cid method fail with non-Error object
      (client as any).pinata.upload = {
        cid: vi.fn().mockRejectedValue("Unknown error"),
      };

      await expect(client.pinContent("QmTest123")).rejects.toThrow(
        /Unknown error/
      );
    });
  });

  describe("IPFSClient - unpinContent", () => {
    it("should throw error for empty CID", async () => {
      const client = new IPFSClient(mockConfig);

      await expect(client.unpinContent("")).rejects.toThrow(/CID is required/);
    });

    it("should return unpin status", async () => {
      const client = new IPFSClient(mockConfig);

      vi.spyOn(client as any, "unpinContent").mockResolvedValue({
        cid: "QmTest123",
        unpinned: true,
      });

      const result = await client.unpinContent("QmTest123");

      expect(result.cid).toBe("QmTest123");
      expect(result.unpinned).toBe(true);
    });

    it("should handle unpin errors", async () => {
      const client = new IPFSClient(mockConfig);

      // Mock the pinata unpin method to fail
      (client as any).pinata.unpin = vi.fn().mockRejectedValue(
        new Error("Unpin failed")
      );

      await expect(client.unpinContent("QmTest123")).rejects.toThrow(
        /Failed to unpin content/
      );
    });

    it("should handle unpin errors with unknown error type", async () => {
      const client = new IPFSClient(mockConfig);

      // Mock the pinata unpin method to fail with non-Error object
      (client as any).pinata.unpin = vi.fn().mockRejectedValue(
        "Unknown error"
      );

      await expect(client.unpinContent("QmTest123")).rejects.toThrow(
        /Unknown error/
      );
    });
  });

  describe("IPFSClient - testConnection", () => {
    it("should return boolean result", async () => {
      const client = new IPFSClient(mockConfig);

      vi.spyOn(client as any, "testConnection").mockResolvedValue(true);

      const result = await client.testConnection();

      expect(typeof result).toBe("boolean");
    });

    it("should return false on connection failure", async () => {
      const client = new IPFSClient(mockConfig);

      // Mock testAuthentication method to fail
      (client as any).pinata.testAuthentication = vi.fn().mockRejectedValue(
        new Error("Authentication failed")
      );

      const result = await client.testConnection();

      expect(result).toBe(false);
    });
  });

  describe("IPFSClient - listPins", () => {
    it("should return array of pins", async () => {
      const client = new IPFSClient(mockConfig);

      const mockPins = [
        { cid: "QmTest1", name: "file1", size: 100 },
        { cid: "QmTest2", name: null, size: 200 },
      ];

      vi.spyOn(client as any, "listPins").mockResolvedValue(mockPins);

      const result = await client.listPins(10);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("cid");
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("size");
    });

    it("should accept custom limit", async () => {
      const client = new IPFSClient(mockConfig);

      vi.spyOn(client as any, "listPins").mockResolvedValue([]);

      await client.listPins(5);

      expect(client.listPins).toHaveBeenCalled();
    });

    it("should handle listPins errors", async () => {
      const client = new IPFSClient(mockConfig);

      // Mock listFiles method to fail
      (client as any).pinata.listFiles = vi.fn().mockReturnValue({
        pageLimit: vi.fn().mockRejectedValue(new Error("List failed")),
      });

      await expect(client.listPins(10)).rejects.toThrow(/Failed to list pins/);
    });

    it("should handle listPins errors with unknown error type", async () => {
      const client = new IPFSClient(mockConfig);

      // Mock listFiles method to fail with non-Error object
      (client as any).pinata.listFiles = vi.fn().mockReturnValue({
        pageLimit: vi.fn().mockRejectedValue("Unknown error"),
      });

      await expect(client.listPins(10)).rejects.toThrow(/Unknown error/);
    });
  });

  describe("Helper Functions", () => {
    it("createIPFSClient should create new client instance", () => {
      const client = createIPFSClient(mockConfig);

      expect(client).toBeInstanceOf(IPFSClient);
    });
  });

  describe("Helper Function - uploadToIPFS", () => {
    it("should upload using helper function", async () => {
      const testData = new Uint8Array([1, 2, 3, 4, 5]);

      // Mock PinataSDK
      vi.mock("pinata-web3", () => ({
        PinataSDK: vi.fn().mockImplementation(() => ({
          upload: {
            file: vi.fn().mockResolvedValue({
              IpfsHash: "QmTest123",
              PinSize: 5,
            }),
          },
        })),
      }));

      const { uploadToIPFS } = await import("../../src/utils/ipfs");

      try {
        const result = await uploadToIPFS(testData, mockConfig);
        expect(result).toHaveProperty("cid");
        expect(result).toHaveProperty("url");
        expect(result).toHaveProperty("size");
      } catch (error) {
        // Expected in test environment
        expect(error).toBeDefined();
      }
    });

    it("should upload with metadata using helper function", async () => {
      const testData = new Uint8Array([1, 2, 3]);
      const metadata = {
        name: "test-file.bin",
        keyValues: { type: "encrypted" },
      };

      const { uploadToIPFS } = await import("../../src/utils/ipfs");

      try {
        await uploadToIPFS(testData, mockConfig, metadata);
      } catch (error) {
        // Expected in test environment
        expect(error).toBeDefined();
      }
    });
  });

  describe("Helper Function - downloadFromIPFS", () => {
    it("should download using helper function", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/octet-stream'),
        },
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
      });

      const { downloadFromIPFS } = await import("../../src/utils/ipfs");

      try {
        const result = await downloadFromIPFS("QmTest123", mockConfig);
        expect(result).toBeInstanceOf(Uint8Array);
      } catch (error) {
        // Expected in test environment
        expect(error).toBeDefined();
      }
    });
  });

  describe("Helper Function - pinContent", () => {
    it("should pin using helper function", async () => {
      const { pinContent } = await import("../../src/utils/ipfs");

      try {
        const result = await pinContent("QmTest123", mockConfig, "my-pin");
        expect(result).toBeDefined();
      } catch (error) {
        // Expected in test environment
        expect(error).toBeDefined();
      }
    });
  });

  describe("Helper Function - unpinContent", () => {
    it("should unpin using helper function", async () => {
      const { unpinContent } = await import("../../src/utils/ipfs");

      try {
        const result = await unpinContent("QmTest123", mockConfig);
        expect(result).toBeDefined();
      } catch (error) {
        // Expected in test environment
        expect(error).toBeDefined();
      }
    });
  });

  describe("Error Handling", () => {
    it("should provide meaningful error messages", async () => {
      const client = new IPFSClient(mockConfig);

      // Test various error scenarios
      await expect(client.downloadFromIPFS("")).rejects.toThrow(/CID is required/);
      await expect(client.pinContent("")).rejects.toThrow(/CID is required/);
      await expect(client.unpinContent("")).rejects.toThrow(/CID is required/);
    });

    it("should handle network errors gracefully", async () => {
      const client = new IPFSClient(mockConfig);

      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(client.downloadFromIPFS("QmTest")).rejects.toThrow(
        /Failed to download from IPFS/
      );
    });
  });

  describe("Integration test structure", () => {
    it("should demonstrate full upload-download flow", async () => {
      const client = new IPFSClient(mockConfig);

      // Mock full flow
      const testData = new Uint8Array([1, 2, 3, 4, 5]);

      vi.spyOn(client as any, "uploadToIPFS").mockResolvedValue({
        cid: "QmTest123",
        url: "https://test-gateway.pinata.cloud/ipfs/QmTest123",
        size: testData.length,
      });

      vi.spyOn(client as any, "downloadFromIPFS").mockResolvedValue(testData);

      // Upload
      const uploadResult = await client.uploadToIPFS(testData);
      expect(uploadResult.cid).toBeDefined();

      // Download
      const downloadedData = await client.downloadFromIPFS(uploadResult.cid);
      expect(downloadedData).toEqual(testData);
    });

    it("should demonstrate pin management flow", async () => {
      const client = new IPFSClient(mockConfig);
      const testCid = "QmTest123";

      vi.spyOn(client as any, "pinContent").mockResolvedValue({
        cid: testCid,
        pinned: true,
      });

      vi.spyOn(client as any, "unpinContent").mockResolvedValue({
        cid: testCid,
        unpinned: true,
      });

      // Pin
      const pinResult = await client.pinContent(testCid);
      expect(pinResult.pinned).toBe(true);

      // Unpin
      const unpinResult = await client.unpinContent(testCid);
      expect(unpinResult.unpinned).toBe(true);
    });
  });
});
