# FHEVM SDK Examples Guide

Comprehensive guide to the **FHEVM SDK** examples across different frameworks and environments. Each example demonstrates the same core encryption/decryption functionality in different contexts.

## 📚 Examples Overview

### 🌐 Browser Examples

#### **Vanilla JS** (`examples/vanilla-js/`)
Pure JavaScript/HTML running in the browser using Vite.

- **Framework**: Vanilla JS + HTML5
- **Bundler**: Vite
- **SDK Entry**: `@fhevm-sdk/vanilla`
- **Use Case**: Minimal setup, no framework overhead
- **Storage**: IndexedDB (persistent)
- **Get Started**: `cd examples/vanilla-js && pnpm dev`

**Best for**: Learning the basics, prototyping, lightweight apps

---

#### **Vue 3** (`examples/vue-app/`)
Modern Vue 3 application with composition API.

- **Framework**: Vue 3 + Composition API
- **Bundler**: Vite
- **SDK Entry**: `@fhevm-sdk/vue`
- **Use Case**: Production Vue apps with FHEVM
- **Storage**: IndexedDB (persistent)
- **Get Started**: `cd examples/vue-app && pnpm dev`

**Best for**: Vue developers building encrypted dApps

---

### 🔧 Backend Examples

#### **Express.js Backend** (`examples/nodejs-backend/`)
REST API backend demonstrating FHEVM SDK in a server environment.

- **Framework**: Express.js + Node.js
- **SDK Entry**: `@fhevm-sdk/core`
- **Use Case**: Backend services for encryption/decryption
- **Storage**: In-memory (stateless)
- **API Endpoints**:
  - `POST /api/encrypt` - Encrypt and send to contract
  - `POST /api/decrypt` - Decrypt from contract
  - `GET /api/health` - Health check
- **Get Started**: `cd examples/nodejs-backend && pnpm dev`

**Best for**: Building backend APIs with FHEVM integration

See [nodejs-backend README](../../examples/nodejs-backend/README.md) for detailed setup and usage.

---

#### **Automation & Scheduling** (`examples/nodejs-automation/`)
Task scheduler demonstrating FHEVM SDK in automated workflows.

- **Framework**: Node.js + node-cron
- **SDK Entry**: `@fhevm-sdk/core`
- **Use Case**: Scheduled tasks, batch processing, automation
- **Storage**: In-memory (stateless)
- **Features**:
  - Daily decryption reports
  - Batch encryption processing
  - Task scheduling with cron
- **Get Started**: `cd examples/nodejs-automation && pnpm start`

**Best for**: Automation, scheduled jobs, data migration

See [nodejs-automation README](../../examples/nodejs-automation/README.md) for detailed setup and usage.

---

## 🎯 SDK Usage by Example

All examples use the **same FHEVM SDK core** - what differs is the framework:

### Vanilla JS (Browser)

```typescript
import { FhevmClient } from '@fhevm-sdk/vanilla';

const client = new FhevmClient({
  provider: window.ethereum,
});

await client.init();

// Encrypt
const encrypted = await client.encrypt(42, 'euint32', {
  contractAddress: '0x...',
  userAddress: '0x...',
});

// Decrypt
const value = await client.decrypt(encrypted.handles[0], '0x...', signature);
```

### Vue 3 (Browser)

```typescript
import { useFhevm, useFHEEncryption, useFHEDecrypt } from '@fhevm-sdk/vue';
import { ref } from 'vue';

export default {
  setup() {
    const { instance } = useFhevm({
      provider: ref(window.ethereum),
    });

    const { encryptWith, isEncrypting } = useFHEEncryption({
      instance,
      getAddress: async () => (await window.ethereum.request({
        method: 'eth_requestAccounts'
      }))[0],
      contractAddress: ref('0x...'),
    });

    const { decrypt, isDecrypting } = useFHEDecrypt({
      instance,
      getAddress: async () => (await window.ethereum.request({
        method: 'eth_requestAccounts'
      }))[0],
    });

    return { encryptWith, decrypt, isEncrypting, isDecrypting };
  }
};
```

### Express.js (Backend)

