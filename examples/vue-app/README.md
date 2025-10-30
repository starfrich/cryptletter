# 🔐 FHEVM Vue Example

A complete example of building privacy-preserving decentralized applications with **Vue 3** and **Zama's FHEVM** (Fully Homomorphic Encryption Virtual Machine).

This example demonstrates the `@fhevm-sdk/vue` adapter, showcasing how to:
- Connect to Ethereum wallets
- Create and manage FHEVM instances
- Encrypt data before sending to smart contracts
- Decrypt encrypted values from the blockchain
- Build reactive Vue components with FHE operations

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- MetaMask or another Web3 wallet
- **Sepolia ETH** (get from [Sepolia Faucet](https://sepoliafaucet.com/))
- **Alchemy API Key** (get from [Alchemy Dashboard](https://dashboard.alchemy.com/))

### Installation

```bash
# From the root of the monorepo
pnpm install

# Create .env file in examples/vue-app/
cp examples/vue-app/.env.example examples/vue-app/.env
# Edit .env and add your VITE_ALCHEMY_API_KEY

# Start the Vue dev server
pnpm vue:dev
```

The app will open at `http://localhost:3001`

### Setup MetaMask for Sepolia

1. Open MetaMask
2. Switch network to **Sepolia Test Network**
3. Get test ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
4. Connect your wallet in the app

## 📁 Project Structure

```
examples/vue-app/
├── src/
│   ├── components/                 # Vue components
│   │   ├── WalletConnect.vue       # Wallet connection UI
│   │   └── FHECounterDemo.vue      # Main FHE counter demo
│   ├── composables/                # Vue composables
│   │   ├── useWallet.ts            # Wallet connection logic
│   │   └── useFHECounter.ts        # FHE counter operations
│   ├── contracts/                  # Contract ABIs and addresses
│   │   └── deployedContracts.ts    
│   ├── types/                      # TypeScript type definitions
│   │   └── index.ts
│   ├── App.vue                     # Root component
│   ├── main.ts                     # Application entry point
│   ├── config.ts                   # App configuration
│   └── style.css                   # Global styles
├── index.html                      # HTML template
├── vite.config.ts                  # Vite configuration
├── tsconfig.json                   # TypeScript configuration
├── package.json
└── README.md                       # This file
```

## 🧩 Key Concepts

### 1. FHEVM Instance Creation

The FHEVM instance is created using the `useFhevm` composable from `@fhevm-sdk/vue`:

```vue
<script setup lang="ts">
import { useFhevm } from '@fhevm-sdk/vue'
import { MemoryStorage } from '@fhevm-sdk/storage'
import { computed } from 'vue'

// Create storage instance (framework-agnostic)
const storage = new MemoryStorage()

const { instance, status, error, refresh } = useFhevm({
  provider: computed(() => walletProvider.value),
  chainId: chainIdRef,
  enabled: computed(() => isConnected.value),
  initialMockChains: { 31337: 'http://localhost:8545' },
  retry: {
    maxRetries: 3,
    retryDelay: 2000,
  },
  onSuccess: (instance) => {
    console.log('FHEVM ready!', instance)
  },
})
</script>
```

**Key Features:**
- **Reactive:** Works seamlessly with Vue's reactivity system (`ref`, `computed`)
- **Auto-retry:** Built-in retry logic with exponential backoff
- **Status tracking:** `idle` → `loading` → `ready` | `error`
- **Callbacks:** `onSuccess` and `onError` hooks

### 2. Wallet Connection

The `useWallet` composable provides wallet management:

```typescript
import { useWallet } from '@/composables/useWallet'

const {
  address,
  chainId,
  isConnected,
  provider,
  signer,
  connect,
  disconnect,
  switchNetwork,
} = useWallet({
  autoConnect: true,
})
```

**Features:**
- Auto-reconnect on page reload
- Network switching
- Account change detection
- Ethers.js provider and signer

### 3. FHE Encryption

Encrypting data before sending to contracts:

```typescript
import { useFHEEncryption, buildParamsFromAbi } from '@fhevm-sdk/vue'

const { encryptWith } = useFHEEncryption({
  instance: fhevmInstance,
  ethersSigner: signer,
  contractAddress,
})

// Encrypt a value
const encrypted = await encryptWith((builder) => {
  builder.add32(42) // Encrypt as euint32
})

// Build contract call parameters
const params = buildParamsFromAbi(encrypted, contractAbi, 'increment')

// Call contract
const tx = await contract.increment(...params)
await tx.wait()
```

### 4. FHE Decryption

Decrypting encrypted handles from the blockchain:

```typescript
import { useFHEDecrypt } from '@fhevm-sdk/vue'

const decryptRequests = computed(() => [
  {
    handle: '0x123...', // Encrypted handle from contract
    contractAddress: '0xABC...',
  },
])

const {
  canDecrypt,
  decrypt,
  isDecrypting,
  results,
} = useFHEDecrypt({
  instance: fhevmInstance,
  ethersSigner: signer,
  fhevmDecryptionSignatureStorage: storage,
  chainId,
  requests: decryptRequests,
})

// Decrypt the value
await decrypt()

// Access decrypted value
const decryptedValue = results.value['0x123...']
```

## 🎨 Vue-Specific Features Demonstrated

### 1. **v-model Binding**

Two-way data binding for encrypted input values:

```vue
<template>
  <input v-model.number="inputValue" type="number" />
  <button @click="updateCounter(inputValue)">
    Update Counter
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const inputValue = ref(1)

const updateCounter = async (value: number) => {
  // Encrypt and send to contract
  await fheCounter.updateCounter(value)
}
</script>
```

### 2. **Watchers**

React to changes in encrypted handles:

```typescript
import { watch } from 'vue'

watch(handle, (newHandle, oldHandle) => {
  if (newHandle !== oldHandle && newHandle) {
    console.log('Handle changed:', newHandle)
    // Optionally auto-decrypt new handle
  }
})
```

### 3. **Transitions**

Smooth animations for state changes:

```vue
<template>
  <!-- Fade transition for loading states -->
  <Transition name="fade">
    <div v-if="status === 'ready'" class="content">
      <!-- Content -->
    </div>
  </Transition>

  <!-- Slide-fade for value changes -->
  <Transition name="slide-fade" mode="out-in">
    <div v-if="isDecrypted" key="decrypted">
      Decrypted: {{ value }}
    </div>
    <div v-else key="encrypted">
      🔒 Encrypted
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

### 4. **Computed Properties**

Derive UI state from reactive data:

```typescript
const canUpdateCounter = computed(() => {
  return Boolean(
    hasContract.value &&
    fhevmInstance.value &&
    hasSigner.value &&
    !isProcessing.value
  )
})

const shortHandle = computed(() => {
  if (!handle.value) return ''
  return `${handle.value.slice(0, 10)}...${handle.value.slice(-8)}`
})
```

## 🏗️ Architecture

### Composables Pattern

This example follows Vue's **Composables Pattern** for reusable logic:

1. **`useWallet`** - Wallet connection and management
2. **`useFhevm`** - FHEVM instance lifecycle (from SDK)
3. **`useFHEEncryption`** - Data encryption utilities (from SDK)
4. **`useFHEDecrypt`** - Handle decryption logic (from SDK)
5. **`useFHECounter`** - Application-specific counter logic

Each composable:
- Returns reactive refs and computed properties
- Handles cleanup automatically (`onUnmounted`)
- Composes with other composables
- Is fully testable in isolation

### Component Composition

```
App.vue
├── WalletConnect.vue     (uses useWallet)
└── FHECounterDemo.vue    (uses useFhevm + useFHECounter)
    └── useFHECounter     (uses useFHEEncryption + useFHEDecrypt)
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file (optional):

```bash
# Alchemy API key (optional for development)
VITE_ALCHEMY_API_KEY=your_alchemy_key

# WalletConnect project ID (optional)
VITE_WALLET_CONNECT_PROJECT_ID=your_project_id
```

### Network Configuration

Edit `src/config.ts` to configure networks:

```typescript
export const config = {
  targetNetworks: [hardhat, sepolia] as const,
  pollingInterval: 30000,
  mockChains: {
    31337: 'http://localhost:8545', // Hardhat local
  },
}
```

### Contract Addresses

Update `src/contracts/deployedContracts.ts` after deploying:

```typescript
export const deployedContracts = {
  31337: {
    FHECounter: {
      address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      abi: [...],
    },
  },
  11155111: { // Sepolia
    FHECounter: {
      address: '0x...', // Your deployed address
      abi: [...],
    },
  },
}
```

## 📚 Best Practices

### 1. **Reactive Dependencies**

Always pass refs/computed to composables, not raw values:

```typescript
// ✅ Good - reactive
const { instance } = useFhevm({
  provider: computed(() => wallet.provider.value),
  chainId: chainIdRef,
})

// ❌ Bad - not reactive
const { instance } = useFhevm({
  provider: wallet.provider.value, // Won't react to changes
  chainId: 31337, // Static value
})
```

### 2. **Cleanup**

Use `onUnmounted` for cleanup:

```typescript
import { onUnmounted } from 'vue'

const controller = new AbortController()

onUnmounted(() => {
  controller.abort() // Cleanup on component unmount
})
```

### 3. **Error Handling**

Always handle errors from async operations:

```typescript
const updateCounter = async (value: number) => {
  try {
    await counter.updateCounter(value)
    message.value = 'Success!'
  } catch (error) {
    message.value = `Error: ${error.message}`
    console.error(error)
  }
}
```

### 4. **TypeScript**

Leverage TypeScript for type safety:

```typescript
import type { FhevmInstance } from '@fhevm-sdk/vue'
import type { Ref } from 'vue'

interface UseFHECounterParams {
  instance: Ref<FhevmInstance | undefined>
  chainId: Ref<number | undefined>
  signer: Ref<ethers.Signer | undefined>
  // ...
}
```

## 💾 Storage & Persistence

This example uses **IndexedDB** for persistent storage of FHEVM decryption signatures. Users do **not** need to re-sign after page refresh!

### Storage Behavior

- **First visit**: IndexedDB is initialized, signature created on first decrypt
- **Subsequent visits**: Signature is reused from IndexedDB (no re-signing needed)
- **Browser close/reopens**: Signature persists in IndexedDB
- **Manual clear**: User must manually clear browser data to reset signatures

### Using IndexedDB Storage

The `useIndexedDBStorage` composable provides persistent storage:

```typescript
import { useIndexedDBStorage } from '@/composables/useIndexedDBStorage'

const { storage, isReady, error } = useIndexedDBStorage({
  dbName: 'fhevm-vue-app',
  storeName: 'signatures',
})

// Use in decryption
const { decrypt } = useFHEDecrypt({
  fhevmDecryptionSignatureStorage: storage,
  // ... other options
})
```

### Storage Features

- ✅ **Persistent** - Signatures cached across page reloads
- ✅ **Automatic fallback** - Falls back to in-memory if IndexedDB unavailable
- ✅ **Error handling** - Graceful handling of initialization failures
- ✅ **State tracking** - `isReady` and `error` refs for UI feedback

### Clearing Storage

To clear stored signatures (for testing or resetting state):

**Via Browser Console:**
```javascript
indexedDB.deleteDatabase('fhevm-vue-app')
```

**Programmatically:**
```typescript
const clearStorage = async () => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase('fhevm-vue-app')
    req.onsuccess = () => resolve(true)
    req.onerror = () => reject(req.error)
  })
}
```

## 🧪 Testing

This example includes comprehensive unit tests for composables and components with 90%+ coverage.

### Running Tests

```bash
# Run tests once
pnpm vue:check-types
```

### Test Structure

```
tests/
├── setup.ts                          # Global test setup & mocks
└── unit/
    ├── composables/
    │   ├── useWallet.test.ts         # Wallet connection tests
    │   ├── useFHECounter.test.ts     # FHE operations tests
    │   └── useIndexedDBStorage.test.ts # Storage persistence tests
    └── components/
        ├── WalletConnect.test.ts     # Wallet UI component tests
        └── FHECounterDemo.test.ts    # Counter demo component tests
```

### Test Coverage

Current coverage targets:

- **Composables**: 90%+ (logic coverage)
- **Components**: 85%+ (UI coverage)
- **Overall**: 90%+ line coverage

### Unit Test Example

Testing composables in isolation:

```typescript
import { describe, it, expect } from 'vitest'
import { useFHECounter } from '@/composables/useFHECounter'
import { ref } from 'vue'

describe('useFHECounter', () => {
  it('should initialize with correct default values', () => {
    const mockInstance = ref(undefined)
    const mockChainId = ref(31337)
    const mockStorage = { get: vi.fn(), set: vi.fn() }

    const counter = useFHECounter({
      instance: mockInstance,
      chainId: mockChainId,
      signer: ref(undefined),
      provider: ref(undefined),
      storage: mockStorage as any,
    })

    expect(counter.handle.value).toBeUndefined()
    expect(counter.isDecrypted.value).toBe(false)
    expect(typeof counter.updateCounter).toBe('function')
  })
})
```

### Component Test Example

Testing components with mocked composables:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FHECounterDemo from '@/components/FHECounterDemo.vue'
import { vi } from 'vitest'

// Mock the composables
vi.mock('@/composables/useWallet', () => ({
  useWallet: () => ({
    isConnected: { value: false },
    chainId: { value: undefined },
    // ... other mocks
  }),
}))

describe('FHECounterDemo', () => {
  it('renders wallet connection prompt when not connected', () => {
    const wrapper = mount(FHECounterDemo)

    expect(wrapper.text()).toContain('connect')
    expect(wrapper.text()).toContain('wallet')
  })
})
```

### Mocking Strategies

**Wallet Mocking:**
```typescript
// In tests/setup.ts
const mockEthereum = {
  request: vi.fn(),
  on: vi.fn(),
}
Object.defineProperty(window, 'ethereum', { value: mockEthereum })
```

**IndexedDB Mocking:**
```typescript
import 'fake-indexeddb/auto'
// Now IndexedDB is available in tests
```

**Composable Mocking:**
```typescript
vi.mock('@/composables/useWallet', () => ({
  useWallet: () => ({ /* mock return */ })
}))
```

## 🚀 Deployment

### Build for Production

```bash
pnpm build
```

The built files will be in `dist/` directory.

### Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables:
   - `VITE_ALCHEMY_API_KEY`
   - `VITE_WALLET_CONNECT_PROJECT_ID`
4. Deploy!

### Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

## 🐛 Troubleshooting

### MetaMask Nonce Issues

When restarting the local Hardhat node:

1. Open MetaMask
2. Settings → Advanced → "Clear Activity Tab Data"
3. Refresh the page

### FHEVM Instance Fails to Load

- Check that the Hardhat node is running
- Verify the chain ID matches (31337 for local)
- Check browser console for errors
- Try the retry button

### Decryption Signature Already Exists

This is normal - the signature is cached in storage. To clear:

```typescript
// Clear storage manually
localStorage.clear()
// Or use the provided storage API
await storage.clear()
```

## 📖 Learn More

- **FHEVM Documentation:** https://docs.zama.ai/protocol
- **Vue 3 Documentation:** https://vuejs.org/
- **Ethers.js Documentation:** https://docs.ethers.org/
- **Vite Documentation:** https://vitejs.dev/

## 🤝 Contributing

This example is part of the Universal FHEVM SDK project. Contributions are welcome!

## 📄 License

BSD-3-Clause-Clear - see LICENSE file for details

---

**Built with ❤️ using Zama FHEVM and Vue 3**
