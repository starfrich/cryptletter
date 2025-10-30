/**
 * Framework-agnostic callback types for FHEVM SDK
 *
 * These callbacks allow the SDK to work with any wallet library
 * (ethers.js, viem, wagmi, web3.js, raw MetaMask) without direct dependencies.
 */

/**
 * EIP-712 domain for typed data signing
 */
export interface EIP712Domain {
  name?: string;
  version?: string;
  chainId?: number;
  verifyingContract?: string;
  salt?: string;
}

/**
 * EIP-712 type definition
 */
export interface EIP712TypeProperty {
  name: string;
  type: string;
}

/**
 * EIP-712 types map
 */
export type EIP712Types = Record<string, EIP712TypeProperty[]>;

/**
 * EIP-712 message (generic object)
 */
export type EIP712Message = Record<string, any>;

/**
 * Callback for signing EIP-712 typed data
 *
 * @param domain - EIP-712 domain
 * @param types - EIP-712 types (without EIP712Domain)
 * @param message - Message to sign
 * @returns Signature string (0x-prefixed hex)
 *
 * @example
 * // With ethers.js v6
 * const signTypedData: SignTypedDataCallback = async (domain, types, message) => {
 *   return await signer.signTypedData(domain, types, message);
 * };
 *
 * @example
 * // With viem
 * const signTypedData: SignTypedDataCallback = async (domain, types, message) => {
 *   return await walletClient.signTypedData({ domain, types, message, account });
 * };
 *
 * @example
 * // With raw MetaMask
 * const signTypedData: SignTypedDataCallback = async (domain, types, message) => {
 *   const typedData = JSON.stringify({ domain, types, message, primaryType: Object.keys(types)[0] });
 *   return await window.ethereum.request({
 *     method: 'eth_signTypedData_v4',
 *     params: [userAddress, typedData]
 *   });
 * };
 */
export type SignTypedDataCallback = (
  domain: EIP712Domain,
  types: EIP712Types,
  message: EIP712Message,
) => Promise<string>;

/**
 * Callback for getting the current user's address
 *
 * @returns User address (0x-prefixed hex, checksummed)
 *
 * @example
 * // With ethers.js v6
 * const getAddress: GetAddressCallback = async () => {
 *   return await signer.getAddress();
 * };
 *
 * @example
 * // With viem
 * const getAddress: GetAddressCallback = async () => {
 *   return walletClient.account.address;
 * };
 *
 * @example
 * // With raw MetaMask
 * const getAddress: GetAddressCallback = async () => {
 *   const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
 *   return accounts[0];
 * };
 */
export type GetAddressCallback = () => Promise<string>;

/**
 * Transaction request object (minimal subset needed for FHEVM operations)
 */
export interface TransactionRequest {
  to?: string;
  from?: string;
  data?: string;
  value?: bigint | string;
  gasLimit?: bigint | string;
  gasPrice?: bigint | string;
  maxFeePerGas?: bigint | string;
  maxPriorityFeePerGas?: bigint | string;
  nonce?: number;
  chainId?: number;
}

/**
 * Callback for sending a transaction
 *
 * @param tx - Transaction request
 * @returns Transaction hash (0x-prefixed hex)
 *
 * @example
 * // With ethers.js v6
 * const sendTransaction: SendTransactionCallback = async (tx) => {
 *   const response = await signer.sendTransaction(tx);
 *   return response.hash;
 * };
 *
 * @example
 * // With viem
 * const sendTransaction: SendTransactionCallback = async (tx) => {
 *   return await walletClient.sendTransaction({
 *     to: tx.to,
 *     data: tx.data,
 *     value: tx.value ? BigInt(tx.value) : undefined,
 *     account: walletClient.account
 *   });
 * };
 *
 * @example
 * // With raw MetaMask
 * const sendTransaction: SendTransactionCallback = async (tx) => {
 *   return await window.ethereum.request({
 *     method: 'eth_sendTransaction',
 *     params: [{ to: tx.to, from: tx.from, data: tx.data, value: tx.value }]
 *   });
 * };
 */
