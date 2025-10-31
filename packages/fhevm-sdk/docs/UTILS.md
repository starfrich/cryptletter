# FHEVM SDK Utils Guide

Comprehensive guide to FHEVM SDK utilities for error handling, retries, validation, debugging, IPFS operations, and content encryption.

## Overview

The SDK provides utilities for:

- **Error Handling**: User-friendly recovery suggestions
- **Retry Logic**: Exponential backoff with jitter
- **Validation**: Type-safe input validation
- **Debug Logging**: Performance monitoring
- **IPFS Operations**: Upload, download, pin/unpin (Cryptletter)
- **Image Processing**: Extract, encrypt, upload images (Cryptletter)
- **Content Encryption**: AES encryption with FHE (Cryptletter)

```typescript
import {
  getErrorRecoverySuggestion,
  retryAsyncOrThrow,
  assertValidAddress,
  enableDebugLogging,
  measureAsync,
} from "@fhevm-sdk";
```

## Error Handling

### Get Recovery Suggestions

```typescript
import { getErrorRecoverySuggestion, formatErrorSuggestion } from "@fhevm-sdk";

try {
  await encryptValue(instance, address, user, value, type);
} catch (error) {
  const suggestion = getErrorRecoverySuggestion(error);

  console.error(suggestion.title);     // "Encryption Failed"
  console.error(suggestion.message);   // User-friendly explanation
  console.error(suggestion.actions);   // ["1. ...", "2. ...", "3. ..."]
  console.error(suggestion.retryable); // true/false

  // Or format it
  const formatted = formatErrorSuggestion(suggestion);
  console.error(formatted);
}
```

### Check Error Properties

```typescript
import { isRetryable, isUserActionError } from "@fhevm-sdk";

try {
  await operation();
} catch (error) {
  if (isRetryable(error)) {
    console.log("Can retry");
  }

  if (isUserActionError(error)) {
    console.log("User action required");
  }
}
```

## Retry Logic

### Basic Retry

```typescript
import { retryAsync, retryAsyncOrThrow } from "@fhevm-sdk";

// Get result
const result = await retryAsync(() => createFhevmInstance(params));

if (result.success) {
  console.log(`Success after ${result.attempts} attempts`);
} else {
  console.error(`Failed after ${result.attempts} attempts`);
}

// Throw on failure
const instance = await retryAsyncOrThrow(() => createFhevmInstance(params));
```

### Retry Configuration

```typescript
const options = {
  maxRetries: 5,
  initialDelayMs: 100,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  useJitter: true,

  onRetry: (attempt, error, nextDelayMs) => {
    console.log(`Attempt ${attempt} failed, retrying in ${nextDelayMs}ms`);
  },
};

const result = await retryAsync(() => createFhevmInstance(params), options);
```

## Input Validation

### Address Validation

```typescript
import { isValidAddress, assertValidAddress } from "@fhevm-sdk";

if (!isValidAddress(address)) {
  console.error("Invalid address");
}

// Throw on invalid
assertValidAddress(address, "contractAddress");
```

### FHEVM Type Validation

```typescript
import { isValidFhevmType, assertValidFhevmType, getValidFhevmTypes } from "@fhevm-sdk";

if (!isValidFhevmType("euint32")) {
  console.error("Invalid type");
}

assertValidFhevmType(userInputType);

// Get valid types
const types = getValidFhevmTypes();
// ["ebool", "euint8", "euint16", "euint32", "euint64", "euint128", "euint256", "eaddress"]
```

### Value Validation

```typescript
import { validateEncryptionValue, assertValidEncryptionValue } from "@fhevm-sdk";

const isValid = validateEncryptionValue(42, "euint32");

// Throw with details
assertValidEncryptionValue(userValue, "euint8");
```

**Value Ranges:**

| Type | Min | Max |
|------|-----|-----|
| `ebool` | 0 | 1 |
| `euint8` | 0 | 255 |
| `euint16` | 0 | 65,535 |
| `euint32` | 0 | 4,294,967,295 |
| `euint64` | 0 | 18,446,744,073,709,551,615 |

## Debug Logging

### Enable Debugging

```typescript
import { enableDebugLogging, debug, info, warn, error } from "@fhevm-sdk";

enableDebugLogging({
  verbose: true,
  metrics: true,
  level: "debug",
});

debug("Operation started", { userId: 123 });
info("Operation completed");
warn("Deprecated API");
error("Operation failed", errorObject);
```

### Performance Monitoring

```typescript
import { startTimer, measureAsync, getPerformanceSummary } from "@fhevm-sdk";

// Manual timing
const stopTimer = startTimer("my_operation");
await someWork();
const metric = stopTimer();
console.log(`Took ${metric.durationMs}ms`);

// Auto timing
const result = await measureAsync("create_instance", () => createFhevmInstance(params));

// Get summary
console.table(getPerformanceSummary());
// [
//   { name: 'encrypt', count: 10, avgDurationMs: 245, minDurationMs: 200, maxDurationMs: 310 }
// ]
```

## IPFS Operations

### Create IPFS Client

```typescript
import { createIPFSClient } from "@fhevm-sdk";

// Default (localhost:5001)
const ipfs = createIPFSClient();

// Custom config
const ipfs = createIPFSClient({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
  headers: {
    authorization: `Basic ${btoa(`${projectId}:${projectSecret}`)}`,
  },
});
```

### Upload/Download