```typescript
import { createFhevmInstance, encryptValue, decryptValue } from '@fhevm-sdk/core';
import { createStorage } from '@fhevm-sdk/storage';

const fhevmInstance = await createFhevmInstance({
  provider: wallet.provider,
  signal: new AbortController().signal,
});

// Encrypt
const encrypted = await encryptValue(
  fhevmInstance,
  contractAddress,
  userAddress,
  42,
  'euint32'
);

// Decrypt
const value = await decryptValue(
  fhevmInstance,
  handle,
  contractAddress,
  signature
);
```

### Automation (Node.js)

```typescript
import { createFhevmInstance, encryptValue, decryptValue } from '@fhevm-sdk/core';

const fhevmInstance = await createFhevmInstance({
  provider: wallet.provider,
  signal: new AbortController().signal,
});

// Same API as Express.js
const encrypted = await encryptValue(...);
const decrypted = await decryptValue(...);
```

---

## 🚀 Quick Start

### Setup All Examples

From the project root:

```bash
# Install all dependencies
pnpm install

# All examples use the same SDK from packages/fhevm-sdk/
```

### Run Individual Examples

```bash
# Vanilla JS (browser)
cd examples/vanilla-js
pnpm dev
# Opens http://localhost:5173

# Vue 3 (browser)
cd examples/vue-app
pnpm dev
# Opens http://localhost:5173

# Express Backend
cd examples/nodejs-backend
cp .env.example .env
pnpm dev
# Starts on http://localhost:3001

# Automation
cd examples/nodejs-automation
cp .env.example .env
pnpm start
# Starts task scheduler
```

---

## 📊 Comparison Table

| Feature | Vanilla JS | Vue 3 | Express | Automation |
|---------|-----------|-------|---------|-----------|
| **Environment** | Browser | Browser | Backend | Backend |
| **Framework** | None | Vue 3 | Express.js | Node.js |
| **SDK Entry** | `@fhevm-sdk/vanilla` | `@fhevm-sdk/vue` | `@fhevm-sdk/core` | `@fhevm-sdk/core` |
| **Storage** | IndexedDB | IndexedDB | In-Memory | In-Memory |
| **Use Case** | Learning | Production Apps | REST API | Automation |
| **Complexity** | Low | Medium | Medium | Medium |
| **Scalability** | Single User | Single User | Multi-User | Batch Processing |

---

## 🔄 Common Flows

### Browser to Backend

```
┌─────────────────┐
│  Vanilla JS or  │
│     Vue App     │  (User encrypts data)
└────────┬────────┘
         │
         │ POST /api/encrypt
         ▼
┌─────────────────┐
│ Express Backend │  (Receives and stores)
└─────────────────┘
```

### Scheduled Decryption

```
┌──────────────────┐
│  Automation Job  │
│  (Daily at 00:00)│  (Reads & decrypts)
└────────┬─────────┘
         │
         │ getCount()
         ▼
    ┌─────────┐
    │ Contract│
    └─────────┘
```

---

## 🔐 Wallet Configuration

All examples support two wallet types via environment variables:

### Mnemonic (HD Wallet)

```bash
MNEMONIC="test test test test test test test test test test test junk"
```

### Private Key

```bash
PRIVATE_KEY="0x..."
```

---

## 📝 Network Configuration

Examples support both local development and Sepolia testnet:

### Localhost (Hardhat)

```bash
RPC_URL="http://127.0.0.1:8545"
CHAIN_ID="31337"
```

### Sepolia Testnet

```bash
RPC_URL="https://sepolia.infura.io/v3/YOUR_INFURA_KEY"
CHAIN_ID="11155111"
```

---

## 📚 Learn More

- [FHEVM SDK Documentation](../packages/fhevm-sdk/README.md)
- [Error Handling Guide](../packages/fhevm-sdk/docs/ERROR_HANDLING.md)
- [Utils Guide](../packages/fhevm-sdk/docs/UTILS.md)
- [FHEVM Documentation](https://docs.zama.ai/protocol/)
- [Zama Developer Program](https://www.zama.ai/post/developer-program-bounty-track-october-2025-build-an-universal-fhevm-sdk)

---

## 🤝 Contributing

Examples are great places to showcase patterns and improvements:

1. Improve existing examples
2. Add new use cases
3. Enhance documentation
4. Report issues

---

**Happy exploring! 🎉** Pick an example that matches your use case and get started.
