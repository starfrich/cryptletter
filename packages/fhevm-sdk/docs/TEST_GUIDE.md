# FHEVM SDK Testing Guide

This guide covers the testing infrastructure, running tests, and contributing tests for the FHEVM SDK.

## Overview

The FHEVM SDK uses **Vitest** for unit testing with the following setup:

- **Framework**: Vitest 2.1.8
- **Test Environment**: jsdom (for DOM testing)
- **Coverage Tool**: v8
- **React Testing**: @testing-library/react
- **Target Coverage**: >80% across all modules

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
Test Files  39 passed (39)
      Tests  1241 passed (1241)
   Start at  03:47:02
   Duration  14.98s (transform 7.36s, setup 93.80s, collect 24.68s, tests 20.62s, environment 42.73s, prepare 17.14s)
```

| File                        | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                                                                                                   |
| --------------------------- | ------- | -------- | ------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| All files                   | 94.41   | 88.65    | 97.66   | 94.41   |                                                                                                                     |
| src                         | 96.35   | 98.01    | 88.88   | 96.35   |                                                                                                                     |
| FhevmDecryptionSignature.ts | 96.35   | 98.01    | 88.88   | 96.35   | 72-73,77-78,81-82,85-86,258-259                                                                                     |
| fhevmTypes.ts               | 0       | 0        | 0       | 0       |                                                                                                                     |
| src/core                    | 94.69   | 90.9     | 95.45   | 94.69   |                                                                                                                     |
| cryptletter.ts              | 95.42   | 82.75    | 94.73   | 95.42   | 249-250,255-256,268-269,322-323,469-471,515,578-579,663-664                                                         |
| decryption.ts               | 100     | 96.29    | 100     | 100     | 134                                                                                                                 |
| encryption.ts               | 99.27   | 98.27    | 100     | 99.27   | 151                                                                                                                 |
| instance.ts                 | 87.86   | 89.39    | 92.3    | 87.86   | 40-41,57-66,73-74,301-304,314-317,322-329                                                                           |
| types.ts                    | 100     | 100      | 100     | 100     |                                                                                                                     |
| src/internal                | 94.4    | 86.88    | 100     | 94.4    |                                                                                                                     |
| PublicKeyStorage.ts         | 90.62   | 86.79    | 100     | 90.62   | 68-69,80-81,91-92,103-104,130,141,176-177                                                                           |
| RelayerSDKLoader.ts         | 97.41   | 86.95    | 100     | 97.41   | 173-174,190-191                                                                                                     |
| constants.ts                | 100     | 100      | 100     | 100     |                                                                                                                     |
| fhevm.ts                    | 100     | 100      | 100     | 100     |                                                                                                                     |
| fhevmTypes.ts               | 0       | 0        | 0       | 0       |                                                                                                                     |
| src/internal/mock           | 100     | 100      | 100     | 100     |                                                                                                                     |
| fhevmMock.ts                | 100     | 100      | 100     | 100     |                                                                                                                     |
| src/react                   | 94.82   | 82.56    | 95.65   | 94.82   |                                                                                                                     |
| FhevmProvider.tsx           | 100     | 100      | 100     | 100     |                                                                                                                     |
| useCreatorProfile.ts        | 100     | 100      | 100     | 100     |                                                                                                                     |
| useCryptletter.ts           | 98.73   | 58.42    | 100     | 98.73   | 139-142                                                                                                             |
| useFHEDecrypt.ts            | 88.71   | 87.69    | 80      | 88.71   | 203-208,235-240,261-266,288-291                                                                                     |
| useFHEEncryption.ts         | 87.91   | 76.19    | 100     | 87.91   | 116-124,169-170                                                                                                     |
| useFhevm.tsx                | 95.36   | 90.76    | 100     | 95.36   | 9-11,196,265-266,278-280                                                                                            |
| useFhevmInstance.ts         | 100     | 100      | 100     | 100     |                                                                                                                     |
| useFhevmStatus.ts           | 100     | 100      | 100     | 100     |                                                                                                                     |
| useInMemoryStorage.tsx      | 100     | 100      | 100     | 100     |                                                                                                                     |
| useStorage.tsx              | 82.19   | 84.61    | 100     | 82.19   | 84-89,107-114                                                                                                       |
| useSubscriptions.ts         | 100     | 94.33    | 100     | 100     | 172,203,227                                                                                                         |
| useWalletCallbacks.ts       | 88.46   | 80       | 100     | 88.46   | 69-70,78-79,86-87                                                                                                   |
| src/storage                 | 89.64   | 95.23    | 100     | 89.64   |                                                                                                                     |
| GenericStringStorage.ts     | 100     | 100      | 100     | 100     |                                                                                                                     |
| indexeddb.ts                | 84.55   | 88.88    | 100     | 84.55   | 100-101,131-136,140-141,166-167,182-190                                                                             |
| localstorage.ts             | 89.03   | 98       | 100     | 89.03   | 56-57,79-83,163-167,185-189                                                                                         |
| memory.ts                   | 100     | 100      | 100     | 100     |                                                                                                                     |
| types.ts                    | 100     | 100      | 100     | 100     |                                                                                                                     |
| src/types                   | 100     | 97.87    | 100     | 100     |                                                                                                                     |
| callbacks.ts                | 100     | 100      | 100     | 100     |                                                                                                                     |
| errors.ts                   | 100     | 96.77    | 100     | 100     | 317                                                                                                                 |
| fhevm.ts                    | 0       | 0        | 0       | 0       |                                                                                                                     |
| storage.ts                  | 0       | 0        | 0       | 0       |                                                                                                                     |
| src/utils                   | 94.02   | 88.02    | 100     | 94.02   |                                                                                                                     |
| debug.ts                    | 98.9    | 97.67    | 100     | 98.9    | 202,549-550                                                                                                         |
| encryption.ts               | 72.93   | 60.41    | 100     | 72.93   | 60-69,80-88,102-103,107-119,128-129,135-136,200-202,216-217,220-221,310-311,314-316,319-321,324-326,341-344,360-363 |
| errors.ts                   | 100     | 91.3     | 100     | 100     | 365,387                                                                                                             |
| imageProcessor.ts           | 100     | 90.56    | 100     | 100     | 77,103,166                                                                                                          |
| ipfs.ts                     | 86.53   | 83.67    | 100     | 86.53   | 56-58,122-125,152-155,175-178,193,209-213                                                                           |
| retry.ts                    | 97.1    | 84.78    | 100     | 97.1    | 234-236,431-433                                                                                                     |
| validation.ts               | 96.44   | 94.79    | 100     | 96.44   | 104-105,240-241,262-263,377-381                                                                                     |


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
