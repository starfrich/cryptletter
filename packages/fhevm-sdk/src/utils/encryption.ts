/**
 * Encryption Utility Functions for Cryptletter
 *
 * Provides AES-256-GCM encryption/decryption for newsletter content
 * and utilities for converting between AES keys and FHE encrypted values.
 */

/**
 * Newsletter content structure
 */
export interface NewsletterData {
  title: string;
  content: string;
  author: string;
  timestamp: number;
  images?: string[]; // IPFS CIDs of images
  metadata?: Record<string, any>;
}

/**
 * Encrypted bundle containing ciphertext and encryption parameters
 */
export interface EncryptedBundle {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  authTag: Uint8Array;
  version: string;
}

/**
 * AES Key size (256 bits = 32 bytes)
 */
export const AES_KEY_SIZE = 32;

/**
 * AES IV size (96 bits = 12 bytes for GCM mode)
 */
export const AES_IV_SIZE = 12;

/**
 * Auth Tag size (128 bits = 16 bytes)
 */
export const AES_AUTH_TAG_SIZE = 16;

/**
 * Encryption version
 */
export const ENCRYPTION_VERSION = "1.0.0";

/**
 * Generate a random AES-256 key
 * @returns 32-byte AES key as Uint8Array
 */
export function generateAESKey(): Uint8Array {
  if (typeof window !== "undefined" && window.crypto) {
    // Browser environment
    return window.crypto.getRandomValues(new Uint8Array(AES_KEY_SIZE));
  } else if (typeof global !== "undefined" && global.crypto) {
    // Node.js environment (Node 15+)
    return global.crypto.getRandomValues(new Uint8Array(AES_KEY_SIZE));
  } else {
    // Fallback for older Node.js
    try {
      const crypto = require("crypto");
      return new Uint8Array(crypto.randomBytes(AES_KEY_SIZE));
    } catch (error) {
      throw new Error("Crypto API not available in this environment");
    }
  }
}

/**
 * Generate a random initialization vector (IV)
 * @returns 12-byte IV for AES-GCM
 */
export function generateIV(): Uint8Array {
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto.getRandomValues(new Uint8Array(AES_IV_SIZE));
  } else if (typeof global !== "undefined" && global.crypto) {
    return global.crypto.getRandomValues(new Uint8Array(AES_IV_SIZE));
  } else {
    try {
      const crypto = require("crypto");
      return new Uint8Array(crypto.randomBytes(AES_IV_SIZE));
    } catch (error) {
      throw new Error("Crypto API not available in this environment");
    }
  }
}

/**
 * Get crypto object (browser or Node.js)
 */
function getCrypto(): any {
  // Try window.crypto first (browser)
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto;
  }

  // Try globalThis.crypto (Node 15+)
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    return globalThis.crypto;
  }

  // Try global.crypto (Node with polyfill)
  if (typeof global !== "undefined" && (global as any).crypto) {
    return (global as any).crypto;
  }

  // Last resort: try requiring crypto module directly
  try {
    const { webcrypto } = require("crypto");
    return webcrypto;
  } catch (e) {
    // Ignore
  }

  throw new Error("Web Crypto API not available");
}

/**
 * Import AES key for Web Crypto API
 * @param keyBytes - Raw AES key bytes
 * @returns CryptoKey for AES-GCM
 */
