/**
 * Tests for encryption utilities
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  generateAESKey,
  generateIV,
  encryptContent,
  decryptContent,
  aesKeyToFHEInput,
  fheOutputToAESKey,
  serializeBundle,
  deserializeBundle,
  createPreview,
  AES_KEY_SIZE,
  AES_IV_SIZE,
  type NewsletterData,
  type EncryptedBundle,
} from "../../src/utils/encryption";

describe("Encryption Utilities", () => {
  let testNewsletter: NewsletterData;

  beforeEach(() => {
    testNewsletter = {
      title: "Test Newsletter",
      content: "This is a test newsletter with some content.",
      author: "0x1234567890123456789012345678901234567890",
      timestamp: Date.now(),
      images: ["QmTest1", "QmTest2"],
      metadata: {
        tags: ["test", "crypto"],
      },
    };
  });

  describe("generateAESKey", () => {
    it("should generate a 32-byte AES key", () => {
      const key = generateAESKey();

      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(AES_KEY_SIZE);
    });

    it("should generate different keys each time", () => {
      const key1 = generateAESKey();
      const key2 = generateAESKey();

      expect(key1).not.toEqual(key2);
    });
  });

  describe("generateIV", () => {
    it("should generate a 12-byte IV", () => {
      const iv = generateIV();

      expect(iv).toBeInstanceOf(Uint8Array);
      expect(iv.length).toBe(AES_IV_SIZE);
    });

    it("should generate different IVs each time", () => {
      const iv1 = generateIV();
      const iv2 = generateIV();

      expect(iv1).not.toEqual(iv2);
    });
  });

  describe("encryptContent and decryptContent", () => {
    it("should encrypt and decrypt newsletter content successfully", async () => {
      const key = generateAESKey();
      const encrypted = await encryptContent(testNewsletter, key);

      expect(encrypted).toBeDefined();
      expect(encrypted.ciphertext).toBeInstanceOf(Uint8Array);
      expect(encrypted.iv).toBeInstanceOf(Uint8Array);
      expect(encrypted.authTag).toBeInstanceOf(Uint8Array);
      expect(encrypted.version).toBe("1.0.0");

      const decrypted = await decryptContent(encrypted, key);

      expect(decrypted).toEqual(testNewsletter);
    });

    it("should fail to decrypt with wrong key", async () => {
      const correctKey = generateAESKey();
      const wrongKey = generateAESKey();

      const encrypted = await encryptContent(testNewsletter, correctKey);

      await expect(decryptContent(encrypted, wrongKey)).rejects.toThrow(
        /Failed to decrypt content/
      );
    });

    it("should handle newsletter with minimal data", async () => {
      const minimalNewsletter: NewsletterData = {
        title: "Minimal",
        content: "Content",
        author: "0x0",
        timestamp: 0,
      };

      const key = generateAESKey();
      const encrypted = await encryptContent(minimalNewsletter, key);
      const decrypted = await decryptContent(encrypted, key);

      expect(decrypted).toEqual(minimalNewsletter);
    });

    it("should throw error for invalid key size", async () => {
      const invalidKey = new Uint8Array(16); // Wrong size

      await expect(encryptContent(testNewsletter, invalidKey)).rejects.toThrow(
        /Invalid AES key/
      );
    });

    it("should throw error for missing newsletter data", async () => {
      const key = generateAESKey();

      await expect(encryptContent(null as any, key)).rejects.toThrow(
        /Newsletter data is required/
      );
    });

    it("should throw error for invalid encrypted bundle", async () => {
      const key = generateAESKey();
      const invalidBundle = {
        ciphertext: new Uint8Array(0),
        iv: new Uint8Array(0),
        authTag: new Uint8Array(0),
        version: "1.0.0",
      };

      await expect(decryptContent(invalidBundle, key)).rejects.toThrow();
    });
  });

  describe("aesKeyToFHEInput and fheOutputToAESKey", () => {
    it("should convert AES key to hex string and back", () => {
      const originalKey = generateAESKey();
      const hexString = aesKeyToFHEInput(originalKey);

      expect(hexString).toMatch(/^0x[0-9a-f]{64}$/);

      const restoredKey = fheOutputToAESKey(hexString);

      expect(restoredKey).toEqual(originalKey);
    });

    it("should handle keys with leading zeros", () => {
      const key = new Uint8Array(AES_KEY_SIZE);
      key[0] = 0x00;
      key[1] = 0x01;
      key[31] = 0xff;

      const hexString = aesKeyToFHEInput(key);
      const restoredKey = fheOutputToAESKey(hexString);

      expect(restoredKey).toEqual(key);
    });

    it("should throw error for invalid key size in aesKeyToFHEInput", () => {
      const invalidKey = new Uint8Array(16);

      expect(() => aesKeyToFHEInput(invalidKey)).toThrow(/Invalid AES key size/);
    });

    it("should throw error for invalid hex length in fheOutputToAESKey", () => {
      expect(() => fheOutputToAESKey("0x1234")).toThrow(/Invalid FHE output length/);
    });

    it("should throw error for missing FHE output", () => {
      expect(() => fheOutputToAESKey("")).toThrow(/FHE output is required/);
    });
  });

  describe("serializeBundle and deserializeBundle", () => {
    it("should serialize and deserialize encrypted bundle", async () => {
      const key = generateAESKey();
      const encrypted = await encryptContent(testNewsletter, key);

      const serialized = serializeBundle(encrypted);

      expect(typeof serialized).toBe("string");
      expect(serialized.length).toBeGreaterThan(0);

      const deserialized = deserializeBundle(serialized);

      expect(deserialized.ciphertext).toEqual(encrypted.ciphertext);
      expect(deserialized.iv).toEqual(encrypted.iv);
      expect(deserialized.authTag).toEqual(encrypted.authTag);
      expect(deserialized.version).toEqual(encrypted.version);
    });

    it("should be able to decrypt after serialization roundtrip", async () => {
      const key = generateAESKey();
      const encrypted = await encryptContent(testNewsletter, key);
      const serialized = serializeBundle(encrypted);
      const deserialized = deserializeBundle(serialized);
      const decrypted = await decryptContent(deserialized, key);

      expect(decrypted).toEqual(testNewsletter);
    });

    it("should throw error for invalid serialized data", () => {
      expect(() => deserializeBundle("invalid")).toThrow(
        /Failed to deserialize encrypted bundle/
      );
    });
  });

  describe("createPreview", () => {
    it("should create preview within max length", () => {
      const preview = createPreview(testNewsletter, 50);

      expect(preview.length).toBeLessThanOrEqual(53); // 50 + "..."
      expect(preview).toContain(testNewsletter.title);
    });

    it("should not truncate if content is short", () => {
      const shortNewsletter: NewsletterData = {
        title: "Short",
        content: "Brief",
        author: "0x0",
        timestamp: 0,
      };

      const preview = createPreview(shortNewsletter, 200);

      expect(preview).toBe("Short - Brief");
      expect(preview).not.toContain("...");
    });

    it("should use default max length of 200", () => {
      const longContent = "a".repeat(300);
      const longNewsletter: NewsletterData = {
        title: "Long",
        content: longContent,
        author: "0x0",
        timestamp: 0,
      };

      const preview = createPreview(longNewsletter);

      expect(preview.length).toBeLessThanOrEqual(203); // 200 + "..."
      expect(preview).toContain("...");
    });
  });

  describe("Integration test: Full encryption flow", () => {
    it("should complete full encryption/decryption flow", async () => {
      // 1. Generate AES key
      const aesKey = generateAESKey();

      // 2. Encrypt newsletter
      const encrypted = await encryptContent(testNewsletter, aesKey);

      // 3. Serialize for storage/transmission
      const serialized = serializeBundle(encrypted);

      // 4. Convert key for FHE encryption
      const fheInput = aesKeyToFHEInput(aesKey);

      // Simulate FHE decryption (in real flow, this would be decrypted on-chain)
      const fheOutput = fheInput;

      // 5. Convert back from FHE
      const recoveredKey = fheOutputToAESKey(fheOutput);

      // 6. Deserialize encrypted bundle
      const deserialized = deserializeBundle(serialized);

      // 7. Decrypt newsletter
      const decrypted = await decryptContent(deserialized, recoveredKey);

      // 8. Verify result
      expect(decrypted).toEqual(testNewsletter);
    });
  });
});
