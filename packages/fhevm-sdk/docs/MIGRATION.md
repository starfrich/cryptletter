# Migration Guide

Comprehensive guide for migrating applications to the latest FHEVM SDK version and handling FHEVM protocol upgrades.

## Table of Contents

1. [FHEVM v0.9 Migration (October 2025)](#fhevm-v09-migration-october-2025)
2. [SDK Version Migration](#sdk-version-migration)
3. [Common Migration Patterns](#common-migration-patterns)
4. [Breaking Changes Reference](#breaking-changes-reference)
5. [Troubleshooting](#troubleshooting)

---

## FHEVM v0.9 Migration (October 2025)

### Overview

FHEVM v0.9 introduces significant changes to the decryption workflow, Gateway contracts, and infrastructure. **This release includes a Testnet state reset.**

**Timeline:**
- **October 20-24**: New Testnet deployment with FHEVM v0.9
- **October 27-31**: Migration period for dApps
- **November 3**: Old Testnet deprecation

### Critical Breaking Changes

#### 1. Decryption Event Changes

**What Changed:**
- Encrypted shares and signatures are no longer aggregated on-chain
- Each KMS response now emits separate events

**Old Event (Deprecated):**
```solidity
// ❌ DEPRECATED - No longer emitted
event PublicDecryptionResponse(
    uint256 indexed decryptionId,
    bytes decryptedResult,
    bytes[] signatures,
    bytes extraData
);
```

**New Events:**
```solidity
// ✅ NEW - Use these events
event UserDecryptionResponse(
    uint256 indexed decryptionId,
    uint256 indexShare,
    bytes userDecryptedShare,
    bytes signature,
    bytes extraData
);

event UserDecryptionResponseThresholdReached(
    uint256 indexed decryptionId
);
```

**Impact on SDK:**
- The FHEVM SDK **automatically handles** the new event format
- **No code changes required** for SDK users
- The SDK's `decrypt()` function abstracts the event parsing

**Manual Migration (if using custom event listeners):**

```typescript
// ❌ OLD - Don't use
const filter = decryptionContract.filters.PublicDecryptionResponse(decryptionId);

// ✅ NEW - Use this
const responseFilter = decryptionContract.filters.UserDecryptionResponse(decryptionId);
const thresholdFilter = decryptionContract.filters.UserDecryptionResponseThresholdReached(decryptionId);

// Listen for individual shares
decryptionContract.on(responseFilter, (id, indexShare, share, signature, extraData) => {
    console.log(`Received share ${indexShare} for decryption ${id}`);
});

// Listen for threshold reached (decryption complete)
decryptionContract.on(thresholdFilter, (id) => {
    console.log(`Decryption ${id} threshold reached - decryption complete`);
});
```

---

#### 2. EIP712 Signature Verification Changes

**What Changed:**
- The `contractsChainId` field removed from EIP712 signature verification

**Old Struct (v0.8):**
```solidity
// ❌ DEPRECATED
struct UserDecryptRequestVerification {
    address contractAddress;
    uint256 contractsChainId;  // ❌ REMOVED
    bytes32 handleHash;
    uint256 nonce;
}
```

**New Struct (v0.9):**
```solidity
// ✅ NEW
struct UserDecryptRequestVerification {
    address contractAddress;
    // contractsChainId field removed
    bytes32 handleHash;
    uint256 nonce;
}
```

**Impact on SDK:**
- The FHEVM SDK **automatically uses the correct signature format**
- **No code changes required** for SDK users
- The SDK's signature generation functions are version-aware

**Manual Migration (if using custom signature logic):**

```typescript
// ❌ OLD - v0.8 signature
const domain = {
    name: "Decryption",
    version: "1",
    chainId: chainId,
    verifyingContract: gatewayAddress,
};

const types = {
    UserDecryptRequestVerification: [
        { name: "contractAddress", type: "address" },
        { name: "contractsChainId", type: "uint256" },  // ❌ REMOVE THIS
        { name: "handleHash", type: "bytes32" },
        { name: "nonce", type: "uint256" },
    ],
};

const value = {
    contractAddress: contractAddress,
    contractsChainId: chainId,  // ❌ REMOVE THIS
    handleHash: handleHash,
    nonce: nonce,
};

// ✅ NEW - v0.9 signature
const domain = {
    name: "Decryption",
    version: "1",
    chainId: chainId,
    verifyingContract: gatewayAddress,
};

const types = {
    UserDecryptRequestVerification: [
        { name: "contractAddress", type: "address" },
        // contractsChainId removed
        { name: "handleHash", type: "bytes32" },
        { name: "nonce", type: "uint256" },
    ],
};

const value = {
    contractAddress: contractAddress,
    // contractsChainId removed
    handleHash: handleHash,
    nonce: nonce,
};

const signature = await signer.signTypedData(domain, types, value);
```

---

#### 3. Gateway Contract Renaming

**What Changed:**
- Two Gateway contracts have been renamed

**Contract Renames:**

| Old Name (v0.8) | New Name (v0.9) |
|----------------|-----------------|
| `MultichainAcl` | `MultichainACL` |
| `KmsManagement` | `KMSGeneration` |

**Environment Variable Renames:**

| Old Variable | New Variable |
|-------------|-------------|
| `KMS_MANAGEMENT_ADDRESS` | `KMS_GENERATION_ADDRESS` |
| `KMS_CONNECTOR_KMS_MANAGEMENT_CONTRACT__ADDRESS` | `KMS_CONNECTOR_KMS_GENERATION_CONTRACT__ADDRESS` |

**Impact on SDK:**
- **No direct impact** on SDK users
- SDK uses the Gateway address from provider config

**Migration for Infrastructure:**

```bash
# ❌ OLD - v0.8 environment variables
KMS_MANAGEMENT_ADDRESS=0x...
KMS_CONNECTOR_KMS_MANAGEMENT_CONTRACT__ADDRESS=0x...

# ✅ NEW - v0.9 environment variables
KMS_GENERATION_ADDRESS=0x...
KMS_CONNECTOR_KMS_GENERATION_CONTRACT__ADDRESS=0x...
```

---

#### 4. Gateway Check Functions Replaced

**What Changed:**
- All `check...()` view functions replaced with `is...()` functions
- Old functions reverted on failure, new functions return boolean

**Function Renames:**

| Old Function (v0.8) | New Function (v0.9) |
|-------------------|-------------------|
| `checkPublicDecryptAllowed()` | `isPublicDecryptAllowed()` |
| `checkDecryptionPending()` | `isDecryptionPending()` |

**Impact on SDK:**
- The SDK **does not use** these Gateway view functions directly
- **No code changes required** for SDK users

**Manual Migration (if using Gateway functions directly):**

```typescript
// ❌ OLD - v0.8 (reverts on failure)
try {
    await gatewayContract.checkPublicDecryptAllowed(decryptionId);
    console.log("Decryption allowed");
} catch (error) {
    console.error("Decryption not allowed:", error);
}

// ✅ NEW - v0.9 (returns boolean)
const isAllowed = await gatewayContract.isPublicDecryptAllowed(decryptionId);
if (isAllowed) {
    console.log("Decryption allowed");
} else {
    console.error("Decryption not allowed");
}
```

---

### Testnet State Reset

**What's Changing:**
- All existing state will be reset
- Data will **not** carry over to the new Testnet
- Smart contracts must be redeployed

**Actions Required:**

#### 1. Re-deploy Smart Contracts

```bash
# After October 20, 2025

# 1. Update contract addresses in your config
# Remove old deployed addresses

# 2. Re-deploy to new Testnet
pnpm hardhat:deploy:sepolia

# 3. Verify deployment
pnpm hardhat:verify:sepolia

# 4. Update frontend config with new addresses
pnpm generate
```

#### 2. Update dApp Configuration

```typescript
// Update contract addresses in your app
// packages/nextjs/scaffold.config.ts (or similar)

const config = {
    // ❌ OLD - Remove old contract addresses
    // counterAddress: "0x1234...", // Old Testnet address

    // ✅ NEW - Add newly deployed addresses
    counterAddress: "0xABCD...", // New Testnet address (after Oct 20)

    // Update RPC endpoints if changed
    rpcUrl: "https://sepolia-us.starfrich.me",
    chainId: 11155111,
};
```

#### 3. Clear Cached Data

```typescript
import { clearMetrics } from "@fhevm-sdk/utils";

// Clear SDK metrics/cache
clearMetrics();

// Clear IndexedDB storage (signatures)
const storage = await useIndexedDBStorage();
// Optionally clear old signatures for old contracts
await storage.clear();
```

#### 4. Test Migration

**Checklist:**
- [ ] Connect wallet to new Testnet
- [ ] Verify FHEVM instance creation works
- [ ] Test encryption operations
- [ ] Test decryption operations
- [ ] Verify contract interactions
- [ ] Check signature caching works
- [ ] Test error handling

---

### SDK Compatibility

**Current SDK Version:** `v0.1.0`

**FHEVM Protocol Compatibility:**

| SDK Version | FHEVM v0.8 | FHEVM v0.9 | Notes |
|------------|-----------|-----------|-------|
| `v0.1.0` | ✅ | ✅ | Fully compatible with both versions |

**The SDK is designed to be forward-compatible:**
- Automatically detects protocol version
- Uses correct signature format
- Parses correct event format
- No code changes required for v0.9 upgrade

---

## SDK Version Migration

### Migrating from Direct RelayerSDK Usage

**Before (Direct RelayerSDK):**

```typescript
import { createInstance, encrypt, decrypt } from "@zama-fhe/relayer-sdk";

// Manual instance creation
const instance = await createInstance({
    provider: window.ethereum,
    chainId: 11155111,
});

// Manual encryption
const encrypted = await encrypt({
    instance,
    contractAddress,
    userAddress,
    value: 42,
    type: "euint32",
});

// Manual decryption
const signature = await getSignature(/* ... */);
const decrypted = await decrypt({
    instance,
    handle: encrypted.handles[0],
    signature,
});
```

**After (FHEVM SDK):**

```typescript
import { useFhevm, useFHEEncryption, useFHEDecrypt, useWalletCallbacks } from "@fhevm-sdk/react";

function MyComponent() {
    const { instance, isLoading } = useFhevm();
    const { getAddress } = useWalletCallbacks();

    const { encryptWith } = useFHEEncryption({
        instance,
        getAddress,
        contractAddress: "0x..."
    });

    const { decrypt } = useFHEDecrypt({
        instance,
        getAddress
    });

    // Encryption with automatic error handling
    const handleEncrypt = async () => {
        const encrypted = await encryptWith((builder) => {
            builder.add32(42);
        });
        console.log("Encrypted:", encrypted);
    };

    // Decryption with automatic signature management
    const handleDecrypt = async (handle: string) => {
        const value = await decrypt(handle, "0x...");
        console.log("Decrypted:", value);
    };

    return (/* ... */);
}
```

**Benefits:**
- ✅ Automatic error handling with recovery suggestions
- ✅ Automatic retry logic with exponential backoff
- ✅ Automatic signature caching (IndexedDB)
- ✅ Input validation with helpful error messages
- ✅ Performance monitoring and debug logging

---

### Migrating from Old Hook Patterns

**Before (Old `useFhevm` pattern):**

```typescript
import { useFhevm } from "./old-hooks";

function Counter() {
    const { instance, error } = useFhevm();

    // Manual error handling
    if (error) {
        console.error("FHEVM error:", error);
        return <div>Error: {error.message}</div>;
    }

    // Manual encryption
    const handleEncrypt = async () => {
        try {
            const encrypted = await instance.encrypt(42, "euint32");
        } catch (err) {
            console.error("Encryption failed:", err);
        }
    };
}
```

**After (New SDK Pattern):**

```typescript
import { useFhevm, useFHEEncryption, useWalletCallbacks } from "@fhevm-sdk/react";
import { getErrorRecoverySuggestion } from "@fhevm-sdk/utils";

function Counter() {
    const { instance, isLoading, error } = useFhevm();
    const { getAddress } = useWalletCallbacks();

    const { encryptWith, isEncrypting } = useFHEEncryption({
        instance,
        getAddress,
        contractAddress: "0x...",
        onError: (err) => {
            const suggestion = getErrorRecoverySuggestion(err);
            alert(suggestion.message);
        }
    });

    // Automatic error recovery suggestions
    if (error) {
        const suggestion = getErrorRecoverySuggestion(error);
        return (
            <div className="error">
                <h3>{suggestion.title}</h3>
                <p>{suggestion.message}</p>
                <ul>
                    {suggestion.actions.map((action, i) => (
                        <li key={i}>{action}</li>
                    ))}
                </ul>
            </div>
        );
    }

    // Automatic retry + validation with builder pattern
    const handleEncrypt = async () => {
        await encryptWith((builder) => {
            builder.add32(42); // Encrypt uint32 value
        });
    };

    return (/* ... */);
}
```

---

## Common Migration Patterns

### Pattern 1: Migrate Storage from In-Memory to IndexedDB

**Before:**

```typescript
// No storage - signatures requested every time
const signature = await instance.getDecryptionSignature(contractAddress);
```

**After:**

```typescript
import { useIndexedDBStorage } from "@fhevm-sdk/react";

function MyComponent() {
    const { storage, isReady } = useIndexedDBStorage({
        dbName: "my-fhevm-app",
        storeName: "signatures"
    });

    // Signatures automatically cached
    const { decrypt } = useFHEDecrypt({ storage });

    // First call: requests signature from user
    // Subsequent calls: uses cached signature
    const value = await decrypt(handle, contractAddress);
}
```

**Benefits:**
- ✅ Signatures cached across page reloads
- ✅ Reduces wallet signature prompts
- ✅ Better UX for returning users

---

### Pattern 2: Add Error Recovery

**Before:**

```typescript
try {
    const encrypted = await instance.encrypt(value, type);
} catch (error) {
    console.error("Encryption failed:", error.message);
    alert("Encryption failed");
}
```

**After:**

```typescript
import {
    getErrorRecoverySuggestion,
    retryAsyncOrThrow
} from "@fhevm-sdk/utils";

try {
    // Automatic retry with exponential backoff
    const encrypted = await retryAsyncOrThrow(
        () => instance.encrypt(value, type),
        { maxRetries: 3, initialDelayMs: 100 }
    );
} catch (error) {
    // User-friendly error message
    const suggestion = getErrorRecoverySuggestion(error);

    showErrorModal({
        title: suggestion.title,
        message: suggestion.message,
        actions: suggestion.actions,
        canRetry: suggestion.retryable,
    });
}
```

---

### Pattern 3: Add Input Validation

**Before:**

```typescript
async function encryptValue(value: number, type: string) {
    // No validation - runtime errors
    return await instance.encrypt(value, type);
}
```

**After:**

```typescript
import {
    assertValidEncryptionValue,
    assertValidFhevmType,
} from "@fhevm-sdk/utils";

async function encryptValue(value: number, type: string) {
    // Validate early with helpful errors
    try {
        assertValidFhevmType(type);
        assertValidEncryptionValue(value, type);
    } catch (error) {
        // Error message includes valid ranges and types
        console.error(error.message);
        throw error;
    }

    return await instance.encrypt(value, type);
}
```

**Example Error Messages:**

```
❌ Invalid FHEVM type: "euint999"
Valid types: ebool, euint8, euint16, euint32, euint64, euint128, euint256, eaddress

❌ Value 999 is out of range for euint8
Must be between 0 and 255
```

---

### Pattern 4: Add Performance Monitoring

**Before:**

```typescript
async function decrypt(handle: string) {
    const start = Date.now();
    const value = await instance.decrypt(handle);
    console.log(`Decryption took ${Date.now() - start}ms`);
    return value;
}
```

**After:**

```typescript
import {
    measureAsync,
    getPerformanceSummary,
    enableDebugLogging
} from "@fhevm-sdk/utils";

// Enable metrics collection
enableDebugLogging({ metrics: true });

async function decrypt(handle: string) {
    // Automatic performance measurement
    return await measureAsync(
        "decrypt",
        () => instance.decrypt(handle),
        { handle } // metadata
    );
}

// Later: analyze performance
const summary = getPerformanceSummary();
console.table(summary);
// [
//   { name: 'decrypt', count: 10, avgDurationMs: 245, minDurationMs: 200, maxDurationMs: 310 }
// ]
```

---

## Breaking Changes Reference

### FHEVM v0.9 (October 2025)

| Change | Impact | SDK Handles? | Manual Action Required? |
|--------|--------|--------------|------------------------|
| Decryption events changed | High | ✅ Yes | ❌ No |
| EIP712 signature simplified | Medium | ✅ Yes | ❌ No |
| Gateway contracts renamed | Low | ✅ Yes | ⚠️ If using direct Gateway calls |
| `check...` → `is...` functions | Low | ✅ N/A | ⚠️ If using Gateway view functions |
| Testnet state reset | High | ❌ N/A | ✅ Yes - Redeploy contracts |

### SDK Breaking Changes (if any)

**Current Version:** `v0.1.0` (Initial release)

No breaking changes yet. Future breaking changes will be documented here.

---

## Troubleshooting

### Issue: Decryption fails after v0.9 upgrade

**Symptoms:**
- Decryption requests fail
- "Invalid signature" errors
- Events not emitted

**Solution:**

```typescript
// 1. Clear old signatures
const storage = await useIndexedDBStorage();
await storage.clear();

// 2. Request fresh signature
const { decrypt } = useFHEDecrypt({ storage });
const value = await decrypt(handle, contractAddress);
// SDK will automatically request new signature
```

---

### Issue: Contract address not found

**Symptoms:**
- "Contract not found" errors
- Transaction reverts
- Cannot connect to contract

**Solution:**

```bash
# 1. Verify new Testnet is active
curl https://sepolia-us.starfrich.me

# 2. Redeploy contracts
pnpm hardhat:deploy:sepolia

# 3. Update frontend config
pnpm generate

# 4. Restart dev server
pnpm start
```

---

### Issue: Signature format mismatch

**Symptoms:**
- "Invalid signature" errors
- EIP712 verification fails

**Solution:**

The SDK automatically uses the correct signature format. If using custom signature logic:

```typescript
// Ensure you're using v0.9 format (no contractsChainId)
const types = {
    UserDecryptRequestVerification: [
        { name: "contractAddress", type: "address" },
        // ❌ REMOVE: { name: "contractsChainId", type: "uint256" },
        { name: "handleHash", type: "bytes32" },
        { name: "nonce", type: "uint256" },
    ],
};
```

---

### Issue: MetaMask nonce errors

**Symptoms:**
- "Nonce too high" or "Nonce too low"
- Transactions fail to submit

**Solution:**

```bash
# 1. Clear MetaMask activity tab
# Settings → Advanced → Clear Activity Tab Data

# 2. Restart browser

# 3. Reconnect wallet to dApp
```

---

## Migration Checklist

### For FHEVM v0.9 Upgrade (October 2025)

- [ ] **Before October 20:**
  - [ ] Review this migration guide
  - [ ] Backup contract addresses and deployment info
  - [ ] Test migration on local Hardhat network

- [ ] **After October 20 (New Testnet Live):**
  - [ ] Update RPC endpoints (if changed)
  - [ ] Redeploy smart contracts to new Testnet
  - [ ] Update contract addresses in frontend
  - [ ] Clear IndexedDB storage (old signatures)
  - [ ] Test encryption/decryption flows
  - [ ] Verify signature caching works

- [ ] **Before November 3 (Old Testnet Deprecation):**
  - [ ] Complete migration
  - [ ] Verify all features work on new Testnet
  - [ ] Update deployment documentation

### For SDK Upgrades (General)

- [ ] Check [SDK Changelog](../CHANGELOG.md)
- [ ] Review breaking changes
- [ ] Update dependencies (`pnpm update @fhevm-sdk`)
- [ ] Run tests (`pnpm sdk:test`)
- [ ] Test in development (`pnpm start`)
- [ ] Deploy to staging/production

---

## Additional Resources

- [FHEVM v0.9 Release Notes](https://docs.zama.ai/change-log/release/fhevm-v0.9-october-2025)
- [FHEVM Roadmap](https://docs.zama.ai/change-log/roadmap)
- [SDK Documentation](../README.md)
- [Error Handling Guide](./ERROR_HANDLING.md)
- [Utils Guide](./UTILS.md)
- [GitHub Issues](https://github.com/zama-ai/fhevm-react-template/issues)

---

## Support

Need help with migration?

- 📚 [Documentation](https://docs.zama.ai/protocol/)
- 💬 [Discord Community](https://discord.com/invite/zama)
- 🐛 [Report Issues](https://github.com/zama-ai/fhevm-react-template/issues)

---

**Last Updated:** October 2025
**SDK Version:** v0.1.0
**FHEVM Version:** v0.9
