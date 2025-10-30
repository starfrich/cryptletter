# Vanilla JS Example

A minimal browser example demonstrating `@fhevm-sdk/vanilla` with MetaMask on Sepolia using the `FHECounter` contract.

## Prerequisites
- Node.js 18+
- pnpm
- MetaMask (or any EIP-1193 wallet) connected to Sepolia

## Install and run

```bash
pnpm install
pnpm vanilla:dev
```

Open the printed local URL (e.g., `http://localhost:5173`).

## What it does
- Connects a wallet
- Initializes FHEVM
- Encrypts a `euint32` value and calls `increment`
- Reads encrypted counter and decrypts it in the browser

## Files
- `index.html`: Minimal UI and buttons
- `src/main.js`: Wiring for connect/init/encrypt/increment/decrypt

## Contract configuration
This example reuses the deployed `FHECounter` config from `packages/nextjs/contracts/deployedContracts.ts` (Sepolia, chainId `11155111`).

If you need to point to a different deployment, update:
```js
const chainId = 11155111;
const contract = deployed[chainId].FHECounter;
```
inside `src/main.js`.

## Decryption signature
`src/main.js` generates an EIP-712 decryption signature via the FHEVM instance:
```js
const signature = await instance.createEIP712Signature(account, [contract.address], nowSec, durationDays);
```
and then decrypts the on-chain handle using `FhevmClient#decrypt`.

## CDN usage (optional)

For browser-based usage, you can use the **Zama Relayer SDK** UMD bundle combined with a bundler (Vite, Webpack, etc.):

```html
<!-- Include Zama Relayer SDK (provides relayer functionality) -->
<script src="https://unpkg.com/@zama-fhe/relayer-sdk@latest/dist/umd/index.js"></script>

<!-- Your bundled app that imports @fhevm-sdk -->
<script type="module" src="./src/main.js"></script>
```

The `@fhevm-sdk` SDK is designed to be used via bundlers (ESM), not as a standalone UMD bundle. This approach:
- Enables tree-shaking (smaller bundle sizes)
- Maintains full TypeScript support
- Works with modern bundlers (Vite, Webpack, Rollup)
- Reduces code duplication

**Browser Support**: Chrome, Firefox, Safari (modern versions)

## Troubleshooting
- Ensure your wallet is on Sepolia and you have test ETH.
- If initialization fails, reload the page and try again.
- Open DevTools console for detailed logs printed by the example.

