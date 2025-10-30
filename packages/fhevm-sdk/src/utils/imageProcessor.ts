/**
 * Image Processing Utilities for Cryptletter SDK
 *
 * Handles extraction, encryption, and IPFS upload of images from Tiptap content
 */

import type { IPFSClient } from "./ipfs";

export interface ImageData {
  src: string; // base64 or URL
  alt?: string;
  index: number;
}

export interface UploadedImage {
  index: number;
  ipfsCid: string;
  ipfsUrl: string;
  originalSrc: string; // To replace in HTML
  encrypted: boolean;
}

/**
 * Extract all base64 images from Tiptap JSON content
 */
export function extractBase64ImagesFromJson(json: any): ImageData[] {
  const images: ImageData[] = [];
  let index = 0;

  function traverse(node: any) {
    if (node.type === "image" && node.attrs?.src?.startsWith("data:image/")) {
      images.push({
        src: node.attrs.src,
        alt: node.attrs.alt,
        index: index++,
      });
    }

    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
  }

  if (json) {
    traverse(json);
  }

  return images;
}

/**
 * Convert base64 data URL to Uint8Array
 */
export function base64ToUint8Array(base64DataUrl: string): Uint8Array {
  // Extract base64 part from data:image/png;base64,xxxxx
  const base64 = base64DataUrl.split(",")[1];
  if (!base64) {
    throw new Error("Invalid base64 data URL");
  }

  // Decode base64
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

/**
 * Encrypt image data using AES-256-GCM
 */
export async function encryptImage(imageData: Uint8Array, aesKey: Uint8Array): Promise<Uint8Array> {
  // Get crypto object (works in both browser and Node.js)
  const crypto = globalThis.crypto || (global as any).crypto || require("crypto").webcrypto;

  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Import key
  const cryptoKey = await crypto.subtle.importKey("raw", aesKey, { name: "AES-GCM", length: 256 }, false, [
    "encrypt",
  ]);

  // Encrypt
  const encryptedData = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, imageData);

  // Combine IV + encrypted data for storage
  const result = new Uint8Array(iv.length + encryptedData.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encryptedData), iv.length);

  return result;
}

/**
 * Decrypt image data using AES-256-GCM
 */
export async function decryptImage(encryptedData: Uint8Array, aesKey: Uint8Array): Promise<Uint8Array> {
  // Get crypto object
  const crypto = globalThis.crypto || (global as any).crypto || require("crypto").webcrypto;

  // Extract IV (first 12 bytes)
  const iv = encryptedData.slice(0, 12);
  const ciphertext = encryptedData.slice(12);

  // Import key
  const cryptoKey = await crypto.subtle.importKey("raw", aesKey, { name: "AES-GCM", length: 256 }, false, [
    "decrypt",
  ]);

  // Decrypt
  const decryptedData = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, ciphertext);

  return new Uint8Array(decryptedData);
}

/**
 * Upload images to IPFS (with optional encryption for premium content)
 */
export async function uploadImagesToIPFS(
  images: ImageData[],
  ipfsClient: IPFSClient,
  encrypt: boolean = false,
  aesKey?: Uint8Array
): Promise<UploadedImage[]> {
  if (encrypt && !aesKey) {
    throw new Error("AES key required for encrypted image upload");
  }

  const uploadedImages: UploadedImage[] = [];

  for (const image of images) {
    try {
      // Convert base64 to bytes
      let imageBytes = base64ToUint8Array(image.src);

      // Encrypt if needed
      if (encrypt && aesKey) {
        imageBytes = await encryptImage(imageBytes, aesKey);
      }

      // Upload to IPFS
      const uploadResult = await ipfsClient.uploadToIPFS(imageBytes, {
        name: `newsletter-image-${image.index}.${encrypt ? "enc" : "bin"}`,
        keyValues: {
          type: "newsletter-image",
          index: image.index,
          encrypted: encrypt ? 1 : 0,
          alt: image.alt || "",
        },
      });

      uploadedImages.push({
        index: image.index,
        ipfsCid: uploadResult.cid,
        ipfsUrl: uploadResult.url,
        originalSrc: image.src,
        encrypted: encrypt,
      });
    } catch (error) {
      console.error(`Failed to upload image ${image.index}:`, error);
      throw new Error(
        `Image upload failed at index ${image.index}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return uploadedImages;
}

/**
 * Replace base64 images in HTML with IPFS URLs
 */
export function replaceImagesInHtml(html: string, uploadedImages: UploadedImage[]): string {
  let result = html;

  // Sort by index to ensure consistent replacement
  const sortedImages = [...uploadedImages].sort((a, b) => a.index - b.index);

  for (const img of sortedImages) {
    // Escape special regex characters in the base64 src
    const escapedSrc = img.originalSrc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`src="${escapedSrc}"`, "g");
    result = result.replace(
      regex,
      `src="${img.ipfsUrl}" data-ipfs-cid="${img.ipfsCid}" data-encrypted="${img.encrypted}"`
    );
  }

  return result;
}

/**
 * Replace base64 images in Tiptap JSON with IPFS URLs
 */
export function replaceImagesInJson(json: any, uploadedImages: UploadedImage[]): any {
  if (!json) return json;

  const result = JSON.parse(JSON.stringify(json)); // Deep clone
  const imageMap = new Map(uploadedImages.map(img => [img.originalSrc, img]));

  function traverse(node: any) {
    if (node.type === "image" && node.attrs?.src) {
      const uploadedImg = imageMap.get(node.attrs.src);
      if (uploadedImg) {
        node.attrs.src = uploadedImg.ipfsUrl;
        node.attrs["data-ipfs-cid"] = uploadedImg.ipfsCid;
        node.attrs["data-encrypted"] = uploadedImg.encrypted.toString();
      }
    }

    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
  }

  traverse(result);
  return result;
}

/**
 * Complete workflow: Extract, upload, and replace images
 */
export async function processNewsletterImages(
  html: string,
  json: any,
  ipfsClient: IPFSClient,
  encrypt: boolean = false,
  aesKey?: Uint8Array
): Promise<{ html: string; json: any; imageCids: string[] }> {
  // Extract images from JSON (more reliable than HTML parsing)
  const images = extractBase64ImagesFromJson(json);

  if (images.length === 0) {
    return { html, json, imageCids: [] };
  }

  // Upload images to IPFS
  const uploadedImages = await uploadImagesToIPFS(images, ipfsClient, encrypt, aesKey);

  // Replace in both HTML and JSON
  const newHtml = replaceImagesInHtml(html, uploadedImages);
  const newJson = replaceImagesInJson(json, uploadedImages);

  // Extract CIDs for contract storage
  const imageCids = uploadedImages.map(img => img.ipfsCid);

  return {
    html: newHtml,
    json: newJson,
    imageCids,
  };
}
