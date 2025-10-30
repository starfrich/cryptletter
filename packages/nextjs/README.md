# Cryptletter - Frontend Application

The Next.js frontend application for Cryptletter, a privacy-preserving encrypted newsletter platform built with FHEVM.

## Overview

This package contains the user-facing web application that enables creators to publish encrypted newsletters and subscribers to access them with privacy guarantees powered by Fully Homomorphic Encryption (FHE).

### Key Features

- **Creator Dashboard**: Publish and manage encrypted newsletters
- **Rich Text Editor**: TipTap-based WYSIWYG editor with image support
- **Subscriber Portal**: Discover creators and manage subscriptions
- **FHEVM Integration**: Seamless encryption/decryption with @fhevm-sdk
- **IPFS Storage**: Decentralized content storage via Kubo RPC
- **Wallet Integration**: RainbowKit + Wagmi for Web3 connectivity
- **Responsive UI**: DaisyUI + Tailwind CSS for modern design

## Tech Stack

### Core Framework

- **Next.js 15.2** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5.8** - Type safety

### Web3 & Blockchain

- **@fhevm-sdk** - Custom FHEVM SDK (workspace package)
- **@zama-fhe/relayer-sdk** - Zama FHE relayer integration
- **wagmi 2.16** - React hooks for Ethereum
- **@rainbow-me/rainbowkit 2.2** - Wallet connection UI
- **viem 2.34** - Ethereum library
- **ethers 6.13** - Ethereum utilities

### UI & Styling

- **Tailwind CSS 4.1** - Utility-first CSS
- **DaisyUI 5.0** - Tailwind component library
- **@tiptap/react** - Rich text editor
- **@heroicons/react** - Icon library
- **next-themes** - Dark mode support

### Storage & State

- **kubo-rpc-client** - IPFS integration
- **idb** - IndexedDB wrapper for local storage
- **zustand** - State management
- **@tanstack/react-query** - Server state management

### Form & Validation

- **react-hook-form** - Form management
- **zod** - Schema validation
- **@hookform/resolvers** - Form validators

### Other

- **react-markdown** - Markdown rendering
- **react-hot-toast** - Toast notifications
- **date-fns** - Date utilities
- **qrcode.react** - QR code generation

## Quick Start

### Prerequisites

- **Node.js**: Version 20 or higher
- **pnpm**: Package manager (v9+)
- **Wallet**: MetaMask or compatible Web3 wallet

### Installation

From the **root directory**:

```bash
# Install all dependencies
pnpm install

# Start development server
pnpm start
```

The app will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env.local` file in `packages/nextjs/`:

```env
# Network Configuration
NEXT_PUBLIC_CHAIN_ID=11155111  # Sepolia testnet

# IPFS Configuration (optional)
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/
NEXT_PUBLIC_KUBO_RPC_URL=http://127.0.0.1:5001

# Analytics (optional)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id

# Feature Flags
NEXT_PUBLIC_ENABLE_DEBUG=false
```

## Project Structure

```
packages/nextjs/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Homepage (creator discovery)
│   ├── layout.tsx                # Root layout
│   ├── creator/
│   │   └── [address]/            # Creator profile
│   │       ├── page.tsx          # Creator detail page
│   │       └── post/[id]/        # Newsletter post viewer
│   │           └── page.tsx
│   ├── dashboard/                # Creator dashboard
│   │   ├── page.tsx              # Dashboard overview
│   │   └── publish/              # Publish newsletter
│   │       └── page.tsx
│   ├── subscriptions/            # User subscriptions
│   │   └── page.tsx
│   └── subscribe/[address]/      # Subscribe to creator
│       └── page.tsx
├── components/                   # React components
│   ├── cryptletter/              # App-specific components
│   │   ├── CreatorCard.tsx       # Creator display card
│   │   ├── NewsletterEditor.tsx  # Newsletter publish form
│   │   ├── NewsletterPreview.tsx # Newsletter preview card
│   │   ├── NewsletterViewer.tsx  # Full newsletter viewer
│   │   ├── SubscriptionStatus.tsx# Subscription info
│   │   └── TiptapEditor.tsx      # Rich text editor
│   ├── helper/                   # Utility components
│   │   ├── Address.tsx           # Address display
│   │   ├── Balance.tsx           # ETH balance
│   │   ├── BlockieAvatar.tsx     # Identicon avatar
│   │   └── RainbowKitCustomConnectButton/
│   ├── layouts/                  # Layout components
│   │   └── PageContainer.tsx
│   ├── Header.tsx                # App header with navigation
│   ├── ThemeController.tsx       # Theme switcher
│   └── DappWrapperWithProviders.tsx # Web3 providers
├── hooks/                        # Custom React hooks
├── services/                     # Business logic services
├── utils/                        # Utility functions
├── contracts/                    # Generated contract ABIs
│   ├── deployedContracts.ts      # Deployed contract addresses
│   └── externalContracts.ts      # Contract type definitions
├── types/                        # TypeScript types
├── styles/                       # Global styles
├── public/                       # Static assets
└── docs/                         # Documentation
    └── UTILS_INTEGRATION.md      # SDK utils guide
