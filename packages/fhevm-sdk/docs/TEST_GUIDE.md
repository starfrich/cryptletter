# FHEVM SDK Testing Guide

This guide covers the testing infrastructure, running tests, and contributing tests for the FHEVM SDK.

## Overview

The FHEVM SDK uses **Vitest** for unit testing with the following setup:

- **Framework**: Vitest 2.1.8
- **Test Environment**: jsdom (for DOM testing)
- **Coverage Tool**: v8
- **React Testing**: @testing-library/react
- **Vue Testing**: @testing-library/vue
- **Target Coverage**: >80% across all modules

## Project Structure

```
packages/fhevm-sdk/
├── test/
│   ├── core/                             # Core functionality tests
│   │   ├── encryption.test.ts           # Encryption utilities tests
│   │   ├── decryption.test.ts           # Decryption utilities tests
│   │   ├── instance.test.ts             # Instance creation tests
│   │   ├── instance-node.test.ts        # Node.js instance tests
│   │   ├── instance-advanced.test.ts    # Advanced instance tests
│   │   └── instance-node-advanced.test.ts
│   ├── react/                            # React hooks tests
│   │   ├── hooks.test.tsx               # Legacy hooks tests
│   │   ├── FhevmProvider.test.tsx       # Provider component tests
│   │   ├── useFhevm.test.tsx            # useFhevm hook tests
│   │   ├── useFHEDecrypt.test.tsx       # Decryption hook tests
│   │   ├── useFhevmInstance.test.tsx    # Instance hook tests
│   │   ├── useFhevmStatus.test.tsx      # Status hook tests
│   │   ├── useStorage.test.tsx          # Storage hook tests
│   │   ├── useInMemoryStorage.test.tsx  # In-memory storage tests
│   │   └── useWalletCallbacks.test.ts   # Wallet callback tests
│   ├── vue/                              # Vue composables tests
│   │   ├── composables.test.ts          # Legacy composables tests
│   │   ├── FhevmPlugin.test.ts          # Plugin tests
│   │   ├── useFhevm.test.ts             # useFhevm composable tests
│   │   ├── useFHEDecrypt.test.ts        # Decryption composable tests
│   │   └── useInMemoryStorage.test.ts   # In-memory storage tests
│   ├── storage/                          # Storage implementation tests
│   │   ├── indexeddb.test.ts            # IndexedDB storage tests
│   │   └── localstorage.test.ts         # localStorage tests
│   ├── internal/                         # Internal module tests
│   │   ├── fhevmMock.test.ts            # Mock utilities tests
│   │   └── fhevmTypes.test.ts           # Type utilities tests
│   ├── types/                            # Type definition tests
│   │   └── errors.test.ts               # Error type tests
│   ├── utils/                            # Utility tests
│   │   ├── validation.test.ts           # Validation utilities tests
│   │   ├── errors.test.ts               # Error handling tests
│   │   ├── retry.test.ts                # Retry logic tests
│   │   └── debug.test.ts                # Debug utilities tests
│   ├── vanilla/                          # Vanilla JS tests
│   │   └── helpers.test.ts              # Helper function tests
│   ├── FhevmDecryptionSignature.test.ts # Signature class tests
│   ├── storage.test.ts                   # Storage interface tests
│   ├── utils.test.ts                     # General utility tests
│   └── exports.test.ts                   # Export verification tests
├── vitest.config.ts                      # Vitest configuration
├── vitest.setup.ts                       # Test setup (fake-indexeddb)
└── TEST_GUIDE.md                        # This file
```

## Running Tests

### Quick Start

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm --filter ./packages/fhevm-sdk test

# Run tests in watch mode (development)
pnpm --filter ./packages/fhevm-sdk test:watch

# Run tests with UI
pnpm --filter ./packages/fhevm-sdk vitest --ui
```

### Test Coverage

```bash
# Generate coverage report
pnpm --filter ./packages/fhevm-sdk test

