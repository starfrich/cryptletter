# FHEVM Automation Example

A Node.js automation framework demonstrating **FHEVM SDK in scheduled tasks and batch processing**. This example shows how to use `@fhevm-sdk/core` for automated workflows like daily decryption, batch encryption, and data migration.

## 🎯 What This Demonstrates

- ✅ **Framework-agnostic SDK** - Same core SDK in scheduling context
- ✅ **Task scheduling** - Cron jobs for automated operations
- ✅ **Batch processing** - Process multiple encrypted values
- ✅ **Error handling** - Robust error handling in long-running tasks
- ✅ **Task isolation** - Each task can run independently
- ✅ **Logging patterns** - Production-grade task logging

## 📋 Prerequisites

- Node.js v18 or higher
- pnpm package manager
- A wallet with ETH (for gas fees)
- Access to FHEVM-enabled network (localhost or Sepolia)

## 🚀 Quick Start

### 1. Setup Blockchain

First, start a local FHEVM blockchain and deploy contracts:

```bash
# From project root
pnpm chain              # Start local blockchain (in separate terminal)
pnpm deploy:localhost   # Deploy FHECounter contract
```

### 2. Install Dependencies

From the project root:

```bash
pnpm install
```

### 3. Configure Environment

Create a `.env` file from the example:

```bash
cp examples/nodejs-automation/.env.example examples/nodejs-automation/.env
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

# Contract address (FHECounter - get from deployment)
CONTRACT_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"

# Scheduler - Cron expression for daily tasks
# Default: 0 0 * * * (runs at 00:00 UTC every day)
CRON_SCHEDULE_DAILY="0 0 * * *"
```

### 4. Run Tasks

**From project root (recommended):**

```bash
# Start scheduler (runs tasks on schedule)
pnpm automation:start

# Development mode with auto-reload
pnpm automation:dev

# Run tasks immediately
pnpm automation:task:decrypt
pnpm automation:task:batch
```

**Or from `examples/nodejs-automation` directory:**

```bash
# Start scheduler (runs tasks on schedule)
pnpm start

# Development mode with auto-reload
pnpm dev

# Run tasks immediately
pnpm task:decrypt
pnpm task:batch

# Show help
pnpm start help
```

## 🏗️ Project Structure

```
examples/nodejs-automation/
├── src/
│   ├── index.ts                    # Main entry & task router
│   ├── config.ts                   # Configuration loading & validation
│   ├── scheduler.ts                # Cron scheduler
│   ├── contracts/
│   │   └── deployedContracts.ts    # Auto-generated contract ABIs
│   ├── utils/
│   │   ├── fhevm-setup.ts          # FHEVM & wallet initialization
│   │   └── signature-helper.ts     # Decryption signature generation
│   └── tasks/
│       ├── daily-decrypt.ts        # Daily decryption task
│       └── batch-encrypt.ts        # Batch encryption task
├── .env.example                    # Environment template
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config
└── README.md                       # This file
```

## 🔄 Task Modes

### Scheduler Mode (Default)

Runs all configured tasks on a cron schedule:

```bash
pnpm start scheduler
```

Output:
```
📅 Starting task scheduler...

⏰ Scheduling "daily-decrypt" with cron: 0 0 * * *
✅ All tasks scheduled

💡 Tip: Press Ctrl+C to stop
```

The scheduler will run the daily decryption task at 00:00 UTC every day.

### Task Mode

Run specific tasks immediately for testing or one-off operations:

```bash
# Run daily decryption
pnpm task:decrypt

# Run batch encryption
pnpm task:batch
```

## 📚 Available Tasks

### Daily Decryption Task

Reads and decrypts the current counter value from the contract.

**File:** `src/tasks/daily-decrypt.ts`

**Usage:**

```bash
pnpm task:decrypt
```

**Output:**