```

## Application Routes

### Public Routes

| Route                          | Description                |
| ------------------------------ | -------------------------- |
| `/`                            | Homepage - Browse creators |
| `/creator/[address]`           | Creator profile page       |
| `/creator/[address]/post/[id]` | View newsletter post       |
| `/subscribe/[address]`         | Subscribe to a creator     |

### Protected Routes (Requires Wallet)

| Route                | Description             |
| -------------------- | ----------------------- |
| `/dashboard`         | Creator dashboard       |
| `/dashboard/publish` | Publish new newsletter  |
| `/subscriptions`     | View your subscriptions |

## Development Workflow

### 1. Start Local Development

```bash
# Terminal 1: Start local blockchain (from root)
pnpm chain

# Terminal 2: Deploy contracts (from root)
pnpm deploy:localhost

# Terminal 3: Start Next.js dev server
pnpm start
```

### 2. Connect Wallet

1. Open `http://localhost:3000`
2. Click "Connect Wallet"
3. Select your wallet (MetaMask recommended)
4. Switch to Localhost network (Chain ID: 31337)

### 3. Register as Creator

1. Navigate to `/dashboard`
2. Fill in creator profile
3. Set monthly subscription price
4. Click "Register as Creator"

### 4. Publish Newsletter

1. Go to `/dashboard/publish`
2. Write content in TipTap editor
3. Add title and preview
4. Choose public/private
5. Publish (encrypted content stored on IPFS)

### 5. Subscribe & Read

1. Browse creators on homepage
2. Click "Subscribe" on a creator
3. Pay subscription fee
4. Access encrypted newsletters
5. Content auto-decrypts with FHE

## Available Scripts

### From Root Directory

| Script       | Description                  |
| ------------ | ---------------------------- |
| `pnpm start` | Start Next.js dev server     |
| `pnpm build` | Build for production         |
| `pnpm serve` | Run production build locally |

### From Next.js Package

| Script             | Description                 |
| ------------------ | --------------------------- |
| `pnpm dev`         | Start development server    |
| `pnpm build`       | Build production bundle     |
| `pnpm start`       | Start production server     |
| `pnpm lint`        | Run ESLint                  |
| `pnpm format`      | Format code with Prettier   |
| `pnpm check-types` | Type check without emitting |

## FHEVM SDK Integration

### Using FHEVM Hooks

```typescript
import { useFHEDecrypt, useFHEEncryption, useFhevm } from "@fhevm-sdk/react";

function MyComponent() {
  // Initialize FHEVM
  const { instance, isReady, error } = useFhevm({
    contractAddress: "0x...",
    userAddress: address,
  });

  // Encrypt data
  const { encryptData, isEncrypting } = useFHEEncryption();

  // Decrypt data
  const { decryptData, isDecrypting } = useFHEDecrypt();

  // Encrypt a value
  const handleEncrypt = async () => {
    const encrypted = await encryptData(42, "euint32");
  };

  // Decrypt a handle
  const handleDecrypt = async () => {
    const decrypted = await decryptData(handle, contractAddress);
  };
}
```

### Contract Interaction

```typescript
import { useScaffoldReadContract, useScaffoldWriteContract } from "@/hooks/scaffold-eth";

function CreatorProfile() {
  // Read creator info
  const { data: creator } = useScaffoldReadContract({
    contractName: "Cryptletter",
    functionName: "getCreator",
    args: [creatorAddress],
  });

  // Subscribe to creator
  const { writeAsync: subscribe } = useScaffoldWriteContract({
    contractName: "Cryptletter",
    functionName: "subscribe",
    args: [creatorAddress],
    value: monthlyPrice,
  });
}
```

## IPFS Integration

### Uploading Content

```typescript
import { uploadToIPFS } from "@/services/ipfs";

async function publishNewsletter(content: string) {
  // Upload encrypted content to IPFS
  const cid = await uploadToIPFS({
    content: encryptedContent,
    metadata: {
      title: "My Newsletter",
      timestamp: Date.now(),
    },
  });

  // Store CID on-chain
  await publishNewsletterTx({
    contentCID: cid,
    encryptedKey: fheEncryptedKey,
    // ...
  });
}
```

### Fetching Content

