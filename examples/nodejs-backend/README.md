# FHEVM Backend API Example

A minimal Express.js backend demonstrating **FHEVM SDK integration in Node.js**. This example shows how to use `@fhevm-sdk/core` to build a privacy-preserving backend service.

## 🎯 What This Demonstrates

- ✅ **Framework-agnostic SDK** - Same `@fhevm-sdk/core` works in backend, frontend, and automation
- ✅ **Backend integration** - Encryption/decryption in Express.js context
- ✅ **REST API patterns** - Proper error handling and response formatting
- ✅ **Wallet management** - HD wallet or private key support
- ✅ **Configuration management** - Environment-based setup

## 📋 Prerequisites

- Node.js v18 or higher
- pnpm package manager
- A wallet with ETH (for gas fees)
- Access to FHEVM-enabled network (localhost or Sepolia)

## 🚀 Quick Start

### 1. Install Dependencies

From the project root:

```bash
pnpm install
```

### 2. Configure Environment

Create a `.env` file from the example:

```bash
cp examples/nodejs-backend/.env.example examples/nodejs-backend/.env
```

Edit `.env` with your configuration:

```bash
# Wallet (use one of these)
MNEMONIC="your twelve word mnemonic phrase here"
# OR
PRIVATE_KEY="0x..."

# Network (localhost Hardhat)
RPC_URL="http://127.0.0.1:8545"
CHAIN_ID="31337"

# Contract address (FHECounter)
CONTRACT_ADDRESS="0x..."

# Server
PORT="3001"
```

### 3. Start Development Server

**Option A: Watch mode (recommended for development)**

```bash
pnpm backend:dev
```

**Option B: Production mode**

```bash
pnpm backend:start
```

### 4. Test the API

**Health check:**

```bash
curl http://localhost:3001/api/health
```

**Encrypt and increment counter:**

```bash
curl -X POST http://localhost:3001/api/encrypt \
  -H "Content-Type: application/json" \
  -d '{"value": 42}'
```

**Decrypt counter:**

```bash
# Auto-fetch current counter from contract
curl -X POST http://localhost:3001/api/decrypt \
  -H "Content-Type: application/json" \
  -d '{}'

# Or decrypt a specific handle
curl -X POST http://localhost:3001/api/decrypt \
  -H "Content-Type: application/json" \
  -d '{"handle": "0x..."}'
```

## 📖 API Reference

### POST `/api/encrypt`

Encrypts a value and sends it to the FHECounter contract.

**Request:**

```json
{
  "value": 42
}
```

**Response:**

```json
{
  "success": true,
  "transactionHash": "0x...",
  "blockNumber": 123,
  "value": 42,
  "encrypted": {
    "handle": "0x...",
    "hasInputProof": true
  }
}
```

### POST `/api/decrypt`

Decrypts the current counter value or a specific handle.

**Request (decrypt current counter):**

```json
{}
```

**Request (decrypt specific handle):**

```json
{
  "handle": "0x742f4fe0805d2a1fd1b79149c6e3a37a98b4fd05c97c2c863f8c5a49e4e5c2f8"
}
```

**Response:**

```json
{
  "success": true,
  "decryptedValue": 42,
  "handle": "0x742f4fe0805d2a..."
}
```

### GET `/api/health`

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-10-18T12:00:00Z"
}
```

## 🏗️ Project Structure

```
examples/nodejs-backend/
├── src/
│   ├── index.ts              # Express app entry point
│   ├── config.ts             # Configuration loading & validation
│   ├── utils/
│   │   └── fhevm-setup.ts    # FHEVM & wallet initialization
│   └── routes/
│       ├── encrypt.ts        # Encryption endpoint
│       └── decrypt.ts        # Decryption endpoint
├── .env.example              # Environment template
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
└── README.md                # This file
```

## 💡 How It Works

### SDK Integration

This example uses `@fhevm-sdk/core` directly - the same core package used in React, Vue, and vanilla JavaScript examples:

```typescript
import { createFhevmInstance, createStorage, encryptValue, decryptValue } from '@fhevm-sdk/core';

// Backend uses in-memory storage (stateless)
const storage = createStorage('memory');
const fhevmInstance = await createFhevmInstance({
  provider: config.rpcUrl,
  signal: new AbortController().signal,
});