export type SendTransactionCallback = (tx: TransactionRequest) => Promise<string>;

/**
 * Bundle of wallet callbacks required for FHEVM operations
 */
export interface WalletCallbacks {
  /** Sign EIP-712 typed data */
  signTypedData: SignTypedDataCallback;
  /** Get current user address */
  getAddress: GetAddressCallback;
  /** Send transaction (optional, only needed for encryption operations) */
  sendTransaction?: SendTransactionCallback;
}

/**
 * Helper to create wallet callbacks from ethers.js v6 signer
 *
 * @param signer - Ethers.js JsonRpcSigner
 * @returns WalletCallbacks object
 *
 * @example
 * ```typescript
 * import { BrowserProvider } from 'ethers';
 * import { createEthersCallbacks } from '@fhevm-sdk/types';
 *
 * const provider = new BrowserProvider(window.ethereum);
 * const signer = await provider.getSigner();
 * const callbacks = createEthersCallbacks(signer);
 * ```
 */
export function createEthersCallbacks(signer: any): WalletCallbacks {
  return {
    signTypedData: async (domain, types, message) => {
      return await signer.signTypedData(domain, types, message);
    },
    getAddress: async () => {
      return await signer.getAddress();
    },
    sendTransaction: async (tx) => {
      const response = await signer.sendTransaction(tx);
      return response.hash;
    },
  };
}

/**
 * Helper to create wallet callbacks from viem wallet client
 *
 * @param walletClient - Viem wallet client with account
 * @returns WalletCallbacks object
 *
 * @example
 * ```typescript
 * import { createWalletClient, custom } from 'viem';
 * import { mainnet } from 'viem/chains';
 * import { createViemCallbacks } from '@fhevm-sdk/types';
 *
 * const walletClient = createWalletClient({
 *   chain: mainnet,
 *   transport: custom(window.ethereum),
 *   account: '0x...'
 * });
 *
 * const callbacks = createViemCallbacks(walletClient);
 * ```
 */
export function createViemCallbacks(walletClient: any): WalletCallbacks {
  return {
    signTypedData: async (domain, types, message) => {
      return await walletClient.signTypedData({
        domain,
        types,
        message,
        account: walletClient.account,
        primaryType: Object.keys(types)[0],
      });
    },
    getAddress: async () => {
      return walletClient.account.address;
    },
    sendTransaction: async (tx) => {
      return await walletClient.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value ? BigInt(tx.value) : undefined,
        account: walletClient.account,
      });
    },
  };
}

/**
 * Helper to create wallet callbacks from raw window.ethereum (MetaMask)
 *
 * @param ethereum - window.ethereum object
 * @param userAddress - User's address (0x-prefixed)
 * @returns WalletCallbacks object
 *
 * @example
 * ```typescript
 * import { createMetaMaskCallbacks } from '@fhevm-sdk/types';
 *
 * const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
 * const callbacks = createMetaMaskCallbacks(window.ethereum, accounts[0]);
 * ```
 */
export function createMetaMaskCallbacks(ethereum: any, userAddress: string): WalletCallbacks {
  return {
    signTypedData: async (domain, types, message) => {
      const primaryType = Object.keys(types)[0];
      const typedData = JSON.stringify({
        domain,
        types: { ...types, EIP712Domain: [] }, // MetaMask expects EIP712Domain in types
        message,
        primaryType,
      });
      return await ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [userAddress, typedData],
      });
    },
    getAddress: async () => {
      return userAddress;
    },
    sendTransaction: async (tx) => {
      return await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          to: tx.to,
          from: userAddress,
          data: tx.data,
          value: tx.value ? `0x${BigInt(tx.value).toString(16)}` : undefined,
        }],
      });
    },
  };
}
