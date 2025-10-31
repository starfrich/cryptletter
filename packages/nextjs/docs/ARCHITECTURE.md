# Cryptletter Frontend Architecture

Architectural overview for the Cryptletter Next.js application.

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Application Structure](#application-structure)
3. [Routing](#routing)
4. [Key Components](#key-components)
5. [State Management](#state-management)
6. [Data Flow](#data-flow)
7. [FHEVM & IPFS Integration](#fhevm--ipfs-integration)
8. [Security](#security)

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Web3**: Wagmi v2 + Viem
- **FHE**: @fhevm-sdk (Zama)
- **Storage**: IPFS (Pinata)
- **Styling**: TailwindCSS + DaisyUI
- **State**: Zustand + React Query

## Application Structure

### Directory Layout

```
packages/nextjs/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (providers, theme)
│   ├── page.tsx                # Homepage (/)
│   ├── not-found.tsx           # 404 page
│   │
│   ├── _components/            # Page-level shared components
│   │   ├── CreatorDashboardView.tsx
│   │   ├── CreatorDiscovery.tsx
│   │   ├── CreatorProfile.tsx
│   │   ├── NewsletterDetail.tsx
│   │   ├── PublishEditor.tsx
│   │   ├── SubscribeCheckout.tsx
│   │   └── SubscriptionManagement.tsx
│   │
│   ├── creator/                # Creator routes
│   │   └── [address]/
│   │       ├── page.tsx        # /creator/[address]
│   │       └── post/
│   │           └── [id]/
│   │               └── page.tsx  # /creator/[address]/post/[id]
│   │
│   ├── dashboard/              # Creator dashboard
│   │   ├── page.tsx            # /dashboard
│   │   └── publish/
│   │       └── page.tsx        # /dashboard/publish
│   │
│   ├── subscriptions/          # Subscriber portal
│   │   └── page.tsx            # /subscriptions
│   │
│   └── subscribe/              # Subscribe flow
│       └── [address]/
│           └── page.tsx        # /subscribe/[address]
│
├── components/                 # Reusable components
│   ├── cryptletter/            # Domain-specific components
│   ├── helper/                 # Utility components
│   ├── layouts/                # Layout components
│   ├── Header.tsx
│   ├── ThemeController.tsx
│   └── DappWrapperWithProviders.tsx
│
├── hooks/                      # Custom React hooks
│   ├── scaffold-eth/           # Contract interaction hooks
│   └── fhevm/                  # FHEVM-specific hooks
│
├── services/                   # Application services
│   ├── store/                  # Zustand state stores
│   │   └── store.ts            # Global app state
│   └── web3/                   # Web3 configuration
│       ├── wagmiConfig.tsx     # Wagmi config
│       └── wagmiConnectors.tsx # Wallet connectors
│
├── utils/                      # Helper functions
│   ├── validation.ts
│   ├── formatting.ts
│   └── errors.ts
│
├── contracts/                  # Generated contract files
│   ├── deployedContracts.ts    # Auto-generated addresses
│   └── externalContracts.ts    # Type definitions
│
├── types/                      # TypeScript definitions
│   ├── cryptletter.ts
│   └── ipfs.ts
│
└── styles/                     # Global styles
    └── globals.css
```

## Routing

| Route                          | Auth | Description              |
| ------------------------------ | ---- | ------------------------ |
| `/`                            | No   | Creator discovery        |
| `/creator/[address]`           | No   | Creator profile          |
| `/creator/[address]/post/[id]` | Yes* | Newsletter viewer        |
| `/subscribe/[address]`         | Yes  | Subscribe checkout       |
| `/dashboard`                   | Yes  | Creator dashboard        |
| `/dashboard/publish`           | Yes  | Publish newsletter       |
| `/subscriptions`               | Yes  | User subscriptions       |

*Auth required only for premium content

## Key Components

### Component Hierarchy

```
App
├── DappWrapperWithProviders (Web3 + Query + Theme)
│   ├── RainbowKitProvider
│   ├── WagmiProvider
│   ├── QueryClientProvider
│   └── ThemeProvider
│
└── RootLayout
    ├── Header
    │   ├── Logo
    │   ├── Navigation
    │   └── RainbowKitCustomConnectButton
    │       ├── AddressInfoDropdown
    │       ├── NetworkOptions
    │       └── WrongNetworkDropdown
    │
    └── Page Content
        ├── PageContainer (layout wrapper)
        └── Page-specific components
            ├── app/_components/
            │   ├── CreatorDashboardView
            │   ├── CreatorDiscovery
            │   ├── CreatorProfile
            │   ├── NewsletterDetail
            │   ├── PublishEditor
            │   ├── SubscribeCheckout
            │   └── SubscriptionManagement
            │
            └── components/cryptletter/
                ├── CreatorCard
                ├── NewsletterEditor
                │   └── TiptapEditor
                ├── NewsletterPreview
                ├── NewsletterViewer
                └── SubscriptionStatus
```

### Key Domain Components

**NewsletterEditor** - Rich text editor with encryption
```typescript
import { useFHEEncryption } from '@fhevm-sdk/react';
import { useWriteContract } from 'wagmi';

// Handles: AES encryption → IPFS upload → FHE key encryption → Blockchain publish
```

**NewsletterViewer** - Decrypt and display newsletters
```typescript
import { useFHEDecrypt } from '@fhevm-sdk/react';
import { decryptContent } from '@fhevm-sdk';

// Handles: Permission check → FHE decrypt → IPFS fetch → AES decrypt → Display
```

**CreatorProfile** - Creator info and newsletter list
**SubscribeCheckout** - Subscription payment flow
**SubscriptionManagement** - Manage active subscriptions

## State Management

### State Layers

```
┌─────────────────────────────────────────────────┐
│  1. Server State (React Query)                  │
│     - Contract data                             │
│     - IPFS content                              │
│     - Creator profiles                          │
└─────────────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────┐
│  2. Blockchain State (Wagmi)                    │
│     - Wallet connection                         │
│     - Network status                            │
│     - Transaction state                         │
└─────────────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────┐
│  3. Local State (Zustand)                       │
│     - UI preferences                            │
│     - Draft content                             │
│     - Cached decryptions                        │
└─────────────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────┐
│  4. Component State (useState/useReducer)       │
│     - Form inputs                               │
│     - UI interactions                           │
│     - Loading states                            │
└─────────────────────────────────────────────────┘
```

### React Query (Server State)

```typescript
// hooks/useCreatorProfile.ts
import { useReadContract } from "wagmi";
import { useDeployedContractInfo } from "./helper";

export function useCreatorProfile(address: string) {
  const { data: contractInfo } = useDeployedContractInfo("Cryptletter");

  return useReadContract({
    address: contractInfo?.address,
    abi: contractInfo?.abi,
    functionName: "getCreator",
    args: [address],
    query: {
      enabled: !!address && !!contractInfo,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
    },
  });
}
```

### Zustand (Application State)

```typescript
// stores/useDraftStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DraftStore {
  drafts: Record<string, NewsletterDraft>;
  saveDraft: (key: string, draft: NewsletterDraft) => void;
  getDraft: (key: string) => NewsletterDraft | null;
  deleteDraft: (key: string) => void;
}

export const useDraftStore = create<DraftStore>()(
  persist(
    (set, get) => ({
      drafts: {},
      saveDraft: (key, draft) =>
        set(state => ({
          drafts: { ...state.drafts, [key]: draft },
        })),
      getDraft: key => get().drafts[key] || null,
      deleteDraft: key =>
        set(state => {
          const { [key]: _, ...rest } = state.drafts;
          return { drafts: rest };
        }),
    }),
    { name: "cryptletter-drafts" },
  ),
);
```

## Data Flow

### Newsletter Publishing

1. **Encrypt Content** - Generate AES-256 key, encrypt content with AES-GCM
2. **Upload to IPFS** - Upload encrypted content, get CID
3. **Encrypt AES Key** - Encrypt AES key with FHE (`useFHEEncryption`)
4. **Publish to Blockchain** - Call `publishNewsletter(cid, encryptedKey, proof, ...)`
5. **Confirm** - Wait for tx confirmation, redirect to post page

### Newsletter Reading

1. **Check Access** - Verify user subscription via `canAccessNewsletter()`
2. **Grant Permission** - Call `grantDecryptionPermission()` (FHE ACL)
3. **Decrypt FHE Key** - Use `useFHEDecrypt()` to get plaintext AES key
4. **Fetch from IPFS** - Download encrypted content using CID
5. **Decrypt Content** - Decrypt with AES key using `decryptContent()`
6. **Render** - Sanitize HTML and display in viewer

## FHEVM & IPFS Integration

### FHEVM Setup

```typescript
// app/layout.tsx or DappWrapperWithProviders.tsx
import { FhevmProvider } from '@fhevm-sdk/react';

<FhevmProvider>
  <App />
</FhevmProvider>
```

### FHEVM Hooks

```typescript
import { useFHEEncryption, useFHEDecrypt } from '@fhevm-sdk/react';

// Encrypt data
const { encryptData } = useFHEEncryption();
const encrypted = await encryptData(value, 'euint256');

// Decrypt data
const { decrypt } = useFHEDecrypt();
const plaintext = await decrypt(handle, contractAddress);
```

## IPFS Integration

IPFS utilities are provided by the `@fhevm-sdk` package:

```typescript
// Import from @fhevm-sdk
import { createIPFSClient } from "@fhevm-sdk";

// Create IPFS client with Pinata credentials
const ipfsClient = createIPFSClient({
  pinataJWT: process.env.NEXT_PUBLIC_PINATA_JWT,
  pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY,
});

// Upload to IPFS
const cid = await ipfsClient.upload(content);

// Fetch from IPFS
const data = await ipfsClient.fetch(cid);
```

### Encryption/Decryption Utilities

```typescript
// Import from @fhevm-sdk
import { encryptContent, decryptContent, serializeBundle, deserializeBundle } from "@fhevm-sdk";

// Encrypt content with AES
const { encryptedData, encryptedKey } = await encryptContent(content, aesKey);

// Decrypt content
const plaintext = await decryptContent(encryptedData, aesKey);
```

## Security

### Best Practices

1. **XSS Prevention** - Always sanitize HTML with DOMPurify
2. **Input Validation** - Use Zod schemas for form validation
3. **Access Control** - Verify permissions on-chain via `canAccessNewsletter()`
4. **Rate Limiting** - Implement debouncing for user inputs
5. **Error Boundaries** - Catch errors with Next.js error.tsx

---

**See also:**
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [UTILS_INTEGRATION.md](./UTILS_INTEGRATION.md) - SDK utilities
- [README.md](../README.md) - Getting started