# View HTML coverage report
open packages/fhevm-sdk/coverage/index.html
```

Coverage thresholds (enforced by vitest.config.ts):
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

## Test Structure

### Core Tests (`test/core/`)

#### `encryption.test.ts`
Tests encryption utilities:
- `getEncryptionMethod()` - Maps Solidity types to encryption methods
- `toHex()` - Converts Uint8Array/strings to hex
- `isValidEncryptionValue()` - Validates values for encryption
- `buildParamsFromAbi()` - Builds contract parameters from ABI

**Example**:
```typescript
it("encrypts values correctly", async () => {
  const mockInstance = { /* ... */ };
  const result = await encryptValue(
    mockInstance,
    contractAddress,
    userAddress,
    42,
    "euint32"
  );
  expect(result.handles).toBeDefined();
  expect(result.inputProof).toBeDefined();
});
```

#### `decryption.test.ts`
Tests decryption utilities:
- `isSignatureValid()` - Checks if signatures are still valid
- `getUniqueContractAddresses()` - Extracts unique addresses from requests
- `isValidDecryptionRequest()` - Validates decryption requests
- `filterValidRequests()` - Filters out invalid requests

### React Hooks Tests (`test/react/`)

Tests React-specific hooks and components:
- `FhevmProvider.test.tsx` - Provider component and context
- `useFhevm.test.tsx` - Main FHEVM instance hook with retry logic
- `useFHEDecrypt.test.tsx` - Decryption hook with signature management
- `useFhevmInstance.test.tsx` - Instance state management
- `useFhevmStatus.test.tsx` - Status tracking hook
- `useStorage.test.tsx` - Storage integration hooks
- `useInMemoryStorage.test.tsx` - In-memory storage hook
- `useWalletCallbacks.test.ts` - Wallet event callbacks
- `hooks.test.tsx` - Legacy hook tests

**Example**:
```typescript
it("encrypts with useFHEEncryption", async () => {
  const { result } = renderHook(() =>
    useFHEEncryption({
      instance: mockInstance,
      getAddress: mockGetAddress,
      contractAddress,
    })
  );

  expect(result.current.canEncrypt).toBe(true);

  const encrypted = await result.current.encryptWith((builder) => {
    builder.add32(42);
  });

  expect(encrypted).toBeDefined();
});
```

### Vue Composables Tests (`test/vue/`)

Tests Vue-specific composables and plugins:
- `FhevmPlugin.test.ts` - Vue plugin for global FHEVM instance
- `useFhevm.test.ts` - Main FHEVM composable with reactivity
- `useFHEDecrypt.test.ts` - Decryption composable with ref support
- `useInMemoryStorage.test.ts` - In-memory storage composable
- `composables.test.ts` - Legacy composable tests

**Key difference from React**: Vue tests use refs and verify reactivity:
```typescript
const instanceRef = ref<FhevmInstance | undefined>(undefined);
const result = useFHEEncryption({ instance: instanceRef, ... });

expect(result.canEncrypt.value).toBe(false);
instanceRef.value = mockInstance;
expect(result.canEncrypt.value).toBe(true);
```

### Storage Tests (`test/storage/`)

Tests storage implementations:
- `indexeddb.test.ts` - IndexedDB storage implementation tests
- `localstorage.test.ts` - localStorage storage implementation tests
- Key-value operations (set, get, remove)
- Edge cases (empty strings, special characters, large values)
- Storage initialization and error handling

### Utility Tests (`test/utils/`)

Tests utility functions:
- `validation.test.ts` - Input validation utilities (addresses, types, values)
- `errors.test.ts` - Error handling and recovery suggestions
- `retry.test.ts` - Retry logic with exponential backoff
- `debug.test.ts` - Debug logging and performance monitoring

## Writing New Tests

### Setup

1. **Create test file** in appropriate directory:
   ```
   test/core/my-feature.test.ts
   ```

2. **Import test utilities**:
   ```typescript
   import { describe, it, expect, beforeEach, vi } from "vitest";
   ```

3. **Mock FHEVM Instance**:
   ```typescript
   const mockInstance: Partial<FhevmInstance> = {
     createEncryptedInput: vi.fn().mockReturnValue({
       add32: vi.fn().mockReturnThis(),
       encrypt: vi.fn().mockResolvedValue({
         handles: [new Uint8Array([1, 2, 3])],
         inputProof: new Uint8Array([4, 5, 6]),
       }),
     }),
   };
   ```

### Test Template

```typescript
import { describe, it, expect, beforeEach } from "vitest";