```typescript
import { fetchFromIPFS } from "@/services/ipfs";

async function readNewsletter(cid: string) {
  const data = await fetchFromIPFS(cid);
  return data.content;
}
```

## Styling & Theming

### Theme Configuration

Cryptletter supports light and dark themes via `next-themes`:

```typescript
import { useTheme } from 'next-themes';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </button>
  );
}
```

### DaisyUI Themes

Available themes (configured in `tailwind.config.ts`):

- `light` - Default light theme
- `dark` - Default dark theme

### Custom Styling

Use Tailwind classes for component styling:

```tsx
<div className="card bg-base-100 shadow-xl">
  <div className="card-body">
    <h2 className="card-title">Newsletter Title</h2>
    <p className="text-base-content/70">Preview text...</p>
  </div>
</div>
```

## Form Validation

### Using React Hook Form + Zod

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  price: z.number().min(0, 'Price must be positive'),
  content: z.string().min(100, 'Content too short'),
});

function PublishForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data) => {
    // Handle form submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} />
      {errors.title && <span>{errors.title.message}</span>}
      {/* ... */}
    </form>
  );
}
```

## State Management

### Zustand Store Example

```typescript
// stores/useCreatorStore.ts
import { create } from "zustand";

interface CreatorStore {
  isRegistered: boolean;
  profile: CreatorProfile | null;
  setProfile: (profile: CreatorProfile) => void;
}

export const useCreatorStore = create<CreatorStore>(set => ({
  isRegistered: false,
  profile: null,
  setProfile: profile => set({ profile, isRegistered: true }),
}));
```

## Toast Notifications

```typescript
import toast from "react-hot-toast";

// Success
toast.success("Newsletter published!");

// Error
toast.error("Failed to subscribe");

// Loading
const toastId = toast.loading("Encrypting...");
// Later...
toast.success("Encrypted!", { id: toastId });
```

## Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login
pnpm vercel:login

# Deploy
pnpm vercel

# Production deployment
pnpm vercel --prod
```

### Environment Variables on Vercel

Set these in Vercel Dashboard → Settings → Environment Variables:

- `NEXT_PUBLIC_CHAIN_ID`
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
- `NEXT_PUBLIC_IPFS_GATEWAY`

### Build Configuration

The app is configured for static export:

```javascript
// next.config.js
module.exports = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  eslint: {
    ignoreDuringBuilds: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
};
```

## Documentation

- **[UTILS_INTEGRATION.md](./docs/UTILS_INTEGRATION.md)** - FHEVM SDK utils integration guide
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - App architecture and routing (coming soon)
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Deployment guides (coming soon)

## Troubleshooting

### Common Issues

**Issue**: Wallet connection fails

```bash
# Solution: Clear browser cache and reconnect
# Or try incognito mode
```

**Issue**: FHEVM instance not initializing

```bash
# Check that:
# 1. Wallet is connected
# 2. Contract is deployed
# 3. Network is correct (localhost/Sepolia)
```

**Issue**: IPFS upload fails

```bash
# Solution: Start local IPFS node
ipfs daemon

# Or use public gateway (slower)
# Set NEXT_PUBLIC_IPFS_GATEWAY in .env.local
```

**Issue**: Build errors with TypeScript

```bash
# Type check manually
pnpm check-types

# Ignore during build (not recommended)
NEXT_PUBLIC_IGNORE_BUILD_ERROR=true pnpm build
```

**Issue**: Hydration errors

```bash
# Common causes:
# 1. Using browser-only APIs during SSR
# 2. Mismatched client/server rendering
#
# Solution: Use 'use client' directive and dynamic imports
```

### Debug Mode

Enable debug logging for FHEVM SDK:

```typescript
// app/layout.tsx
import { enableDebugLogging } from "@fhevm-sdk";

if (process.env.NODE_ENV === "development") {
  enableDebugLogging({
    verbose: true,
    metrics: true,
    level: "debug",
  });
}
```

## Performance Optimization

### Code Splitting

```typescript
// Use dynamic imports for heavy components
import dynamic from 'next/dynamic';

const TiptapEditor = dynamic(
  () => import('@/components/cryptletter/TiptapEditor'),
  { ssr: false, loading: () => <div>Loading editor...</div> }
);
```

### Image Optimization

```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Cryptletter"
  width={200}
  height={50}
  priority
/>
```

### Caching Strategies

```typescript
// React Query cache configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});
```

## Contributing

See the main [repository README](../../README.md) for contribution guidelines.

## License

BSD-3-Clause-Clear License

---

**Part of the Zama Developer Program (October 2025)**
Building privacy-preserving applications with Fully Homomorphic Encryption.
