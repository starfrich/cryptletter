/**
 * Tests for Image Processing utilities
 *
 * Covers extraction, encryption, decryption, and IPFS upload of images
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  extractBase64ImagesFromJson,
  base64ToUint8Array,
  encryptImage,
  decryptImage,
  uploadImagesToIPFS,
  replaceImagesInHtml,
  replaceImagesInJson,
  processNewsletterImages,
  type ImageData,
  type UploadedImage,
} from "../../src/utils/imageProcessor";
import type { IPFSClient } from "../../src/utils/ipfs";

// Sample base64 images (1x1 pixels PNG)
const SAMPLE_BASE64_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

// Additional sample images for multi-image tests (1x1 blue and green pixels)
const SAMPLE_BASE64_IMAGE_2 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const SAMPLE_BASE64_IMAGE_3 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==";

describe("Image Processing Utilities", () => {
  describe("extractBase64ImagesFromJson", () => {
    it("should extract images from flat content", () => {
      const json = {
        type: "doc",
        content: [
          {
            type: "image",
            attrs: {
              src: SAMPLE_BASE64_IMAGE,
              alt: "Test image",
            },
          },
        ],
      };

      const images = extractBase64ImagesFromJson(json);

      expect(images).toHaveLength(1);
      expect(images[0].src).toBe(SAMPLE_BASE64_IMAGE);
      expect(images[0].alt).toBe("Test image");
      expect(images[0].index).toBe(0);
    });

    it("should extract multiple images with correct indices", () => {
      const json = {
        type: "doc",
        content: [
          {
            type: "image",
            attrs: { src: SAMPLE_BASE64_IMAGE },
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Some text" }],
          },
          {
            type: "image",
            attrs: { src: SAMPLE_BASE64_IMAGE_2 },
          },
        ],
      };

      const images = extractBase64ImagesFromJson(json);

      expect(images).toHaveLength(2);
      expect(images[0].index).toBe(0);
      expect(images[1].index).toBe(1);
    });

    it("should extract images from nested content", () => {
      const json = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Before" },
              {
                type: "image",
                attrs: { src: SAMPLE_BASE64_IMAGE_3 },
              },
              { type: "text", text: "After" },
            ],
          },
        ],
      };

      const images = extractBase64ImagesFromJson(json);

      expect(images).toHaveLength(1);
      expect(images[0].src).toBe(SAMPLE_BASE64_IMAGE_3);
    });

    it("should skip non-base64 images", () => {
      const json = {
        type: "doc",
        content: [
          {
            type: "image",
            attrs: { src: "https://example.com/image.png" },
          },
          {
            type: "image",
            attrs: { src: SAMPLE_BASE64_IMAGE },
          },
        ],
      };

      const images = extractBase64ImagesFromJson(json);

      expect(images).toHaveLength(1);
      expect(images[0].src).toBe(SAMPLE_BASE64_IMAGE);
    });

    it("should handle null/undefined json", () => {
      expect(extractBase64ImagesFromJson(null)).toEqual([]);
      expect(extractBase64ImagesFromJson(undefined)).toEqual([]);
    });

    it("should handle empty content", () => {
      const json = { type: "doc", content: [] };
      const images = extractBase64ImagesFromJson(json);

      expect(images).toEqual([]);
    });

    it("should handle missing alt attribute", () => {
      const json = {
        type: "doc",
        content: [
          {
            type: "image",
            attrs: { src: SAMPLE_BASE64_IMAGE },
          },
        ],
      };

      const images = extractBase64ImagesFromJson(json);

      expect(images[0].alt).toBeUndefined();
    });
  });

  describe("base64ToUint8Array", () => {
    it("should convert valid base64 data URL to Uint8Array", () => {
      const result = base64ToUint8Array(SAMPLE_BASE64_IMAGE);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should throw error for invalid base64 data URL", () => {
      expect(() => base64ToUint8Array("invalid")).toThrow(/Invalid base64/);
    });

    it("should throw error for missing base64 data", () => {
      expect(() => base64ToUint8Array("data:image/png;base64,")).toThrow(/Invalid base64/);
    });

    it("should correctly decode known base64 string", () => {
      // "Hello" in base64
      const base64 = "data:text/plain;base64,SGVsbG8=";
      const result = base64ToUint8Array(base64);

      const text = String.fromCharCode(...result);
      expect(text).toBe("Hello");
    });
  });

  describe("encryptImage", () => {
    it("should encrypt image data", async () => {
      const imageData = new Uint8Array([1, 2, 3, 4, 5]);
      const aesKey = crypto.getRandomValues(new Uint8Array(32));

      const encrypted = await encryptImage(imageData, aesKey);

      expect(encrypted).toBeInstanceOf(Uint8Array);
      expect(encrypted.length).toBeGreaterThan(imageData.length); // IV + encrypted data
      expect(encrypted).not.toEqual(imageData);
    });

    it("should produce different ciphertext for same plaintext (random IV)", async () => {
      const imageData = new Uint8Array([1, 2, 3, 4, 5]);
      const aesKey = crypto.getRandomValues(new Uint8Array(32));

      const encrypted1 = await encryptImage(imageData, aesKey);
      const encrypted2 = await encryptImage(imageData, aesKey);

      expect(encrypted1).not.toEqual(encrypted2);
    });

    it("should include 12-byte IV at the beginning", async () => {
      const imageData = new Uint8Array([1, 2, 3, 4, 5]);
      const aesKey = crypto.getRandomValues(new Uint8Array(32));

      const encrypted = await encryptImage(imageData, aesKey);

      // IV is 12 bytes + encrypted data
      expect(encrypted.length).toBeGreaterThanOrEqual(12);
    });
  });

  describe("decryptImage", () => {
    it("should decrypt encrypted image data", async () => {
      const originalData = new Uint8Array([1, 2, 3, 4, 5]);
      const aesKey = crypto.getRandomValues(new Uint8Array(32));

      const encrypted = await encryptImage(originalData, aesKey);
      const decrypted = await decryptImage(encrypted, aesKey);

      expect(decrypted).toEqual(originalData);
    });

    it("should fail with wrong key", async () => {
      const originalData = new Uint8Array([1, 2, 3, 4, 5]);
      const aesKey1 = crypto.getRandomValues(new Uint8Array(32));
      const aesKey2 = crypto.getRandomValues(new Uint8Array(32));

      const encrypted = await encryptImage(originalData, aesKey1);

      await expect(decryptImage(encrypted, aesKey2)).rejects.toThrow();
    });

    it("should handle large image data", async () => {
      const largeData = new Uint8Array(1024 * 100); // 100KB
      largeData.fill(42);
      const aesKey = crypto.getRandomValues(new Uint8Array(32));

      const encrypted = await encryptImage(largeData, aesKey);
      const decrypted = await decryptImage(encrypted, aesKey);

      expect(decrypted).toEqual(largeData);
    });
  });

  describe("uploadImagesToIPFS", () => {
    let mockIPFSClient: IPFSClient;

    beforeEach(() => {
      mockIPFSClient = {
        uploadToIPFS: vi.fn().mockResolvedValue({
          cid: "QmTestCID123",
          url: "https://gateway.pinata.cloud/ipfs/QmTestCID123",
          size: 100,
        }),
      } as any;
    });

    it("should upload unencrypted images", async () => {
      const images: ImageData[] = [
        { src: SAMPLE_BASE64_IMAGE, index: 0, alt: "Test" },
      ];

      const result = await uploadImagesToIPFS(images, mockIPFSClient, false);

      expect(result).toHaveLength(1);
      expect(result[0].ipfsCid).toBe("QmTestCID123");
      expect(result[0].encrypted).toBe(false);
      expect(mockIPFSClient.uploadToIPFS).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        expect.objectContaining({
          name: expect.stringContaining("newsletter-image-0"),
          keyValues: expect.objectContaining({
            type: "newsletter-image",
            index: 0,
            encrypted: 0,
          }),
        })
      );
    });

    it("should upload encrypted images with AES key", async () => {
      const images: ImageData[] = [
        { src: SAMPLE_BASE64_IMAGE, index: 0 },
      ];
      const aesKey = crypto.getRandomValues(new Uint8Array(32));

      const result = await uploadImagesToIPFS(images, mockIPFSClient, true, aesKey);

      expect(result).toHaveLength(1);
      expect(result[0].encrypted).toBe(true);
      expect(mockIPFSClient.uploadToIPFS).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        expect.objectContaining({
          name: expect.stringContaining(".enc"),
          keyValues: expect.objectContaining({
            encrypted: 1,
          }),
        })
      );
    });

    it("should throw error when encryption requested without AES key", async () => {
      const images: ImageData[] = [{ src: SAMPLE_BASE64_IMAGE, index: 0 }];

      await expect(uploadImagesToIPFS(images, mockIPFSClient, true)).rejects.toThrow(
        /AES key required/
      );
    });

    it("should upload multiple images", async () => {
      mockIPFSClient.uploadToIPFS = vi.fn()
        .mockResolvedValueOnce({
          cid: "QmCID1",
          url: "https://gateway.pinata.cloud/ipfs/QmCID1",
          size: 100,
        })
        .mockResolvedValueOnce({
          cid: "QmCID2",
          url: "https://gateway.pinata.cloud/ipfs/QmCID2",
          size: 200,
        });

      const images: ImageData[] = [
        { src: SAMPLE_BASE64_IMAGE, index: 0 },
        { src: SAMPLE_BASE64_IMAGE, index: 1 },
      ];

      const result = await uploadImagesToIPFS(images, mockIPFSClient, false);

      expect(result).toHaveLength(2);
      expect(result[0].ipfsCid).toBe("QmCID1");
      expect(result[1].ipfsCid).toBe("QmCID2");
    });

    it("should throw error on upload failure", async () => {
      mockIPFSClient.uploadToIPFS = vi.fn().mockRejectedValue(new Error("Upload failed"));

      const images: ImageData[] = [{ src: SAMPLE_BASE64_IMAGE, index: 0 }];

      await expect(uploadImagesToIPFS(images, mockIPFSClient, false)).rejects.toThrow(
        /Image upload failed at index 0/
      );
    });

    it("should include alt text in metadata", async () => {
      const images: ImageData[] = [
        { src: SAMPLE_BASE64_IMAGE, index: 0, alt: "My image" },
      ];

      await uploadImagesToIPFS(images, mockIPFSClient, false);

      expect(mockIPFSClient.uploadToIPFS).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        expect.objectContaining({
          keyValues: expect.objectContaining({
            alt: "My image",
          }),
        })
      );
    });
  });

  describe("replaceImagesInHtml", () => {
    it("should replace base64 image sources with IPFS URLs", () => {
      const html = `<p>Text before</p><img src="${SAMPLE_BASE64_IMAGE}" alt="test"><p>Text after</p>`;
      const uploadedImages: UploadedImage[] = [
        {
          index: 0,
          ipfsCid: "QmTest123",
          ipfsUrl: "https://gateway.pinata.cloud/ipfs/QmTest123",
          originalSrc: SAMPLE_BASE64_IMAGE,
          encrypted: false,
        },
      ];

      const result = replaceImagesInHtml(html, uploadedImages);

      expect(result).toContain('src="https://gateway.pinata.cloud/ipfs/QmTest123"');
      expect(result).toContain('data-ipfs-cid="QmTest123"');
      expect(result).toContain('data-encrypted="false"');
      expect(result).not.toContain(SAMPLE_BASE64_IMAGE);
    });

    it("should replace multiple images", () => {
      const base641 = SAMPLE_BASE64_IMAGE;
      const base642 = SAMPLE_BASE64_IMAGE_2;
      const html = `<img src="${base641}"><p>Text</p><img src="${base642}">`;

      const uploadedImages: UploadedImage[] = [
        {
          index: 0,
          ipfsCid: "QmCID1",
          ipfsUrl: "https://ipfs/QmCID1",
          originalSrc: base641,
          encrypted: false,
        },
        {
          index: 1,
          ipfsCid: "QmCID2",
          ipfsUrl: "https://ipfs/QmCID2",
          originalSrc: base642,
          encrypted: true,
        },
      ];

      const result = replaceImagesInHtml(html, uploadedImages);

      expect(result).toContain("https://ipfs/QmCID1");
      expect(result).toContain("https://ipfs/QmCID2");
      expect(result).toContain('data-encrypted="true"');
    });

    it("should handle special regex characters in base64", () => {
      const base64WithSpecialChars = "data:image/png;base64,ABC+/=123";
      const html = `<img src="${base64WithSpecialChars}">`;

      const uploadedImages: UploadedImage[] = [
        {
          index: 0,
          ipfsCid: "QmTest",
          ipfsUrl: "https://ipfs/QmTest",
          originalSrc: base64WithSpecialChars,
          encrypted: false,
        },
      ];

      const result = replaceImagesInHtml(html, uploadedImages);

      expect(result).toContain("https://ipfs/QmTest");
    });

    it("should sort images by index before replacement", () => {
      const base641 = SAMPLE_BASE64_IMAGE;
      const html = `<img src="${base641}">`;

      const uploadedImages: UploadedImage[] = [
        {
          index: 2,
          ipfsCid: "QmCID2",
          ipfsUrl: "https://ipfs/QmCID2",
          originalSrc: "other",
          encrypted: false,
        },
        {
          index: 0,
          ipfsCid: "QmCID1",
          ipfsUrl: "https://ipfs/QmCID1",
          originalSrc: base641,
          encrypted: false,
        },
      ];

      const result = replaceImagesInHtml(html, uploadedImages);

      expect(result).toContain("https://ipfs/QmCID1");
    });
  });

  describe("replaceImagesInJson", () => {
    it("should replace base64 images in Tiptap JSON", () => {
      const json = {
        type: "doc",
        content: [
          {
            type: "image",
            attrs: { src: SAMPLE_BASE64_IMAGE },
          },
        ],
      };

      const uploadedImages: UploadedImage[] = [
        {
          index: 0,
          ipfsCid: "QmTest123",
          ipfsUrl: "https://ipfs/QmTest123",
          originalSrc: SAMPLE_BASE64_IMAGE,
          encrypted: false,
        },
      ];

      const result = replaceImagesInJson(json, uploadedImages);

      expect(result.content[0].attrs.src).toBe("https://ipfs/QmTest123");
      expect(result.content[0].attrs["data-ipfs-cid"]).toBe("QmTest123");
      expect(result.content[0].attrs["data-encrypted"]).toBe("false");
    });

    it("should handle null/undefined json", () => {
      const uploadedImages: UploadedImage[] = [];

      expect(replaceImagesInJson(null, uploadedImages)).toBeNull();
      expect(replaceImagesInJson(undefined, uploadedImages)).toBeUndefined();
    });

    it("should replace nested images", () => {
      const json = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "image",
                attrs: { src: SAMPLE_BASE64_IMAGE_3 },
              },
            ],
          },
        ],
      };

      const uploadedImages: UploadedImage[] = [
        {
          index: 0,
          ipfsCid: "QmNested",
          ipfsUrl: "https://ipfs/QmNested",
          originalSrc: SAMPLE_BASE64_IMAGE_3,
          encrypted: true,
        },
      ];

      const result = replaceImagesInJson(json, uploadedImages);

      expect(result.content[0].content[0].attrs.src).toBe("https://ipfs/QmNested");
      expect(result.content[0].content[0].attrs["data-encrypted"]).toBe("true");
    });

    it("should not modify original json object", () => {
      const json = {
        type: "doc",
        content: [
          {
            type: "image",
            attrs: { src: SAMPLE_BASE64_IMAGE },
          },
        ],
      };

      const uploadedImages: UploadedImage[] = [
        {
          index: 0,
          ipfsCid: "QmTest",
          ipfsUrl: "https://ipfs/QmTest",
          originalSrc: SAMPLE_BASE64_IMAGE,
          encrypted: false,
        },
      ];

      const result = replaceImagesInJson(json, uploadedImages);

      expect(json.content[0].attrs.src).toBe(SAMPLE_BASE64_IMAGE);
      expect(result.content[0].attrs.src).toBe("https://ipfs/QmTest");
    });

    it("should skip images without matching uploaded image", () => {
      const json = {
        type: "doc",
        content: [
          {
            type: "image",
            attrs: { src: "data:image/png;base64,notUploaded" },
          },
        ],
      };

      const uploadedImages: UploadedImage[] = [];

      const result = replaceImagesInJson(json, uploadedImages);

      expect(result.content[0].attrs.src).toBe("data:image/png;base64,notUploaded");
    });
  });

  describe("processNewsletterImages", () => {
    let mockIPFSClient: IPFSClient;

    beforeEach(() => {
      mockIPFSClient = {
        uploadToIPFS: vi.fn().mockResolvedValue({
          cid: "QmProcessed123",
          url: "https://gateway.pinata.cloud/ipfs/QmProcessed123",
          size: 100,
        }),
      } as any;
    });

    it("should process complete workflow without encryption", async () => {
      const html = `<img src="${SAMPLE_BASE64_IMAGE}">`;
      const json = {
        type: "doc",
        content: [
          {
            type: "image",
            attrs: { src: SAMPLE_BASE64_IMAGE },
          },
        ],
      };

      const result = await processNewsletterImages(html, json, mockIPFSClient, false);

      expect(result.html).toContain("https://gateway.pinata.cloud/ipfs/QmProcessed123");
      expect(result.json.content[0].attrs.src).toContain("QmProcessed123");
      expect(result.imageCids).toEqual(["QmProcessed123"]);
    });

    it("should process complete workflow with encryption", async () => {
      const html = `<img src="${SAMPLE_BASE64_IMAGE}">`;
      const json = {
        type: "doc",
        content: [
          {
            type: "image",
            attrs: { src: SAMPLE_BASE64_IMAGE },
          },
        ],
      };
      const aesKey = crypto.getRandomValues(new Uint8Array(32));

      const result = await processNewsletterImages(html, json, mockIPFSClient, true, aesKey);

      expect(result.html).toContain("QmProcessed123");
      expect(result.json.content[0].attrs["data-encrypted"]).toBe("true");
      expect(result.imageCids).toHaveLength(1);
    });

    it("should return original content when no images found", async () => {
      const html = "<p>No images here</p>";
      const json = {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "No images" }] }],
      };

      const result = await processNewsletterImages(html, json, mockIPFSClient, false);

      expect(result.html).toBe(html);
      expect(result.json).toEqual(json);
      expect(result.imageCids).toEqual([]);
      expect(mockIPFSClient.uploadToIPFS).not.toHaveBeenCalled();
    });

    it("should handle multiple images", async () => {
      mockIPFSClient.uploadToIPFS = vi.fn()
        .mockResolvedValueOnce({
          cid: "QmImg1",
          url: "https://ipfs/QmImg1",
          size: 100,
        })
        .mockResolvedValueOnce({
          cid: "QmImg2",
          url: "https://ipfs/QmImg2",
          size: 200,
        });

      const base641 = SAMPLE_BASE64_IMAGE;
      const base642 = SAMPLE_BASE64_IMAGE_2;
      const html = `<img src="${base641}"><img src="${base642}">`;
      const json = {
        type: "doc",
        content: [
          { type: "image", attrs: { src: base641 } },
          { type: "image", attrs: { src: base642 } },
        ],
      };

      const result = await processNewsletterImages(html, json, mockIPFSClient, false);

      expect(result.imageCids).toEqual(["QmImg1", "QmImg2"]);
      expect(result.html).toContain("QmImg1");
      expect(result.html).toContain("QmImg2");
    });

    it("should propagate upload errors", async () => {
      mockIPFSClient.uploadToIPFS = vi.fn().mockRejectedValue(new Error("Network error"));

      const html = `<img src="${SAMPLE_BASE64_IMAGE}">`;
      const json = {
        type: "doc",
        content: [
          {
            type: "image",
            attrs: { src: SAMPLE_BASE64_IMAGE },
          },
        ],
      };

      await expect(
        processNewsletterImages(html, json, mockIPFSClient, false)
      ).rejects.toThrow(/Image upload failed/);
    });
  });
});
