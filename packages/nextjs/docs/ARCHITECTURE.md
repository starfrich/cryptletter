# Cryptletter Frontend Architecture

Complete architectural documentation for the Cryptletter Next.js application.

## Table of Contents

1. [Overview](#overview)
2. [Application Structure](#application-structure)
3. [Routing & Pages](#routing--pages)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [Data Flow](#data-flow)
7. [FHEVM Integration](#fhevm-integration)
8. [IPFS Integration](#ipfs-integration)
9. [Security Considerations](#security-considerations)

## Overview

Cryptletter follows a modern **Next.js App Router** architecture with:

- **Server Components** for static content (creator lists, public previews)
- **Client Components** for interactive features (wallet, encryption, forms)
- **Hybrid Rendering** to optimize performance and UX
- **Type-Safe Contracts** via generated ABIs and TypeChain

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     User Browser                            │
│  ┌────────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │  Next.js App   │  │   Wallet    │  │   FHEVM SDK     │   │
│  │  (React 19)    │◄─┤  (MetaMask) │  │   (@fhevm-sdk)  │   │
│  └────────┬───────┘  └─────────────┘  └────────┬────────┘   │
│           │                                     │           │
└───────────┼─────────────────────────────────────┼───────────┘
            │                                     │
            │ JSON-RPC                            │ FHE Ops
            ▼                                     ▼
┌──────────────────────┐              ┌─────────────────────┐
│  Ethereum Network    │◄─────────────┤  Zama FHE Gateway   │
│  (Localhost/Sepolia) │              │  (Relayer SDK)      │
│                      │              └─────────────────────┘
│  ┌────────────────┐  │
│  │  Cryptletter   │  │              ┌─────────────────────┐
│  │  Smart Contract│◄─┼──────────────┤     IPFS Network    │
│  └────────────────┘  │              │  (Content Storage)  │
└──────────────────────┘              └─────────────────────┘
```

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
├── services/                   # Business logic
│   ├── ipfs.ts                 # IPFS operations
│   ├── encryption.ts           # FHE encryption logic
│   └── contracts.ts            # Contract utilities
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

## Routing & Pages

### Route Structure

| Route                          | Type          | Auth Required | Description                  |
| ------------------------------ | ------------- | ------------- | ---------------------------- |
| `/`                            | Server        | No            | Homepage - creator discovery |
| `/creator/[address]`           | Server/Client | No            | Creator profile              |
| `/creator/[address]/post/[id]` | Client        | Conditional   | Newsletter post viewer       |
| `/subscribe/[address]`         | Client        | Yes           | Subscribe to creator         |
| `/dashboard`                   | Client        | Yes           | Creator dashboard overview   |
| `/dashboard/publish`           | Client        | Yes           | Publish new newsletter       |
| `/subscriptions`               | Client        | Yes           | User's active subscriptions  |

### Page Component Patterns

#### Server Component (Static Content)

```typescript
// app/page.tsx
import { CreatorCard } from '@/components/cryptletter/CreatorCard';

export default async function HomePage() {
  // Can fetch data server-side
  return (
    <div className="container mx-auto">
      <h1>Discover Creators</h1>
      {/* Server-rendered creator list */}
    </div>
  );
}
```

#### Client Component (Interactive)

```typescript
// app/dashboard/publish/page.tsx
'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { NewsletterEditor } from '@/components/cryptletter/NewsletterEditor';

export default function PublishPage() {
  const { address, isConnected } = useAccount();

  if (!isConnected) {
    return <ConnectWalletPrompt />;
  }

  return <NewsletterEditor creatorAddress={address} />;
}
```

#### Dynamic Route with Auth

```typescript
// app/creator/[address]/post/[id]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { NewsletterViewer } from '@/components/cryptletter/NewsletterViewer';

export default function NewsletterPostPage() {
  const params = useParams();
  const { address, id } = params;

  return (
    <NewsletterViewer
      creatorAddress={address as string}
      postId={Number(id)}
    />
  );
}
```

## Component Architecture

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
            ├── CreatorCard
            ├── NewsletterEditor
            │   └── TiptapEditor
            ├── NewsletterPreview
            ├── NewsletterViewer
            └── SubscriptionStatus
```

### Component Categories

#### 1. Layout Components

**Purpose**: Structure and page layout

```typescript
// components/layouts/PageContainer.tsx
export function PageContainer({ children, className }: Props) {
  return (
    <div className={cn('container mx-auto px-4 py-8', className)}>
      {children}
    </div>
  );
}
```

#### 2. Domain Components (Cryptletter-specific)

**Purpose**: Business logic and features

```typescript
// components/cryptletter/NewsletterEditor.tsx
'use client';

import { useFHEEncryption } from '@fhevm-sdk/react';
import { useScaffoldWriteContract } from '@/hooks/scaffold-eth';
import { TiptapEditor } from './TiptapEditor';

export function NewsletterEditor({ creatorAddress }: Props) {
  const { encryptData } = useFHEEncryption();
  const { writeAsync: publishNewsletter } = useScaffoldWriteContract({
    contractName: 'Cryptletter',
    functionName: 'publishNewsletter',
  });

  const handlePublish = async (content: string) => {
    // 1. Encrypt content with AES
    const { encrypted, key } = await encryptAES(content);

    // 2. Upload to IPFS
    const cid = await uploadToIPFS(encrypted);

    // 3. Encrypt AES key with FHE
    const fheKey = await encryptData(key, 'euint256');

    // 4. Publish to blockchain
    await publishNewsletter({
      args: [cid, fheKey.handle, fheKey.proof, title, preview, isPublic],
    });
  };

  return <TiptapEditor onPublish={handlePublish} />;
}
```

#### 3. Helper Components

**Purpose**: Reusable UI utilities

```typescript
// components/helper/Address.tsx
export function Address({ address, format = 'short' }: Props) {
  const formatted = format === 'short'
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;

  return (
    <span className="font-mono text-sm">
      {formatted}
      <CopyButton text={address} />
    </span>
  );
}
```

### Component Communication

#### Props Down, Events Up

```typescript
// Parent passes data and callbacks
<NewsletterEditor
  creatorAddress={address}
  onPublishSuccess={(postId) => {
    toast.success('Published!');
    router.push(`/creator/${address}/post/${postId}`);
  }}
  onPublishError={(error) => {
    toast.error(error.message);
  }}
/>

// Child emits events
const handleSubmit = async () => {
  try {
    const postId = await publish();
    onPublishSuccess(postId);
  } catch (error) {
    onPublishError(error);
  }
};
```

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
import { useScaffoldReadContract } from "./scaffold-eth";

export function useCreatorProfile(address: string) {
  return useScaffoldReadContract({
    contractName: "Cryptletter",
    functionName: "getCreator",
    args: [address],
    query: {
      enabled: !!address,
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

### Newsletter Publishing Flow

```
┌──────────────────────────────────────────────────────────────┐
│  1. User writes content in TiptapEditor                      │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  2. Generate AES-256 key                                     │
│     - Random 256-bit key                                     │
│     - Encrypt content with AES-GCM                           │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  3. Upload to IPFS                                           │
│     - uploadToIPFS(encryptedContent)                         │
│     - Returns CID (e.g., QmXxxx...)                          │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  4. Encrypt AES key with FHE                                 │
│     - useFHEEncryption().encryptData(aesKey, 'euint256')     │
│     - Returns { handle, proof }                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  5. Publish to blockchain                                    │
│     - Cryptletter.publishNewsletter(                         │
│         contentCID,                                          │
│         fheEncryptedKey,                                     │
│         proof,                                               │
│         title,                                               │
│         preview,                                             │
│         isPublic                                             │
│       )                                                      │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  6. Transaction confirmed                                    │
│     - Event: NewsletterPublished(postId, ...)                │
│     - Redirect to /creator/[address]/post/[postId]           │
└──────────────────────────────────────────────────────────────┘
```

### Newsletter Reading Flow

```
┌──────────────────────────────────────────────────────────────┐
│  1. User navigates to /creator/[address]/post/[id]           │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  2. Check access permission                                  │
│     - Cryptletter.canAccessNewsletter(postId, userAddress)   │
│     - If false → Show "Subscribe to read"                    │
└────────────────────────┬─────────────────────────────────────┘
                         │ (has access)
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  3. Grant decryption permission                              │
│     - Cryptletter.grantDecryptionPermission(postId)          │
│     - Contract calls FHE.allow(encryptedKey, userAddress)    │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  4. Get encrypted key handle                                 │
│     - Cryptletter.getDecryptionKey(postId)                   │
│     - Returns euint256 handle                                │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  5. Decrypt FHE key                                          │
│     - useFHEDecrypt().decryptData(handle, contractAddress)   │
│     - Relayer decrypts via Zama gateway                      │
│     - Returns plaintext AES-256 key                          │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  6. Fetch from IPFS                                          │
│     - Newsletter.contentCID → fetchFromIPFS(cid)             │
│     - Returns encrypted content                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  7. Decrypt content with AES                                 │
│     - decryptAES(encryptedContent, aesKey)                   │
│     - Returns plaintext HTML/Markdown                        │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  8. Render content                                           │
│     - react-markdown / DOMPurify sanitization                │
│     - Display in NewsletterViewer                            │
└──────────────────────────────────────────────────────────────┘
```

## FHEVM Integration

### SDK Initialization

```typescript
// components/DappWrapperWithProviders.tsx
import { FhevmProvider } from '@fhevm-sdk/react';

export function DappWrapperWithProviders({ children }: Props) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <FhevmProvider
          config={{
            gatewayUrl: process.env.NEXT_PUBLIC_GATEWAY_URL,
            relayerUrl: process.env.NEXT_PUBLIC_RELAYER_URL,
          }}
        >
          {children}
        </FhevmProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### Using FHEVM Hooks

```typescript
// components/EncryptButton.tsx
import { useFHEEncryption } from '@fhevm-sdk/react';

export function EncryptButton({ value, onEncrypted }: Props) {
  const { encryptData, isEncrypting, error } = useFHEEncryption();

  const handleClick = async () => {
    try {
      const result = await encryptData(value, 'euint256');
      onEncrypted(result);
    } catch (err) {
      toast.error('Encryption failed');
    }
  };

  return (
    <button onClick={handleClick} disabled={isEncrypting}>
      {isEncrypting ? 'Encrypting...' : 'Encrypt'}
    </button>
  );
}
```

## IPFS Integration

### Upload Service

```typescript
// services/ipfs.ts
import { create } from "kubo-rpc-client";

const client = create({
  url: process.env.NEXT_PUBLIC_KUBO_RPC_URL || "http://127.0.0.1:5001",
});

export async function uploadToIPFS(content: string | object): Promise<string> {
  const data = typeof content === "string" ? content : JSON.stringify(content);

  const { cid } = await client.add(data, {
    pin: true,
    cidVersion: 1,
  });

  return cid.toString();
}

export async function fetchFromIPFS(cid: string): Promise<any> {
  const chunks = [];
  for await (const chunk of client.cat(cid)) {
    chunks.push(chunk);
  }

  const data = Buffer.concat(chunks).toString("utf-8");

  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}
```

## Security Considerations

### 1. XSS Prevention

```typescript
// Always sanitize user-generated content
import DOMPurify from 'isomorphic-dompurify';

function NewsletterContent({ html }: Props) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'u', 'a', 'img', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
  });

  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

### 2. Input Validation

```typescript
// Use Zod for runtime validation
import { z } from "zod";

const publishSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(100).max(100000),
  price: z.number().min(0),
  preview: z.string().max(500),
});

// Validate before submission
const validated = publishSchema.parse(formData);
```

### 3. Access Control

```typescript
// Always verify on-chain access
const hasAccess = await readContract({
  address: contractAddress,
  abi: CryptletterABI,
  functionName: "canAccessNewsletter",
  args: [postId, userAddress],
});

if (!hasAccess) {
  throw new Error("Access denied");
}
```

### 4. Rate Limiting

```typescript
// Implement client-side debouncing
import { useDebouncedCallback } from "usehooks-ts";

const debouncedSearch = useDebouncedCallback((query: string) => performSearch(query), 500);
```

### 5. Error Boundaries

```typescript
// app/error.tsx
'use client';

export default function Error({ error, reset }: Props) {
  return (
    <div className="error-container">
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

---

**For more details:**

- [UTILS_INTEGRATION.md](./UTILS_INTEGRATION.md) - SDK utils guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment instructions
- [Main README](../README.md) - Getting started guide