// Encrypt values
const encrypted = await encryptValue(
  fhevmInstance,
  contractAddress,
  userAddress,
  42,
  'euint32'
);

// Decrypt values (requires signature)
const decrypted = await decryptValue(
  fhevmInstance,
  handle,
  contractAddress,
  decryptionSignature
);
```

### Wallet Management

Supports both HD wallets (mnemonic) and single key wallets:

```typescript
// HD Wallet (mnemonic)
const hdNode = ethers.HDNodeWallet.fromMnemonic(
  ethers.Mnemonic.fromPhrase(config.mnemonic)
);
const wallet = hdNode.connect(provider);

// Single key wallet
const wallet = new ethers.Wallet(config.privateKey, provider);
```

## 🚀 Production Deployment

When deploying to production:

1. **Environment Variables**: Use secure secret management (AWS Secrets Manager, Vault, etc.)
2. **Logging**: Implement structured logging
3. **Error Handling**: Add comprehensive error handling and monitoring
4. **Rate Limiting**: Add rate limiting to API endpoints
5. **HTTPS**: Use HTTPS in production
6. **Authentication**: Add API authentication/authorization

Example improvements:

```typescript
// Add rate limiting
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/api/', limiter);

// Add request logging
import morgan from 'morgan';
app.use(morgan('combined'));

// Add input validation
import { body, validationResult } from 'express-validator';
app.post('/api/encrypt',
  body('value').isInt({ min: 0 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ... encrypt logic
  }
);
```

## 🔧 Use Cases

### 1. Microservice Architecture

Use this backend as a microservice for encryption/decryption:

```typescript
// Service A needs encrypted data
const response = await fetch('http://fhevm-backend:3001/api/encrypt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ value: sensitiveData }),
});
const result = await response.json();
```

### 2. Webhook Handler

Encrypt data before storing on-chain via webhooks:

```typescript
app.post('/webhook/process-data', async (req, res) => {
  const { userId, sensitiveData } = req.body;
  const encrypted = await encryptValue(
    fhevmInstance,
    contractAddress,
    userAddress,
    sensitiveData,
    'euint32'
  );
  await contract.store(encrypted.handles[0], encrypted.inputProof);
  res.json({ success: true });
});
```

### 3. API Gateway

Add FHEVM encryption to existing APIs:

```typescript
app.use('/api/protected', async (req, res, next) => {
  // Encrypt sensitive fields
  if (req.body.ssn) {
    const encrypted = await encryptValue(
      fhevmInstance,
      contractAddress,
      userAddress,
      req.body.ssn,
      'euint32'
    );
    req.body.encryptedSsn = encrypted;
  }
  next();
});
```

## 🔐 Security Considerations

- **Private Keys**: Never commit `.env` file. Use environment variables only
- **ACL Checks**: Only the wallet that encrypted data can decrypt it
- **Wallet Isolation**: Each instance uses its own wallet context
- **In-Memory Storage**: Backend uses in-memory storage (stateless) - suitable for load-balanced deployments

## 🐛 Troubleshooting

### Error: Missing environment variable

```
❌ Missing RPC_URL environment variable
```

**Solution:** Copy `.env.example` to `.env` and configure all variables.

### Error: Insufficient funds

```
❌ Transaction failed: insufficient funds for gas
```

**Solution:** Your wallet needs ETH. Get testnet ETH from a faucet.

### Error: Contract not found

```
❌ Error: call exception
```

**Solution:**
- Verify `CONTRACT_ADDRESS` is correct
- Ensure contract is deployed on the network
- Check you're connected to the right network (`CHAIN_ID`)

### Error: ACL check failed

```
❌ Decryption not allowed: Only the wallet that encrypted this value can decrypt it
```

**Solution:** Use the same wallet for both encryption and decryption.

## 📚 Learn More

- [FHEVM Documentation](https://docs.zama.ai/protocol/)
- [Express.js Guide](https://expressjs.com/)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [FHEVM SDK Reference](https://docs.zama.ai/protocol/relayer-sdk-guides/)

## 📄 License

BSD-3-Clause-Clear - See [LICENSE](../../LICENSE) for details.
