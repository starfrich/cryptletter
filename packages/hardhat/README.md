# Cryptletter - Smart Contracts

The Hardhat-based smart contract layer for Cryptletter, an encrypted newsletter platform built with FHEVM (Fully
Homomorphic Encryption Virtual Machine) by Zama.

## Overview

This package contains the Solidity smart contracts that power Cryptletter's privacy-preserving newsletter platform. The
contracts use FHEVM to enable:

- **Encrypted Content Distribution**: AES encryption keys are stored on-chain as FHE-encrypted values
- **Decentralized Access Control**: Subscription-based access with on-chain verification
- **Privacy-First Architecture**: Content previews are public, full content is encrypted
- **Creator Monetization**: Direct payments to creators with automatic subscription management

## Quick Start

For detailed FHEVM instructions see:
[FHEVM Hardhat Quick Start Tutorial](https://docs.zama.ai/protocol/solidity-guides/getting-started/quick-start-tutorial)

### Prerequisites

- **Node.js**: Version 20 or higher
- **pnpm**: Package manager (v9+)
- **Hardhat**: Installed via dependencies

### Installation

From the **root directory** of the monorepo:

```bash
# Install all dependencies (including hardhat package)
pnpm install

# SDK will build automatically via preinstall hook
# This ensures contracts are compiled before SDK references them
```

### Environment Setup

Set up required environment variables for network access:

```bash
# Required for deployment
npx hardhat vars set MNEMONIC

# For Sepolia testnet (optional: defaults to public RPC)
npx hardhat vars set INFURA_API_KEY

# For contract verification on Etherscan (optional)
npx hardhat vars set ETHERSCAN_API_KEY
```

> **Note**: If `INFURA_API_KEY` is not set, the deployment will automatically use public Sepolia RPC endpoints.

### Development Workflow

#### 1. Compile Contracts

```bash
# From root directory
pnpm compile

# Or directly in hardhat package
cd packages/hardhat
pnpm compile
```

#### 2. Run Tests

```bash
# From root directory
pnpm test

# Or with coverage
pnpm hardhat:coverage

# Run tests directly in hardhat package
cd packages/hardhat
pnpm test
```

#### 3. Deploy Locally

```bash
# Terminal 1: Start local FHEVM node
pnpm chain

# Terminal 2: Deploy and generate ABIs
pnpm deploy:localhost
```

This command will:

- Deploy the Cryptletter contract to localhost
- Generate TypeScript ABIs via `generateTsAbis.ts`
- Update frontend with latest contract addresses

#### 4. Deploy to Sepolia

```bash
# Deploy to Sepolia testnet
pnpm deploy:sepolia

# Verify contract on Etherscan (optional)
pnpm verify:sepolia
```

#### 5. Post-Deployment

After deployment, sync ABIs with the frontend:

```bash
# Regenerate TypeScript ABIs (runs automatically with deploy)
pnpm generate
```

## 📁 Project Structure

```
packages/hardhat/
├── contracts/
│   └── Cryptletter.sol          # Main contract with FHE encryption
├── deploy/
│   └── 01_deploy_cryptletter.ts # Automated deployment script
├── test/
│   └── Cryptletter.ts           # Comprehensive test suite (822 lines)
├── tasks/
│   └── accounts.ts              # Hardhat task utilities
├── types/                        # Generated TypeChain types
├── hardhat.config.ts            # Network & plugin configuration
└── package.json                 # Scripts and dependencies
```

## 📜 Available Scripts

### From Root Directory

| Script                  | Description                     |
| ----------------------- | ------------------------------- |
| `pnpm compile`          | Compile contracts               |
| `pnpm test`             | Run test suite                  |
| `pnpm chain`            | Start local FHEVM node          |
| `pnpm deploy:localhost` | Deploy to local + generate ABIs |
| `pnpm deploy:sepolia`   | Deploy to Sepolia testnet       |
| `pnpm verify:sepolia`   | Verify contract on Etherscan    |
| `pnpm generate`         | Generate TypeScript ABIs        |
| `pnpm hardhat:clean`    | Clean build artifacts           |

### From Hardhat Package

| Script              | Description                        |
| ------------------- | ---------------------------------- |
| `pnpm compile`      | Compile contracts                  |
| `pnpm test`         | Run all tests                      |
| `pnpm test:sepolia` | Run tests on Sepolia network       |
| `pnpm coverage`     | Generate coverage report           |
| `pnpm lint`         | Run Solidity + TypeScript linting  |
| `pnpm clean`        | Clean artifacts & regenerate types |
| `pnpm chain`        | Start local Hardhat node           |

## 📄 Cryptletter Smart Contract

### Contract Architecture

The `Cryptletter.sol` contract implements a hybrid architecture combining:

1. **On-chain Storage**: Subscription state, creator profiles, access control
2. **IPFS Storage**: Encrypted newsletter content (referenced via CID)
3. **FHE Encryption**: AES-256 keys encrypted with FHEVM for selective decryption

### Key Features

#### 1. Creator Management

```solidity
function registerCreator(string calldata name, string calldata bio, uint256 monthlyPrice) external
function updateProfile(string calldata name, string calldata bio) external
function updateMonthlyPrice(uint256 newPrice) external
```

#### 2. Newsletter Publishing

```solidity
function publishNewsletter(
    string calldata contentCID,
    externalEuint256 inputEncryptedKey,
    bytes calldata inputProof,
    string calldata title,
    string calldata preview,
    bool isPublic
) external returns (uint256 postId)
```

#### 3. Subscription System

```solidity
function subscribe(address creator) external payable
function renewSubscription(address creator) external payable
function cancelSubscription(address creator) external
```

#### 4. Access Control & Decryption

```solidity
function canAccessNewsletter(uint256 postId, address user) public view returns (bool)
function grantDecryptionPermission(uint256 postId) external
function getDecryptionKey(uint256 postId) external view returns (euint256)
```

### Data Structures

```solidity
struct Creator {
  string name;
  string bio;
  uint256 monthlyPrice; // Price in wei
  uint256 subscriberCount;
  bool isActive;
}

struct NewsletterPost {
  string contentCID; // IPFS CID
  euint256 encryptedKey; // FHE-encrypted AES key
  string title;
  string preview; // Public preview text
  uint256 publishedAt;
  bool isPublic; // Free newsletters
  address creator;
}

struct Subscription {
  uint256 expiresAt; // Unix timestamp
  uint256 subscribedAt;
  bool isActive; // Can be cancelled but still valid until expiresAt
}
```

### Security Considerations

1. **FHE Permission System**:
   - Keys are encrypted using FHEVM's `euint256` type
   - Access granted via `FHE.allow()` based on subscription status
   - Permissions must be explicitly granted before decryption

2. **Payment Flow**:
   - Direct transfers to creators (no escrow)
   - No refunds on cancellation (subscription valid until expiry)
   - Minimum payment validation

3. **Access Control**:
   - Creators always access their own content
   - Subscribers access content if `expiresAt > block.timestamp`
   - Public posts bypass all access control

### Testing

The test suite (`test/Cryptletter.ts`) includes:

- ✅ Creator registration & profile management
- ✅ Newsletter publishing with FHE encryption
- ✅ Subscription lifecycle (subscribe, renew, cancel)
- ✅ Access control & permission granting
- ✅ Time-based expiry handling
- ✅ Payment and balance management
- ✅ Edge cases & error handling
- ✅ FHE encryption flow verification

**Coverage**: 100% of contract functions tested with 822 test assertions.

Run tests with:

```bash
pnpm test                # Mock mode (local)
pnpm test:sepolia        # Sepolia testnet (requires deployment)
pnpm coverage            # Generate coverage report
```

## 🔌 Contract Interaction Examples

### Using Hardhat Console

```bash
# Start Hardhat console on local network
pnpm hardhat console --network localhost

# Or on Sepolia
pnpm hardhat console --network sepolia
```

```javascript
// Get contract instance
const Cryptletter = await ethers.getContractFactory("Cryptletter");
const contract = await Cryptletter.attach("CONTRACT_ADDRESS");

// Register as creator
await contract.registerCreator("My Newsletter", "Exclusive content about crypto", ethers.parseEther("0.01"));

// Get creator info
const creator = await contract.getCreator(myAddress);
console.log(creator);

// Subscribe to a creator
await contract.subscribe(creatorAddress, {
  value: ethers.parseEther("0.01"),
});

// Check access
const hasAccess = await contract.canAccessNewsletter(postId, myAddress);
```

### Integration with Frontend SDK

The Cryptletter SDK (`packages/fhevm-sdk`) provides React hooks that wrap these contract calls:

```typescript
import { useFhevm, useFHEEncryption, useFHEDecrypt } from "@fhevm-sdk/react";

// In your React component
const { registerCreator, publishNewsletter } = useCryptletterContract();
const { encryptData } = useFHEEncryption();
const { decryptData } = useFHEDecrypt();
```

See [SDK documentation](../fhevm-sdk/README.md) for more details.

## 🌐 Network Configuration

### Supported Networks

| Network   | Chain ID | RPC URL                                       | Purpose            |
| --------- | -------- | --------------------------------------------- | ------------------ |
| Localhost | 31337    | `http://localhost:8545`                       | Local FHEVM node   |
| Sepolia   | 11155111 | `https://ethereum-sepolia-rpc.publicnode.com` | Testnet deployment |

### Network-Specific Behavior

**Hardhat Network (Default)**:

- FHEVM mock mode enabled
- Fast block times
- Unlimited gas
- Perfect for testing

**Localhost (FHEVM Node)**:

- Full FHEVM capabilities
- Requires running `pnpm chain` first
- Tests real encryption/decryption flows
- Recommended for integration testing

**Sepolia Testnet**:

- Real FHEVM deployment on public testnet
- Requires Sepolia ETH (use faucets)
- Contract verification on Etherscan
- Production-like environment

### Getting Sepolia ETH

```bash
# Use these faucets to get test ETH:
# - https://sepoliafaucet.com/
# - https://www.alchemy.com/faucets/ethereum-sepolia
# - https://faucet.quicknode.com/ethereum/sepolia
```

## 🚀 Deployment Notes

### Local Deployment Process

1. **Start FHEVM node**:

   ```bash
   pnpm chain
   ```

2. **Deploy contract** (in another terminal):

   ```bash
   pnpm deploy:localhost
   ```

3. **Verify deployment**:
   - Check console for contract address
   - Contract address saved to `packages/nextjs/contracts/deployedContracts.ts`
   - ABIs generated in `packages/nextjs/contracts/externalContracts.ts`

### Sepolia Deployment Process

1. **Set up environment variables**:

   ```bash
   npx hardhat vars set MNEMONIC "your twelve word mnemonic here"
   npx hardhat vars set INFURA_API_KEY "your-infura-key"
   npx hardhat vars set ETHERSCAN_API_KEY "your-etherscan-key"
   ```

2. **Deploy to Sepolia**:

   ```bash
   pnpm deploy:sepolia
   ```

3. **Verify on Etherscan** (automatic after deployment):
   - Waits 30 seconds for block confirmations
   - Runs `hardhat verify` automatically
   - Manual verification: `pnpm verify:sepolia`

4. **Update frontend**:
   - ABIs automatically synced via `pnpm generate`
   - Update network in `scaffold.config.ts` if needed

### Post-Deployment Checklist

- [ ] Contract address logged in console
- [ ] Contract verified on Etherscan (Sepolia only)
- [ ] ABIs generated in `packages/nextjs/contracts/`
- [ ] Frontend can connect to contract
- [ ] Test basic functions (registerCreator, etc.)

## 📚 Documentation & Resources

### FHEVM Resources

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Hardhat Setup Guide](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup)
- [FHEVM Testing Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat/write_test)
- [FHEVM Hardhat Plugin](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)
- [Relayer SDK Guide](https://docs.zama.ai/protocol/relayer-sdk-guides/)

### Cryptletter Resources

- [Project Overview](../../README.md)
- [SDK Documentation](../fhevm-sdk/README.md)
- [Frontend Setup](../nextjs/README.md)

## 🔧 Troubleshooting

### Common Issues

**Issue**: `Error: Cannot find module '@fhevm/solidity'`

```bash
# Solution: Reinstall dependencies
pnpm install --force
```

**Issue**: `Stack too deep` compilation error

```bash
# Already configured in hardhat.config.ts:
# - viaIR: true (IR-based compilation)
# - optimizer runs: 800
```

**Issue**: Tests fail with "This hardhat test suite cannot run on Sepolia Testnet"

```bash
# Expected behavior: Tests use FHEVM mock mode
# Real network testing requires actual FHEVM Sepolia deployment
```

**Issue**: TypeChain types not generated

```bash
# Solution: Compile contracts first
pnpm compile
# TypeChain runs automatically via postcompile hook
```

## 📄 License

This project is licensed under the **BSD-3-Clause-Clear License**.

## 🆘 Support

- **Zama Discord**: [Join the community](https://discord.gg/zama)
- **FHEVM Docs**: [docs.zama.ai](https://docs.zama.ai)
- **Zama GitHub**: [github.com/zama-ai/fhevm](https://github.com/zama-ai/fhevm)

---

**Part of the Zama Developer Program (October 2025)** Building privacy-preserving applications with Fully Homomorphic
Encryption.