async function importAESKey(keyBytes: Uint8Array): Promise<CryptoKey> {
  if (keyBytes.length !== AES_KEY_SIZE) {
    throw new Error(`Invalid AES key size: expected ${AES_KEY_SIZE} bytes, got ${keyBytes.length}`);
  }

  const crypto = getCrypto();

  // Check for subtle API existence (use 'in' operator for getters)
  if (!("subtle" in crypto) || !crypto.subtle) {
    throw new Error("Web Crypto API subtle not available");
  }

  return await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt newsletter content with AES-256-GCM
 * @param newsletter - Newsletter data to encrypt
 * @param key - 32-byte AES key
 * @returns Encrypted bundle with ciphertext, IV, and auth tag
 */
export async function encryptContent(
  newsletter: NewsletterData,
  key: Uint8Array
): Promise<EncryptedBundle> {
  if (!newsletter) {
    throw new Error("Newsletter data is required");
  }

  if (!key || key.length !== AES_KEY_SIZE) {
    throw new Error(`Invalid AES key: expected ${AES_KEY_SIZE} bytes`);
  }

  try {
    // Serialize newsletter to JSON
    const plaintext = JSON.stringify(newsletter);
    const plaintextBytes = new TextEncoder().encode(plaintext);

    // Generate random IV
    const iv = generateIV();

    // Import key
    const cryptoKey = await importAESKey(key);

    // Encrypt with AES-GCM
    const crypto = getCrypto();
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
        tagLength: AES_AUTH_TAG_SIZE * 8, // 128 bits
      },
      cryptoKey,
      plaintextBytes
    );

    // AES-GCM outputs ciphertext with auth tag appended
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const ciphertext = encryptedArray.slice(0, -AES_AUTH_TAG_SIZE);
    const authTag = encryptedArray.slice(-AES_AUTH_TAG_SIZE);

    return {
      ciphertext,
      iv,
      authTag,
      version: ENCRYPTION_VERSION,
    };
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error(`Failed to encrypt content: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Decrypt newsletter content with AES-256-GCM
 * @param bundle - Encrypted bundle with ciphertext, IV, and auth tag
 * @param key - 32-byte AES key
 * @returns Decrypted newsletter data
 */
export async function decryptContent(
  bundle: EncryptedBundle,
  key: Uint8Array
): Promise<NewsletterData> {
  if (!bundle || !bundle.ciphertext || !bundle.iv || !bundle.authTag) {
    throw new Error("Invalid encrypted bundle");
  }

  if (!key || key.length !== AES_KEY_SIZE) {
    throw new Error(`Invalid AES key: expected ${AES_KEY_SIZE} bytes`);
  }

  try {
    // Import key
    const cryptoKey = await importAESKey(key);

    // Combine ciphertext and auth tag
    const encryptedData = new Uint8Array(bundle.ciphertext.length + bundle.authTag.length);
    encryptedData.set(bundle.ciphertext);
    encryptedData.set(bundle.authTag, bundle.ciphertext.length);

    // Decrypt with AES-GCM
    const crypto = getCrypto();
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: bundle.iv,
        tagLength: AES_AUTH_TAG_SIZE * 8,
      },
      cryptoKey,
      encryptedData
    );

    // Parse decrypted JSON
    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    const newsletter = JSON.parse(decryptedText) as NewsletterData;

    return newsletter;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error(`Failed to decrypt content: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Convert AES key to FHE input format
 * The AES key (32 bytes) needs to be converted to a format suitable for FHE encryption.
 * We split it into chunks that fit into euint256 (32 bytes each).
 *
 * @param key - 32-byte AES key
 * @returns Hex string representation for FHE input
 */
export function aesKeyToFHEInput(key: Uint8Array): string {
  if (!key || key.length !== AES_KEY_SIZE) {
    throw new Error(`Invalid AES key size: expected ${AES_KEY_SIZE} bytes`);
  }

  // Convert to hex string with 0x prefix
  return "0x" + Array.from(key)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert FHE output back to AES key
 * Takes the decrypted FHE value and converts it back to AES key bytes.
 *
 * @param fheOutput - Hex string from FHE decryption
 * @returns 32-byte AES key
 */
export function fheOutputToAESKey(fheOutput: string): Uint8Array {
  if (!fheOutput) {
    throw new Error("FHE output is required");
  }

  // Remove 0x prefix if present
  const hex = fheOutput.startsWith("0x") ? fheOutput.slice(2) : fheOutput;

  // Convert hex to bytes
  if (hex.length !== AES_KEY_SIZE * 2) {
    throw new Error(`Invalid FHE output length: expected ${AES_KEY_SIZE * 2} hex chars, got ${hex.length}`);
  }

  const key = new Uint8Array(AES_KEY_SIZE);
  for (let i = 0; i < AES_KEY_SIZE; i++) {
    key[i] = parseInt(hex.substr(i * 2, 2), 16);
  }

  return key;
}

/**
 * Serialize encrypted bundle to base64 for storage
 * @param bundle - Encrypted bundle
 * @returns Base64 encoded bundle
 */
export function serializeBundle(bundle: EncryptedBundle): string {
  // Validate bundle structure
  if (!bundle || typeof bundle !== 'object') {
    throw new Error('Invalid bundle: expected object');
  }

  if (!bundle.ciphertext || !(bundle.ciphertext instanceof Uint8Array)) {
    console.error('Bundle ciphertext:', bundle.ciphertext);
    throw new Error(`Invalid bundle.ciphertext: expected Uint8Array, got ${typeof bundle.ciphertext}`);
  }

  if (!bundle.iv || !(bundle.iv instanceof Uint8Array)) {
    console.error('Bundle iv:', bundle.iv);
    throw new Error(`Invalid bundle.iv: expected Uint8Array, got ${typeof bundle.iv}`);
  }

  if (!bundle.authTag || !(bundle.authTag instanceof Uint8Array)) {
    console.error('Bundle authTag:', bundle.authTag);
    throw new Error(`Invalid bundle.authTag: expected Uint8Array, got ${typeof bundle.authTag}`);
  }

  const data = {
    ciphertext: Array.from(bundle.ciphertext),
    iv: Array.from(bundle.iv),
    authTag: Array.from(bundle.authTag),
    version: bundle.version,
  };

  const jsonString = JSON.stringify(data);

  // Use Buffer for Node.js, btoa for browser
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(jsonString).toString('base64');
  } else if (typeof btoa !== 'undefined') {
    return btoa(jsonString);
  } else {
    throw new Error('No base64 encoding method available');
  }
}

/**
 * Deserialize base64 bundle back to EncryptedBundle
 * @param serialized - Base64 encoded bundle
 * @returns Encrypted bundle
 */
export function deserializeBundle(serialized: string): EncryptedBundle {
  try {
    let jsonString: string;

    // Use Buffer for Node.js, atob for browser
    if (typeof Buffer !== 'undefined') {
      jsonString = Buffer.from(serialized, 'base64').toString('utf-8');
    } else if (typeof atob !== 'undefined') {
      jsonString = atob(serialized);
    } else {
      throw new Error('No base64 decoding method available');
    }

    const data = JSON.parse(jsonString);

    return {
      ciphertext: new Uint8Array(data.ciphertext),
      iv: new Uint8Array(data.iv),
      authTag: new Uint8Array(data.authTag),
      version: data.version,
    };
  } catch (error) {
    console.error('Deserialization error:', error);
    throw new Error(`Failed to deserialize encrypted bundle: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a preview of newsletter content (first N characters of title + content)
 * @param newsletter - Newsletter data
 * @param maxLength - Maximum preview length (default: 200)
 * @returns Preview text
 */
export function createPreview(newsletter: NewsletterData, maxLength: number = 200): string {
  const preview = `${newsletter.title} - ${newsletter.content}`;
  return preview.length > maxLength
    ? preview.substring(0, maxLength) + "..."
    : preview;
}
