# Universal FHEVM SDK

[![codecov](https://codecov.io/gh/starfrich/fhevm-react-template/branch/main/graph/badge.svg)](https://codecov.io/gh/starfrich/fhevm-react-template)
[![CI](https://github.com/starfrich/fhevm-react-template/actions/workflows/test-coverage.yml/badge.svg)](https://github.com/starfrich/fhevm-react-template/actions/workflows/test-coverage.yml)


A framework-agnostic frontend toolkit that helps developers run confidential dApps with ease.

## 🌐 Live Demos

Try the SDK in action on **Sepolia testnet**:

- [Project Index](https://sdk.starfrich.me)
- [Website Documentation](https://starfrich.me/projects/zama-sdk/)

> **📝 Note:** Live demos require:
> - MetaMask or compatible Web3 wallet
> - Sepolia testnet ETH ([Get from faucet](https://sepoliafaucet.com/))
> - Connect wallet to Sepolia network (Chain ID: 11155111)

> **💻 Backend Examples:** Node.js backend and automation examples are designed for local/server deployment. See [Examples Guide](#-examples) for setup instructions.

---

## 🚀 What is FHEVM?

FHEVM (Fully Homomorphic Encryption Virtual Machine) enables computation on encrypted data directly on Ethereum. This template demonstrates how to build dApps that can perform computations while keeping data private.

## ✨ Features

- **🔐 FHEVM Integration**: Built-in support for fully homomorphic encryption
- **⚛️ React + Next.js**: Modern, performant frontend framework
- **🎨 Tailwind CSS**: Utility-first styling for rapid UI development
- **🔗 RainbowKit**: Seamless wallet connection and management
- **🌐 Multi-Network Support**: Auto-detects localhost and Sepolia networks
- **📦 Monorepo Structure**: Organized packages for SDK, contracts, and frontend
- **🔄 Auto-Generated Contracts**: Type-safe contract ABIs via `pnpm generate`

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v20 or higher)
- **pnpm** package manager
- **MetaMask** browser extension
- **Git** for cloning the repository

## 📁 Project Structure

This template uses a monorepo structure with three main packages:

```
fhevm-universal-sdk/
├── packages/
│   ├── fhevm-sdk/                      # Core universal FHEVM SDK
│   │   ├── docs/                       # Internal SDK documentation (debug, migration, validation, etc.)
│   │   ├── src/                        # SDK source code
│   │   │   ├── core/                   # Core FHE logic (init, encryption, decryption)
│   │   │   ├── internal/               # Internal helpers not exposed publicly
│   │   │   ├── react/                  # React hooks & adapters
│   │   │   ├── storage/                # Encrypted local/session storage utilities
│   │   │   ├── types/                  # TypeScript definitions
│   │   │   ├── utils/                  # General-purpose utilities
│   │   │   ├── vanilla/                # Adapter for Vanilla JS
│   │   │   └── vue/                    # Adapter for Vue
│   │   └── test/                       # Unit & integration tests for all modules
│   ├── hardhat/                        # Hardhat environment for contract dev & testing
│   └── nextjs/                         # Next.js (React) showcase application
├── examples/                           # Cross-framework integration examples
│   ├── vanilla-js/                     # Plain browser example using SDK
│   ├── vue-app/                        # Vue 3 + Vite example
│   ├── nodejs-backend/                 # Express backend using SDK
│   └── nodejs-automation/              # Node.js automation & job scheduling
├── scripts/                            # Global build & deploy utilities
│   └── generateTsAbis.ts               # Generates TS typings from Solidity ABIs
├── README.md                           # Project documentation
├── package.json                        # Root dependency manager
└── pnpm-workspace.yaml                 # Workspace definition for monorepo
```

## 🛠️ Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd fhevm-react-template

# Initialize submodules (includes fhevm-hardhat-template)
git submodule update --init --recursive

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
<summary><b>🧩 Localhost (Recommended for Testing)</b></summary>

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
<summary><b>🌐 Sepolia Testnet</b></summary>

```bash
# Deploy to Sepolia
pnpm deploy:sepolia

# Start frontend
pnpm start
```

**Production Notes:**
- Set `NEXT_PUBLIC_ALCHEMY_API_KEY` in `packages/nextjs/scaffold.config.ts`
- Verify contract addresses in `packages/nextjs/contracts/deployedContracts.ts`
- Optional: Set `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` for WalletConnect

</details>

> **💡 Auto-Detection**: The app automatically detects your network and uses the correct contracts!

### 4. Connect MetaMask

1. Open [http://localhost:3000](http://localhost:3000)
2. Click "Connect Wallet" and select MetaMask
3. **For localhost**: Add Hardhat network to MetaMask:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

## 🎓 Examples

This template includes comprehensive examples showing how to use the FHEVM SDK across different frameworks and environments:

### Browser Examples
- **Vanilla JS** (`examples/vanilla-js/`) - Pure JavaScript with Vite
- **Vue 3** (`examples/vue-app/`) - Vue 3 with Composition API

### Backend Examples
- **Express.js** (`examples/nodejs-backend/`) - REST API backend with Node.js
- **Automation** (`examples/nodejs-automation/`) - Scheduled tasks and batch processing

**All examples use the same `@fhevm-sdk/core`** - what differs is the framework context.

**See [Examples Guide](/examples/README.md) for:**
- Detailed overview of each example
- SDK usage patterns by framework
- Comparison table
- Configuration options

**Quick start:**

```bash
# Browser - Vanilla JS
pnpm vanilla:dev

# Browser - Vue 3
pnpm vue:dev

# Backend - Express API
cp examples/nodejs-backend/.env.example examples/nodejs-backend/.env && pnpm backend:dev

# Automation - Scheduled tasks
cp examples/nodejs-automation/.env.example examples/nodejs-automation/.env && pnpm automation:start help
pnpm automation:task:batch # Automation - Batch Encrypt
pnpm automation:task:decrypt # Automation - Daily Decrypt
```

## 🔧 Key Components & Concepts

### 🔄 Contract Synchronization

After deploying contracts, run `pnpm generate` to auto-generate type-safe ABIs for Next.js, Vue, and Vanilla JS. This keeps your frontend and contracts perfectly in sync!

### 💾 Storage Options

The SDK uses **IndexedDB** by default to persist FHEVM decryption signatures (no re-signing after page refresh). Automatic fallback to localStorage or in-memory storage if unavailable.

```tsx
// Default: IndexedDB (persistent)
import { useIndexedDBStorage } from "~/hooks/helper/useIndexedDBStorage";
const { storage } = useIndexedDBStorage({ dbName: "fhevm-app", storeName: "signatures" });

// Alternative: In-memory (non-persistent, faster)
import { useInMemoryStorage } from "@fhevm-sdk";
const { storage } = useInMemoryStorage();
```

## 🔧 Troubleshooting

### MetaMask + Hardhat Common Issues

**Nonce Mismatch**: After restarting Hardhat, clear MetaMask activity:
- Settings → Advanced → "Clear Activity Tab"

**Cached Data**: Restart your browser completely (not just refresh) to clear MetaMask's cache.

> 💡 See [MetaMask dev guide](https://docs.metamask.io/wallet/how-to/run-devnet/) for details.

## 📚 Additional Resources

### Official Documentation
- [FHEVM Documentation](https://docs.zama.ai/protocol/solidity-guides/) - Complete FHEVM guide
- [FHEVM Hardhat Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat) - Hardhat integration
- [Relayer SDK Documentation](https://docs.zama.ai/protocol/relayer-sdk-guides/) - SDK reference
- [Environment Setup](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional) - MNEMONIC & API keys

### Alternative Documentation
- [Website Documentation Version](https://starfrich.me/projects/zama-sdk)

### Development Tools
- [MetaMask + Hardhat Setup](https://docs.metamask.io/wallet/how-to/run-devnet/) - Local development
- [React Documentation](https://reactjs.org/) - React framework guide

### Community & Support
- [FHEVM Discord](https://discord.com/invite/zama) - Community support
- [GitHub Issues](https://github.com/zama-ai/fhevm-react-template/issues) - Bug reports & feature requests

## 📄 License

This project is licensed under the **BSD-3-Clause-Clear License**. See the [LICENSE](LICENSE) file for details.