```
[2025-10-18T12:00:00.000Z] 📋 Daily Decrypt: Starting daily decryption task...
[2025-10-18T12:00:00.100Z] 📋 Daily Decrypt: Reading encrypted counter from contract...
[2025-10-18T12:00:00.500Z] 📋 Daily Decrypt: Decrypting handle: 0x742f4fe0...
[2025-10-18T12:00:00.800Z] 📋 Daily Decrypt: ✨ Decrypted value: 42
[2025-10-18T12:00:00.850Z] ✅ Daily Decrypt: Completed in 850ms
```

**Extension ideas:**

```typescript
// Store history
await db.insert('decryption_history', {
  value: decryptedValue,
  timestamp: new Date(),
});

// Send alerts
if (decryptedValue > threshold) {
  await sendAlert(`Counter exceeded threshold: ${decryptedValue}`);
}

// Generate reports
const report = generateDailyReport(decryptedValue);
await saveReport(report);
```

### Batch Encryption Task

Encrypts multiple values and sends them to the contract in sequence.

**File:** `src/tasks/batch-encrypt.ts`

**Usage:**

```bash
pnpm task:batch
```

**Output:**

```
[2025-10-18T12:00:00.000Z] 📋 Batch Encrypt: Processing 10 values...
[2025-10-18T12:00:00.100Z] 📋 Batch Encrypt: Encrypting value: 1
[2025-10-18T12:00:00.300Z] 📋 Batch Encrypt: ✅ Value 1 encrypted and stored
[2025-10-18T12:00:00.400Z] 📋 Batch Encrypt: Encrypting value: 2
...
[2025-10-18T12:00:05.000Z] ✅ Batch Encrypt: Completed in 5000ms
```

**Extension ideas:**

```typescript
// Read from CSV
import csv from 'csv-parser';
const values = await fs.createReadStream('data.csv').pipe(csv());

// Process in batches
const batches = chunk(values, 10);
for (const batch of batches) {
  await batchEncryptTask(batch);
  await delay(1000); // Rate limiting
}

// Log progress
const results = await batchEncryptTask(values);
console.log(`Processed: ${results.success}/${results.total}`);
```

## 🔧 Creating Custom Tasks

### 1. Create a new task file

```typescript
// src/tasks/my-task.ts
import { logTask, logTaskComplete, logTaskError } from '../utils/fhevm-setup.js';

export async function myTask(): Promise<void> {
  const startTime = Date.now();
  const taskName = 'My Task';

  try {
    logTask(taskName, 'Starting...');

    // Your logic here

    const duration = Date.now() - startTime;
    logTaskComplete(taskName, duration);
  } catch (error: any) {
    logTaskError(taskName, error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  myTask().catch(() => process.exit(1));
}
```

### 2. Register the task

In `src/scheduler.ts`:

```typescript
import { myTask } from './tasks/my-task.js';

export class TaskScheduler {
  start(config: Config): void {
    // ... existing code ...
    this.scheduleDaily('my-task', config.cronScheduleDaily, myTask);
  }
}
```

In `src/index.ts`:

```typescript
case 'my-task': {
  await myTask();
  process.exit(0);
  break;
}
```

## ⏰ Cron Expression Guide

