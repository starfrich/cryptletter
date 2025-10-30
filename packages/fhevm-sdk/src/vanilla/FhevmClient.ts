import { createFhevmInstance } from "../core/instance";
import type { FhevmInstance } from "../core/types";
import type { EncryptResult, FhevmEncryptedType } from "../core/encryption";
import { encryptValue } from "../core/encryption";
import { decryptValue, type DecryptionSignature } from "../core/decryption";

/**
 * High-level status of the `FhevmClient` lifecycle.
 */
export type FhevmClientStatus =
  | "idle"
  | "initializing"
  | "ready"
  | "error"
  | "destroyed";

/**
 * Options for constructing a new `FhevmClient`.
 *
 * - `provider`: EIP-1193 provider or RPC URL string.
 * - `mockChains`: Optional overrides for mock chain detection and RPC URLs.
 * - `onStatusChange`: Callback invoked when the client status changes.
 */
export interface FhevmClientOptions {
  provider: any; // Eip1193Provider | string
  mockChains?: Record<number, string>;
  onStatusChange?: (status: FhevmClientStatus) => void;
}

/**
 * Parameters required for a single-value encryption operation.
 */
export interface EncryptParams {
  contractAddress: `0x${string}`;
  userAddress: `0x${string}`;
}

type EventHandler = (...args: any[]) => void;

/**
 * Framework-agnostic class-based client for FHEVM operations.
 *
 * This client manages the lifecycle of the underlying FHEVM instance and exposes
 * simple encrypt/decrypt helpers. It also provides a minimal event system for
 * observing status changes or relayer updates.
 */
export class FhevmClient {
  private options: FhevmClientOptions;
  private instance?: FhevmInstance;
  private status: FhevmClientStatus = "idle";
  private events: Map<string, Set<EventHandler>> = new Map();

  constructor(options: FhevmClientOptions) {
    this.options = options;
  }

  /**
   * Get the currently active FHEVM instance, if initialized.
   */
  getInstance(): FhevmInstance | undefined {
    return this.instance;
  }

  /**
   * Get the current high-level status of the client.
   */
  getStatus(): FhevmClientStatus {
    return this.status;
  }

  /**
   * Initialize the FHEVM instance. Safe to call multiple times; subsequent calls
   * are no-ops unless the client has been destroyed.
   *
   * @param abortSignal Optional AbortSignal to cancel initialization
   */
  async init(abortSignal?: AbortSignal): Promise<void> {
    if (this.status === "destroyed") return;
    this.updateStatus("initializing");

    const signal = abortSignal ?? new AbortController().signal;

    this.instance = await createFhevmInstance({
      provider: this.options.provider,
      mockChains: this.options.mockChains,
      signal,
      onStatusChange: () => {
        // Bubble low-level relayer statuses as generic initializing events
        this.emit("relayer:status", []);
      },
    });

    this.updateStatus("ready");
  }

  /**
   * Encrypt a single value using the underlying FHEVM instance.
   *
   * @param value Number, boolean, or string (for eaddress)
   * @param type FHEVM encrypted type (e.g. "euint32", "ebool")
   * @param params Contract and user addresses
   * @returns EncryptResult containing handles and input proof
   */
  async encrypt(
    value: number | boolean | string,
    type: FhevmEncryptedType,
    params: EncryptParams
  ): Promise<EncryptResult> {
    if (!this.instance) throw new Error("FhevmClient not initialized");
    return encryptValue(
      this.instance,
      params.contractAddress,
      params.userAddress,
      value,
      type
    );
  }

  /**
   * Decrypt a single encrypted handle.
   *
   * @param handle Encrypted handle as hex string
   * @param contractAddress Contract address associated with the handle
   * @param signature Decryption signature parameters
   * @returns Decrypted value or undefined if decryption failed
   */
  async decrypt(
    handle: string,
    contractAddress: `0x${string}`,
    signature: DecryptionSignature
  ) {
    if (!this.instance) throw new Error("FhevmClient not initialized");
    return decryptValue(this.instance, handle, contractAddress, signature);
  }

  /**
   * Register an event handler.
   *
   * Known events:
   * - "status": (status: FhevmClientStatus) => void
   * - "relayer:status": () => void (low-level status tick)
   */
  on(event: string, handler: EventHandler): void {
    if (!this.events.has(event)) this.events.set(event, new Set());
    this.events.get(event)!.add(handler);
  }

  /**
   * Remove a previously registered event handler.
   */
  off(event: string, handler: EventHandler): void {
    this.events.get(event)?.delete(handler);
  }

  /**
   * Destroy the client, release references, and transition to "destroyed".
   */
  destroy(): void {
    this.instance = undefined;
    this.events.clear();
    this.updateStatus("destroyed");
  }

  /**
   * Emit an event to local subscribers. Internal utility.
   */
  private emit(event: string, args: any[]): void {
    const set = this.events.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(...args);
      } catch {
        // ignore handler errors to avoid breaking emitter
      }
    }
  }

  /**
   * Transition to a new status and notify listeners.
   */
  private updateStatus(status: FhevmClientStatus): void {
    this.status = status;
    this.options.onStatusChange?.(status);
    this.emit("status", [status]);
  }
}