describe("Feature Name", () => {
  let fixture: any;

  beforeEach(() => {
    // Setup for each test
  });

  it("should do something specific", () => {
    // Arrange
    const input = "test";

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe("expected");
  });

  describe("Edge cases", () => {
    it("handles empty input", () => {
      expect(myFunction("")).toBe(null);
    });

    it("handles invalid input", () => {
      expect(() => myFunction(null)).toThrow();
    });
  });
});
```

### Best Practices

1. **Use descriptive test names**
   ```typescript
   ✅ it("validates euint32 values within 0-4294967295 range")
   ❌ it("validates euint32")
   ```

2. **Test one thing per test**
   ```typescript
   ✅ it("accepts valid addresses")
   ✅ it("rejects invalid addresses")
   ❌ it("validates and processes addresses")
   ```

3. **Use test fixtures for common setups**
   ```typescript
   beforeEach(() => {
     mockInstance = createMockInstance();
     mockGetAddress = vi.fn(() => Promise.resolve(testAddress));
   });
   ```

4. **Mock external dependencies**
   ```typescript
   const mockEncrypt = vi.fn().mockResolvedValue({ /* ... */ });
   ```

5. **Test error paths**
   ```typescript
   it("throws on invalid parameters", () => {
     expect(() => encryptValue(null, null, null)).toThrow();
   });
   ```

## CI/CD Integration

### GitHub Actions

This project uses **GitHub Actions** for continuous integration (CI) and coverage reporting.

#### Overview
- **Workflows**: `.github/workflows/test-coverage.yml`
- **Runs on**: Pushes to `main` and `develop`, and Pull Requests
- **Node.js versions**: 18.x, 20.x, 22.x
- **Coverage reporting**: Optional upload to Codecov
- **Pull Request comments**: Automatic coverage summary

---

```yaml
name: CI & Coverage

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  build-test:
    name: Build & Test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20.x, 22.x]

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          persist-credentials: false

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'

      - name: Setup Foundry
        uses: foundry-rs/foundry-toolchain@v1
        with:
          version: stable

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build SDK
        run: pnpm sdk:build

      - name: Compile Hardhat contracts
        run: pnpm hardhat:compile

      - name: Run Hardhat tests
        run: pnpm hardhat:test

      - name: Run SDK tests
        run: pnpm sdk:test
        env:
          NODE_OPTIONS: --max-old-space-size=4096

  coverage:
    name: SDK Test Coverage
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.event_name == 'pull_request'
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          persist-credentials: false

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22.x
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build SDK
        run: pnpm sdk:build

      - name: Run tests with coverage
        run: pnpm sdk:test
        env:
          NODE_OPTIONS: --max-old-space-size=4096

      # Uncomment when ready to upload to Codecov
      # - name: Upload to Codecov
      #   uses: codecov/codecov-action@v4
      #   with:
      #     files: ./packages/fhevm-sdk/coverage/coverage-final.json
      #     token: ${{ secrets.CODECOV_TOKEN }}
      #     fail_ci_if_error: false
```

### Pre-commit Hooks

Husky pre-commit hooks run TypeScript type checking before commits.

## Coverage Requirements

### Current Coverage

After implementing all tests:
```json
Test Files  42 passed (42)
      Tests  1219 passed (1219)
   Start at  21:41:14
   Duration  28.54s (transform 6.27s, setup 97.05s, collect 22.62s, tests 43.89s, environment 32.01s, prepare 16.71s)
