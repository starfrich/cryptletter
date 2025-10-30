import type { App, Plugin, InjectionKey } from "vue";
import type { FhevmInstance } from "../core/types";
import { createFhevmInstance } from "../core/instance";
import { ethers } from "ethers";

/**
 * Injection key for FHEVM instance
 * Use this with inject() to access the global FHEVM instance
 *
 * @example
 * ```typescript
 * import { inject } from 'vue';
 * import { FhevmInjectionKey } from '@fhevm-sdk/vue';
 *
 * const fhevm = inject(FhevmInjectionKey);
 * ```
 */
export const FhevmInjectionKey: InjectionKey<FhevmInstance> = Symbol("fhevm");

/**
 * Options for configuring the FHEVM plugin
 */
export interface FhevmPluginOptions {
  /** Ethereum provider (EIP-1193) or RPC URL */
  provider: string | ethers.Eip1193Provider;
  /** Mock chain configurations for local testing */
  mockChains?: Record<number, string>;
  /** Automatically create instance on plugin install (default: true) */
  autoInit?: boolean;
  /** Callback fired when instance is successfully created */
  onSuccess?: (instance: FhevmInstance) => void;
  /** Callback fired when instance creation fails */
  onError?: (error: Error) => void;
}

/**
 * FHEVM Vue Plugin
 *
 * Provides global FHEVM instance through Vue's provide/inject system.
 * This allows you to access the FHEVM instance from any component without prop drilling.
 *
 * @example
 * ```typescript
 * // main.ts
 * import { createApp } from 'vue';
 * import { FhevmPlugin } from '@fhevm-sdk/vue';
 * import App from './App.vue';
 *
 * const app = createApp(App);
 *
 * app.use(FhevmPlugin, {
 *   provider: window.ethereum,
 *   mockChains: { 31337: 'http://localhost:8545' },
 *   onSuccess: (instance) => console.log('FHEVM ready!'),
 *   onError: (error) => console.error('FHEVM failed:', error)
 * });
 *
 * app.mount('#app');
 * ```
 *
 * @example
 * ```typescript
 * // Component usage
 * import { inject } from 'vue';
 * import { FhevmInjectionKey } from '@fhevm-sdk/vue';
 *
 * export default {
 *   setup() {
 *     const fhevmInstance = inject(FhevmInjectionKey);
 *     return { fhevmInstance };
 *   }
 * };
 * ```
 */
export const FhevmPlugin: Plugin<FhevmPluginOptions> = {
  install(app: App, options: FhevmPluginOptions) {
    const { provider, mockChains, autoInit = true, onSuccess, onError } = options;

    // Validate options
    if (!provider) {
      throw new Error("[FhevmPlugin] provider is required");
    }

    // Store a placeholder initially
    let fhevmInstance: FhevmInstance | null = null;

    // Provide a reactive way to access the instance
    // Note: For simplicity, we provide the instance directly
    // In a more advanced setup, you could provide a reactive ref
    const provideInstance = (instance: FhevmInstance) => {
      fhevmInstance = instance;
      app.provide(FhevmInjectionKey, instance);
    };

    // Auto-initialize if enabled
    if (autoInit) {
      const abortController = new AbortController();

      createFhevmInstance({
        signal: abortController.signal,
        provider: provider as any,
        mockChains: mockChains as any,
        onStatusChange: (status) => {
          console.log(`[FhevmPlugin] Instance creation status: ${status}`);
        },
      })
        .then((instance) => {
          provideInstance(instance);
          if (onSuccess) {
            try {
              onSuccess(instance);
            } catch (callbackError) {
              console.error("[FhevmPlugin] onSuccess callback error:", callbackError);
            }
          }
        })
        .catch((error) => {
          console.error("[FhevmPlugin] Failed to create FHEVM instance:", error);
          if (onError) {
            try {
              onError(error);
            } catch (callbackError) {
              console.error("[FhevmPlugin] onError callback error:", callbackError);
            }
          }
        });
    }

    // Add global properties (optional)
    // This allows accessing via this.$fhevm in Options API
    app.config.globalProperties.$fhevm = fhevmInstance;
  },
};

/**
 * Type augmentation for Vue global properties
 * This enables TypeScript support for this.$fhevm in Options API
 *
 * Note: To enable type support, add the following to your project's .d.ts file:
 *
 * ```typescript
 * import type { FhevmInstance } from '@fhevm-sdk/vue';
 *
 * declare module '@vue/runtime-core' {
 *   export interface ComponentCustomProperties {
 *     $fhevm: FhevmInstance | null;
 *   }
 * }
 * ```
 */

// Type augmentation is commented out to avoid build errors when Vue is not installed
// Users should add this to their own project's type definitions
/*
declare module "@vue/runtime-core" {
  export interface ComponentCustomProperties {
    $fhevm: FhevmInstance | null;
  }
}
*/
