# Cryptletter

[![Build & Tests](https://github.com/starfrich/cryptletter/actions/workflows/test-coverage.yml/badge.svg)](https://github.com/starfrich/cryptletter/actions/workflows/test-coverage.yml)
[![Coverage Status](https://codecov.io/gh/starfrich/cryptletter/branch/main/graph/badge.svg)](https://codecov.io/gh/starfrich/cryptletter)


Substack, rebuilt with FHE. Every newsletter encrypted, every access verified on-chain.

> An idea by [Robapuros](https://x.com/robapuros), realized by Starfish.

## Live Demo

Try Cryptletter on **Sepolia testnet**:

- **Live App**: [https://cryptletter.starfrich.me](https://cryptletter.starfrich.me)

> **Requirements:**
> - MetaMask or compatible Web3 wallet
> - Sepolia testnet ETH ([Get from faucet](https://sepoliafaucet.com/))
> - Connect wallet to Sepolia network (Chain ID: 11155111)

---

## How it works?

Cryptletter uses Fully Homomorphic Encryption (FHE) to make newsletters truly private:

- **Newsletter content** is encrypted with AES and stored on IPFS
- **AES encryption keys** are encrypted with FHE (`euint256`) and stored on-chain
- **Only paid subscribers** can decrypt the FHE keys and access content
- **The platform itself cannot read** your newsletters—even IPFS nodes see only encrypted data

This is "Substack, rebuilt with FHE. Every newsletter encrypted, every access verified on-chain. "

## Features

### Core Privacy Features
- **FHEVM Encryption**: Newsletter content encrypted with fully homomorphic encryption
- **IPFS Storage**: Decentralized content storage with encrypted data
- **Access Control**: On-chain subscription management with FHE-encrypted keys
- **True Privacy**: Content unreadable by platform, nodes, or anyone except subscribers

### Platform Features
- **Creator Dashboard**: Rich text editor with Tiptap for newsletter creation
- **Subscription Management**: Monthly subscription model with on-chain payments
- **Encrypted Feed**: Subscribers can decrypt and read purchased newsletters
- **Creator Profiles**: Custom profiles with bio, pricing, and subscriber counts
- **Decryption Interface**: Seamless content decryption for valid subscribers

### Technical Stack
- **Next.js 15**: Modern React framework with App Router
- **Tailwind CSS v4 + DaisyUI**: Beautiful, responsive UI components
- **RainbowKit + Wagmi**: Seamless wallet connection and management
- **Multi-Network**: Supports Sepolia testnet and localhost development
- **Monorepo**: Organized packages for SDK, contracts, and frontend
- **Type-Safe**: Auto-generated contract ABIs via `pnpm generate`
- **React Hook Form + Zod**: Form validation and management
- **React Hot Toast**: User-friendly notifications

## Prerequisites

Before you begin, ensure you have:

- **Node.js** (v20 or higher)
- **pnpm** package manager
- **MetaMask** browser extension
- **Git** for cloning the repository

## Project Structure

This project uses a monorepo structure with three main packages:

```
cryptletter/
├── packages/
│   ├── fhevm-sdk/                      # Core universal FHEVM SDK
│   │   ├── docs/                       # Internal SDK documentation
│   │   ├── src/                        # SDK source code
│   │   │   ├── core/                   # Core FHE logic (init, encryption, decryption)
│   │   │   ├── internal/               # Internal helpers not exposed publicly
│   │   │   ├── react/                  # React hooks & adapters
│   │   │   ├── storage/                # Encrypted storage utilities (IndexedDB)
│   │   │   ├── types/                  # TypeScript definitions
│   │   │   └── utils/                  # General-purpose utilities
│   │   ├── test/                       # Unit & integration tests (Vitest)
│   │   └── package.json                # SDK dependencies (idb, pinata-web3)
│   ├── hardhat/                        # Hardhat environment for contract dev & testing
│   │   ├── contracts/
│   │   │   └── Cryptletter.sol         # Main encrypted newsletter contract
│   │   ├── deploy/                     # Deployment scripts
│   │   └── test/                       # Solidity contract tests
│   └── nextjs/                         # Next.js 15 application (Cryptletter dApp)
│       ├── app/                        # Next.js App Router pages
│       │   ├── creator/                # Creator profile & management
│       │   ├── dashboard/              # Newsletter creation & editing
│       │   ├── subscribe/              # Subscription management
│       │   └── subscriptions/          # User's subscription feed
│       ├── components/                 # Reusable React components
│       ├── hooks/                      # Custom React hooks
│       ├── contracts/                  # Auto-generated contract ABIs & types
│       └── scaffold.config.ts          # Network & environment configuration
├── scripts/                            # Global build & deploy utilities
│   └── generateTsAbis.ts               # Generates TS typings from Solidity ABIs
├── README.md                           # Project documentation (this file)
├── package.json                        # Root dependency manager
└── pnpm-workspace.yaml                 # Workspace definition for monorepo
```

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/starfrich/cryptletter
cd cryptletter

# Install dependencies
pnpm install
```

### 2. Configure Environment

Setup Hardhat variables (required for both localhost and Sepolia):

```bash
cd packages/hardhat

# Set your wallet mnemonic
npx hardhat vars set MNEMONIC
# Example: "test test test test test test test test test test test junk"

# Set Infura API key (required for Sepolia, optional for localhost)
npx hardhat vars set INFURA_API_KEY
# Example: "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"
```

### 3. Choose Your Network

<details>
<summary><b>Localhost (Recommended for Testing)</b></summary>

```bash
# Terminal 1: Start local Hardhat node
pnpm chain
# RPC URL: http://127.0.0.1:8545 | Chain ID: 31337

# Terminal 2: Deploy contracts
pnpm deploy:localhost

# Terminal 3: Start frontend
pnpm start
```

</details>

<details>
<summary><b>Sepolia Testnet</b></summary>

```bash
# Deploy to Sepolia
pnpm deploy:sepolia

# Start frontend
pnpm start
```

**Production Setup:**
1. Set `NEXT_PUBLIC_ALCHEMY_API_KEY` in `packages/nextjs/scaffold.config.ts`
2. Configure Pinata API credentials for IPFS uploads:
   - Set `NEXT_PUBLIC_PINATA_JWT` in your environment
   - Set `NEXT_PUBLIC_GATEWAY_URL` for IPFS gateway
3. Verify contract addresses in `packages/nextjs/contracts/deployedContracts.ts`
4. Optional: Set `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` for WalletConnect support

</details>

> **Auto-Detection**: The app automatically detects your network and uses the correct contracts!

### 4. Connect MetaMask

1. Open [http://localhost:3000](http://localhost:3000)
2. Click "Connect Wallet" and select MetaMask
3. **For localhost**: Add Hardhat network to MetaMask:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

## Architecture

Cryptletter uses a hybrid architecture combining blockchain and decentralized storage:

### 3-Layer System

1. **Smart Contracts (Solidity + FHEVM)**
   - `Cryptletter.sol`: Main contract for subscriptions, posts, and encrypted key management
   - Uses FHE (`euint256`) for encrypting AES keys on-chain
   - Manages creator profiles, subscriptions, and access control

2. **FHEVM SDK (`@fhevm-sdk`)**
   - Core encryption/decryption logic
   - React hooks: `useFhevm`, `useFHEEncryption`, `useFHEDecrypt`
   - Storage utilities: IndexedDB for signature caching
   - Framework adapters: React

3. **Next.js Frontend**
   - Creator dashboard for publishing encrypted newsletters
   - Subscription interface for readers
   - IPFS integration via Pinata for content storage
   - Real-time decryption with FHEVM relayer

### Data Flow

1. **Publishing**: Creator writes → Content encrypted with AES → Uploaded to IPFS → AES key encrypted with FHE → Stored on-chain
2. **Subscribing**: Reader pays → Subscription recorded on-chain → Can request encrypted keys
3. **Reading**: Reader fetches IPFS content → Decrypts FHE key → Decrypts content locally

### Smart Contract Features (`Cryptletter.sol`)

**Creator Functions:**
- `registerCreator()` - Register as a newsletter creator with profile
- `updateCreator()` - Update profile and monthly subscription price
- `publishNewsletter()` - Publish encrypted content with FHE-encrypted AES key
- `updateNewsletter()` - Update existing newsletter metadata
- `deleteNewsletter()` - Soft-delete a newsletter post

**Subscriber Functions:**
- `subscribe()` - Subscribe to a creator (monthly, payable)
- `renewSubscription()` - Extend subscription period
- `cancelSubscription()` - Cancel active subscription
- `requestDecryption()` - Request FHE key decryption for a post

**View Functions:**
- `getCreator()` - Get creator profile information
- `getNewsletter()` - Get newsletter post metadata
- `getSubscription()` - Check subscription status
- `hasAccess()` - Verify if subscriber can access content
- `getCreatorNewsletters()` - List all newsletters by a creator

## Key Components & Concepts

### Contract Synchronization

After deploying contracts, run `pnpm generate` to auto-generate type-safe ABIs for Next.js. This keeps your frontend and contracts perfectly in sync!

### Available Scripts

**Development & Building:**
```bash
pnpm start                  # Start Next.js development server
pnpm next:build             # Build Next.js production bundle
pnpm sdk:build              # Build FHEVM SDK
pnpm sdk:watch              # Watch mode for SDK development
pnpm sdk:test               # Run SDK tests with Vitest
pnpm sdk:test:watch         # Watch mode for SDK tests
```

**Blockchain Operations:**
```bash
pnpm chain                  # Start local Hardhat node
pnpm compile                # Compile smart contracts
pnpm deploy:localhost       # Deploy to localhost & generate ABIs
pnpm deploy:sepolia         # Deploy to Sepolia & generate ABIs
pnpm generate               # Generate TypeScript ABIs from contracts
pnpm hardhat:test           # Run Hardhat contract tests
pnpm verify:sepolia         # Verify contracts on Sepolia
```

**Code Quality:**
```bash
pnpm format                 # Format code (Next.js + Hardhat)
pnpm lint                   # Lint code (Next.js + Hardhat)
pnpm test                   # Run all tests
```

### Storage Options

The SDK uses **IndexedDB** by default to persist FHEVM decryption signatures, preventing users from needing to re-sign after page refresh. The system automatically falls back to localStorage or in-memory storage if IndexedDB is unavailable.

```tsx
// Default: IndexedDB (persistent, recommended)
import { useIndexedDBStorage } from "~/hooks/helper/useIndexedDBStorage";

const { storage } = useIndexedDBStorage({
  dbName: "cryptletter-fhevm",
  storeName: "signatures"
});

// Alternative: In-memory (non-persistent, faster for testing)
import { useInMemoryStorage } from "@fhevm-sdk";
const { storage } = useInMemoryStorage();
```

**Storage Benefits:**
- ✅ Persists across page refreshes
- ✅ No repeated wallet signature requests
- ✅ Better UX for decryption operations
- ✅ Automatic cleanup on logout

## Troubleshooting

### MetaMask + Hardhat Common Issues

**Nonce Mismatch**: After restarting Hardhat, clear MetaMask activity:
- Settings → Advanced → "Clear Activity Tab"

**Cached Data**: Restart your browser completely (not just refresh) to clear MetaMask's cache.

> See [MetaMask dev guide](https://docs.metamask.io/wallet/how-to/run-devnet/) for details.

## Additional Resources

### Official Documentation
- [FHEVM Documentation](https://docs.zama.ai/protocol/solidity-guides/) - Complete FHEVM guide
- [FHEVM Hardhat Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat) - Hardhat integration
- [Relayer SDK Documentation](https://docs.zama.ai/protocol/relayer-sdk-guides/) - SDK reference
- [Environment Setup](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional) - MNEMONIC & API keys

### Development Tools
- [MetaMask + Hardhat Setup](https://docs.metamask.io/wallet/how-to/run-devnet/) - Local development
- [Next.js Documentation](https://nextjs.org/docs) - Next.js 15 with App Router
- [TipTap Documentation](https://tiptap.dev/) - Rich text editor
- [Pinata IPFS](https://docs.pinata.cloud/) - IPFS API documentation

### Community & Support
- [FHEVM Discord](https://discord.com/invite/zama) - Community support
- [GitHub Repository](https://github.com/starfrich/cryptletter) - Source code & issues

## License

This project is licensed under the **BSD-3-Clause-Clear License**. See the [LICENSE](LICENSE) file for details.