```
| File / Folder                  | % Stmts | % Branch | % Funcs | % Lines | Uncovered Lines                                                                                           |
| ------------------------------ | ------- | -------- | ------- | ------- | --------------------------------------------------------------------------------------------------------- |
| All files                      | 92.14   | 90       | 97.1    | 92.14   | -                                                                                                         |
| src                            | 96.35   | 98.01    | 88.88   | 96.35   | -                                                                                                         |
| ├─ FhevmDecryptionSignature.ts | 96.35   | 98.01    | 88.88   | 96.35   | 72-73,77-78,81-82,85-86,258-259                                                                           |
| ├─ fhevmTypes.ts               | 0       | 0        | 0       | 0       | -                                                                                                         |
| src/core                       | 79.66   | 85.09    | 96.55   | 79.66   | -                                                                                                         |
| ├─ decryption.ts               | 100     | 96.29    | 100     | 100     | 134                                                                                                       |
| ├─ encryption.ts               | 99.27   | 98.27    | 100     | 99.27   | 151                                                                                                       |
| ├─ instance-node.ts            | 55.95   | 77.77    | 100     | 55.95   | 76-93,124-158                                                                                             |
| ├─ instance.ts                 | 66.82   | 68.96    | 92.3    | 66.82   | 40-41,58-59,63-64,73-74,76-77,129,134-135,137-143,146-152,155-161,164-170,176-190,294-313,323-326,344-345 |
| ├─ types.ts                    | 100     | 100      | 100     | 100     | -                                                                                                         |
| src/internal                   | 94.4    | 86.88    | 100     | 94.4    | -                                                                                                         |
| ├─ PublicKeyStorage.ts         | 90.62   | 86.79    | 100     | 90.62   | 68-69,80-81,91-92,103-104,130,141,176-177                                                                 |
| ├─ RelayerSDKLoader.ts         | 97.41   | 86.95    | 100     | 97.41   | 173-174,190-191                                                                                           |
| ├─ constants.ts                | 100     | 100      | 100     | 100     | -                                                                                                         |
| ├─ fhevm.ts                    | 100     | 100      | 100     | 100     | -                                                                                                         |
| ├─ fhevmTypes.ts               | 0       | 0        | 0       | 0       | -                                                                                                         |
| src/internal/mock              | 100     | 100      | 100     | 100     | -                                                                                                         |
| ├─ fhevmMock.ts                | 100     | 100      | 100     | 100     | -                                                                                                         |
| src/react                      | 90.84   | 87.36    | 95      | 90.84   | -                                                                                                         |
| ├─ FhevmProvider.tsx           | 100     | 100      | 100     | 100     | -                                                                                                         |
| ├─ useFHEDecrypt.ts            | 88.71   | 87.69    | 80      | 88.71   | 203-208,235-240,261-266,288-291                                                                           |
| ├─ useFHEEncryption.ts         | 87.91   | 76.19    | 100     | 87.91   | 116-124,169-170                                                                                           |
| ├─ useFhevm.tsx                | 95.36   | 90.76    | 100     | 95.36   | 9-11,196,265-266,278-280                                                                                  |
| ├─ useFhevmInstance.ts         | 100     | 100      | 100     | 100     | -                                                                                                         |
| ├─ useFhevmStatus.ts           | 100     | 100      | 100     | 100     | -                                                                                                         |
| ├─ useInMemoryStorage.tsx      | 100     | 100      | 100     | 100     | -                                                                                                         |
| ├─ useStorage.tsx              | 82.19   | 84.61    | 100     | 82.19   | 84-89,107-114                                                                                             |
| ├─ useWalletCallbacks.ts       | 88.46   | 80       | 100     | 88.46   | 69-70,78-79,86-87                                                                                         |
| src/storage                    | 89.64   | 95.23    | 100     | 89.64   | -                                                                                                         |
| ├─ GenericStringStorage.ts     | 100     | 100      | 100     | 100     | -                                                                                                         |
| ├─ indexeddb.ts                | 84.55   | 88.88    | 100     | 84.55   | 100-101,131-136,140-141,166-167,182-190                                                                   |
| ├─ localstorage.ts             | 89.03   | 98       | 100     | 89.03   | 56-57,79-83,163-167,185-189                                                                               |
| ├─ memory.ts                   | 100     | 100      | 100     | 100     | -                                                                                                         |
| ├─ types.ts                    | 100     | 100      | 100     | 100     | -                                                                                                         |
| src/types                      | 100     | 97.87    | 100     | 100     | -                                                                                                         |
| ├─ callbacks.ts                | 100     | 100      | 100     | 100     | -                                                                                                         |
| ├─ errors.ts                   | 100     | 96.77    | 100     | 100     | 317                                                                                                       |
| ├─ fhevm.ts                    | 0       | 0        | 0       | 0       | -                                                                                                         |
| ├─ storage.ts                  | 0       | 0        | 0       | 0       | -                                                                                                         |
| src/utils                      | 98.26   | 93.62    | 100     | 98.26   | -                                                                                                         |
| ├─ debug.ts                    | 98.9    | 97.67    | 100     | 98.9    | 202,549-550                                                                                               |
| ├─ errors.ts                   | 100     | 91.3     | 100     | 100     | 365,387                                                                                                   |
| ├─ retry.ts                    | 97.1    | 84.78    | 100     | 97.1    | 234-236,431-433                                                                                           |
| ├─ validation.ts               | 96.44   | 94.79    | 100     | 96.44   | 104-105,240-241,262-263,377-381                                                                           |
| src/vanilla                    | 98.48   | 100      | 94.44   | 98.48   | -                                                                                                         |
| ├─ FhevmClient.ts              | 97.46   | 100      | 92.3    | 97.46   | 89-90                                                                                                     |
| ├─ helpers.ts                  | 100     | 100      | 100     | 100     | -                                                                                                         |
| src/vue                        | 87.05   | 80       | 94.73   | 87.05   | -                                                                                                         |
| ├─ FhevmPlugin.ts              | 100     | 100      | 100     | 100     | -                                                                                                         |
| ├─ useFHEDecrypt.ts            | 83.33   | 75.86    | 100     | 83.33   | 145-148,159,228-232,259-263,296-300,317-318,325-328,342-343,357-360,365-368                               |
| ├─ useFHEEncryption.ts         | 91.05   | 84.84    | 100     | 91.05   | 149-157,220-221                                                                                           |
| ├─ useFhevm.ts                 | 84.66   | 75.55    | 85.71   | 84.66   | 147,216-217,251-256,259-264,268-269,290-297                                                               |
| ├─ useInMemoryStorage.ts       | 100     | 100      | 100     | 100     | -                                                                                                         |


### Increasing Coverage

To improve coverage in specific areas:

1. **Identify uncovered lines**:
   ```bash
   pnpm test
   # Open coverage/index.html
   ```

2. **Write tests for uncovered code**:
   ```typescript
   it("handles error recovery", () => {
     // Test the uncovered error path
   });
   ```

3. **Verify coverage with**:
   ```bash
   pnpm test
   ```

## Debugging Tests

### Run single test file
```bash
pnpm vitest test/core/encryption.test.ts
```

### Run tests matching pattern
```bash
pnpm vitest --grep "encryption"
```

### Watch mode with filtering
```bash
pnpm vitest --watch test/core/
```

### Debug in VS Code

Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["vitest", "--inspect-brk"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Troubleshooting

### Tests fail with "Cannot find module"
```bash
# Rebuild the SDK
pnpm sdk:build
```

### Coverage not generating
```bash
# Clean and reinstall
pnpm clean
pnpm install
pnpm test
```

### Memory issues in CI
```bash
# Increase Node memory in CI
NODE_OPTIONS="--max-old-space-size=4096" pnpm test
```

## Performance Tips

1. **Use test factories for complex mocks**
2. **Run tests in parallel** (Vitest default)
3. **Only generate coverage when needed** (`--coverage` flag)
4. **Use `beforeEach` for shared setup**
5. **Mock async operations** to avoid test delays

## Contributing

When contributing tests:

1. ✅ Write tests for new features
2. ✅ Update existing tests for modified code
3. ✅ Ensure coverage stays >80%
4. ✅ Run `pnpm test` locally before pushing
5. ✅ Verify tests pass in CI

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)

---

**Questions?** Check the existing tests for examples or open an issue in the GitHub repository.
