/**
 * Core FHEVM SDK Exports
 *
 * This module exports the framework-agnostic core functionality of the FHEVM SDK.
 * These exports can be used in any JavaScript/TypeScript environment (React, Vue, Node.js, etc.)
 */

// Core functionality
export * from "./types";
export * from "./instance";
export * from "./instance-node"; // Node.js-specific implementation
export * from "./encryption";
export * from "./decryption";

// Legacy exports for backwards compatibility
// TODO: These should be removed in v2.0 once all consumers migrate to new API
export * from "../internal/fhevm";
export * from "../internal/RelayerSDKLoader";
export * from "../internal/PublicKeyStorage";
export * from "../internal/fhevmTypes";
export * from "../internal/constants";