```typescript
import { uploadToIPFS, downloadFromIPFS } from "@fhevm-sdk";

// Upload
const jsonData = { title: "My Newsletter", content: "..." };
const result = await uploadToIPFS(ipfs, JSON.stringify(jsonData));
console.log(`Uploaded: ${result.cid}`);

// Download
const content = await downloadFromIPFS(ipfs, result.cid);
const text = new TextDecoder().decode(content);
const json = JSON.parse(text);
```

### Pin/Unpin

```typescript
import { pinContent, unpinContent } from "@fhevm-sdk";

// Pin for persistence
await pinContent(ipfs, cid);

// Unpin when done
await unpinContent(ipfs, cid);
```

## Image Processing

### Extract Images

```typescript
import { extractBase64ImagesFromJson } from "@fhevm-sdk";

const editorContent = {
  type: "doc",
  content: [{
    type: "image",
    attrs: { src: "data:image/png;base64,iVBORw0KGgo..." },
  }],
};

const images = extractBase64ImagesFromJson(editorContent);
images.forEach((img) => {
  console.log(`Type: ${img.type}`);
  console.log(`Data length: ${img.data.length} bytes`);
});
```

### Upload Images to IPFS

```typescript
import { uploadImagesToIPFS } from "@fhevm-sdk";

const images = [
  { type: "image/png", data: new Uint8Array([...]), originalSrc: "data:..." },
];

const uploaded = await uploadImagesToIPFS(ipfs, images);
uploaded.forEach((result) => {
  console.log(`CID: ${result.cid}`);
});
```

### Replace Images in Content

```typescript
import { replaceImagesInJson } from "@fhevm-sdk";

const uploadedImages = [
  { cid: "QmABC123...", type: "image/png", originalSrc: "data:..." },
];

const updated = replaceImagesInJson(editorContent, uploadedImages);
```

## Content Encryption

### Generate Keys

```typescript
import { generateAESKey, generateIV } from "@fhevm-sdk";

// 256-bit AES key
const key = await generateAESKey();
console.log(`Key: ${key.length} bytes`); // 32 bytes

// Initialization vector
const iv = generateIV();
console.log(`IV: ${iv.length} bytes`); // 12 bytes
```

### Encrypt/Decrypt Content

```typescript
import { encryptContent, decryptContent } from "@fhevm-sdk";

const content = JSON.stringify({ title: "Private", body: "Confidential" });

// Generate encryption materials
const key = await generateAESKey();
const iv = generateIV();

// Encrypt
const encrypted = await encryptContent(content, key, iv);

// Decrypt
const decrypted = await decryptContent(encrypted, key, iv);
const original = JSON.parse(decrypted);
```

### Convert Keys for FHE

```typescript
import { aesKeyToFHEInput, fheOutputToAESKey } from "@fhevm-sdk";

// Convert AES key to FHE input (32 euint8 values)
const key = await generateAESKey();
const fheInput = aesKeyToFHEInput(key);

// Convert FHE output back to AES key
const fheOutput = [/* decrypted euint8 values */];
const reconstructedKey = fheOutputToAESKey(fheOutput);
```

### Complete Workflow

```typescript
import {
  generateAESKey,
  generateIV,
  encryptContent,
  serializeBundle,
  uploadToIPFS,
  aesKeyToFHEInput,
  createIPFSClient,
} from "@fhevm-sdk";

async function encryptAndUpload(newsletter) {
  // 1. Generate encryption materials
  const key = await generateAESKey();
  const iv = generateIV();

  // 2. Encrypt content
  const content = JSON.stringify(newsletter);
  const encrypted = await encryptContent(content, key, iv);

  // 3. Create bundle
  const bundle = {
    version: 1,
    encrypted,
    iv,
    authTag: encrypted.slice(-16),
    metadata: {
      encryptedAt: Date.now(),
      contentType: "application/json",
    },
  };

  // 4. Serialize
  const serialized = serializeBundle(bundle);

  // 5. Upload to IPFS
  const ipfs = createIPFSClient();
  const result = await uploadToIPFS(ipfs, serialized);

  // 6. Convert key for FHE storage
  const fheKeyInput = aesKeyToFHEInput(key);

  return {
    ipfsCid: result.cid,
    fheKeyInput,
    iv,
  };
}
```

## Best Practices

### Error Handling

```typescript
// 1. Get suggestions
try {
  await operation();
} catch (error) {
  const suggestion = getErrorRecoverySuggestion(error);
  displayErrorToUser(suggestion);
}

// 2. Retry with feedback
const result = await retryAsyncOrThrow(
  () => operation(),
  {
    maxRetries: 3,
    onRetry: (attempt, error, delay) => {
      console.log(`Retrying (${attempt}/3) in ${delay}ms...`);
    }
  }
);
```

### Validation

```typescript
// Validate early
async function encryptUserValue(address, value, type) {
  assertValidAddress(address);
  assertValidFhevmType(type);
  assertValidEncryptionValue(value, type);

  return await encryptValue(instance, address, user, value, type);
}
```

### Performance Monitoring

```typescript
// Profile critical operations
async function criticalOperation() {
  return await measureAsync(
    "critical_op",
    () => expensiveOperation(),
    { userId: currentUser.id }
  );
}

// Monitor over time
setInterval(() => {
  const summary = getPerformanceSummary();
  const slowOps = summary.filter(s => s.avgDurationMs > 1000);
  if (slowOps.length > 0) {
    console.warn("Slow operations:", slowOps);
  }
}, 60000);
```