The `CRON_SCHEDULE_DAILY` environment variable uses standard cron syntax:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 7) (0 or 7 is Sunday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

Examples:

```bash
# Run at 00:00 UTC every day
0 0 * * *

# Run every hour at minute 30
30 * * * *

# Run at 09:00 UTC on weekdays (Mon-Fri)
0 9 * * 1-5

# Run every 6 hours
0 */6 * * *

# Run at 22:00 UTC on Saturday
0 22 * * 6
```

## 🚀 Use Cases

### 1. Daily Reports

```typescript
export async function dailyReportTask(): Promise<void> {
  const value = await decryptCounter();
  const report = {
    date: new Date().toISOString().split('T')[0],
    value,
    timestamp: new Date(),
  };
  await saveToDatabase(report);
}
```

### 2. Data Migration

```typescript
export async function migrateDataTask(): Promise<void> {
  const legacyData = await loadFromLegacySystem();
  for (const item of legacyData) {
    await encryptAndStore(item);
  }
}
```

### 3. Contract Health Checks

```typescript
export async function healthCheckTask(): Promise<void> {
  const count = await contract.getCount();
  const isHealthy = count !== 0;
  if (!isHealthy) {
    await sendAlert('Contract counter is zero!');
  }
}
```

### 4. Backup & Archive

```typescript
export async function backupTask(): Promise<void> {
  const data = await gatherAllEncryptedData();
  await archiveToStorage(data);
}
```

## 🔐 Security Considerations

- **Private Keys**: Never commit `.env` file
- **Task Isolation**: Each task runs in its own context
- **Error Logging**: Log errors without exposing secrets
- **Rate Limiting**: Add delays between batch operations to avoid rate limits
- **Wallet Isolation**: Each task uses the same wallet for consistency

## 🐛 Troubleshooting

### 1. No logs showing when running tasks

**Problem:** Tasks complete but logs don't appear in console.

**Solution:** Logs have been enhanced with console output. If still not visible:
- Check that you're using the latest version of the files
- Run with explicit output: `pnpm automation:task:decrypt 2>&1`
- Check background process logs with `BashOutput` tool

### 2. Contract address mismatch

**Problem:** Tasks fail with contract not found or reverted.

**Solution:**
```bash
# 1. Make sure blockchain is running
pnpm chain

# 2. Deploy contracts and note the address
pnpm deploy:localhost

# 3. Update .env with the deployed contract address
# CONTRACT_ADDRESS="0x..." (from deployment output)

# 4. Verify contract in logs:
# Look for "Contract address: 0x..."
```

### 3. Wallet has no funds

**Problem:** `Sender doesn't have enough funds to send tx`

**Solution:**
```bash
# For localhost: Use the default mnemonic
MNEMONIC="test test test test test test test test test test test junk"

# For Sepolia: Get testnet ETH
# https://sepoliafaucet.com/
```

### 4. Task runs but nothing happens

Make sure contract has encrypted data:

```bash
# Run batch task first to add data
pnpm automation:task:batch

# Then decrypt
pnpm automation:task:decrypt
```

### 5. Cron job not running

Check the cron expression in `.env`:

```bash
# Test cron expression
node -e "const cron = require('node-cron'); console.log(cron.validate('0 0 * * *'))"

# For testing, use frequent schedule (every minute):
CRON_SCHEDULE_DAILY="* * * * *"
```

### 6. Import errors or module not found

**Problem:** `Module '@fhevm-sdk/core' not found` or similar

**Solution:**
```bash
# Rebuild SDK from project root
pnpm sdk:build

# Then reinstall automation dependencies
cd examples/nodejs-automation
pnpm install
```

### 7. TypeScript errors

**Problem:** Type errors about `FhevmInstance` or `DecryptionSignature`

**Solution:** All imports should use `@fhevm-sdk/core`:
```typescript
import { createFhevmInstance } from '@fhevm-sdk/core';
import type { FhevmInstance, DecryptionSignature } from '@fhevm-sdk/core';
```

### 8. Decryption signature errors

**Problem:** Empty or invalid signature errors

**Solution:** The `signature-helper.ts` has been added with proper EIP-712 signing:
- Signatures are cached for 365 days
- Automatically generates ML-KEM keypair
- Uses proper wallet signing with EIP-712

## 📚 Learn More

- [FHEVM Documentation](https://docs.zama.ai/protocol/)
- [Node Cron Documentation](https://github.com/kelektiv/node-cron)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [FHEVM SDK Reference](https://docs.zama.ai/protocol/relayer-sdk-guides/)

## 📄 License

BSD-3-Clause-Clear - See [LICENSE](../../LICENSE) for details.
