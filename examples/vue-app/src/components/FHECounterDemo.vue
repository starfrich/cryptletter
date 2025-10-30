<!-- FHECounterDemo.vue -->
<template>
  <div class="fhe-counter-demo">
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title text-3xl justify-center mb-2">🔐 FHE Counter Demo</h2>
        <p class="text-center text-base-content/70 mb-6">Fully Homomorphic Encryption on Ethereum</p>

        <!-- Debug Toggle Button -->
        <div class="flex justify-center mb-6 gap-2 flex-wrap">
          <button
            @click="handleDebugToggle"
            :class="isDebugMode ? 'btn-info' : 'btn-ghost'"
            class="btn btn-sm gap-2"
            title="Toggle debug mode"
          >
            🐛 Debug {{ isDebugMode ? 'ON' : 'OFF' }}
          </button>
        </div>

        <!-- FHEVM Instance Status -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold mb-3">FHEVM Instance</h3>
          <div class="badge badge-lg" :class="fhevmStatusBadgeClass">
            <span class="loading loading-spinner loading-xs mr-1" v-if="fhevmStatus === 'loading'"></span>
            {{ fhevmStatusText }}
          </div>
          <p v-if="fhevmError" class="text-error text-sm mt-2">{{ fhevmErrorMessage }}</p>
          <button
            v-if="fhevmStatus === 'error'"
            @click="refreshFhevm"
            class="btn btn-outline btn-sm mt-2"
          >
            Retry
          </button>
        </div>

        <!-- Counter Display -->
        <Transition name="fade">
          <div v-if="fhevmStatus === 'ready'" class="space-y-6">
            <div class="bg-base-200 rounded-lg p-6">
              <h3 class="text-lg font-semibold mb-4">Counter Value</h3>

              <!-- Encrypted Handle -->
              <div class="mb-4">
                <label class="label">
                  <span class="label-text font-medium">Encrypted Handle:</span>
                </label>
                <div class="flex items-center gap-2">
                  <code class="flex-1 bg-base-300 px-3 py-2 rounded" v-if="handle">{{ shortHandle }}</code>
                  <span v-else class="text-base-content/50 italic">No handle yet</span>
                  <button
                    @click="refreshCountHandle"
                    :disabled="!canGetCount || isRefreshing"
                    class="btn btn-ghost btn-sm"
                    title="Refresh"
                  >
                    <span class="loading loading-spinner loading-xs" v-if="isRefreshing"></span>
                    <span v-else>🔄</span>
                  </button>
                </div>
              </div>

              <!-- Decrypted Value with Animation -->
              <Transition name="slide-fade" mode="out-in">
                <div v-if="isDecrypted" class="text-center" key="decrypted">
                  <label class="label">
                    <span class="label-text font-medium">Decrypted Value:</span>
                  </label>
                  <div class="text-6xl font-bold text-primary my-4">{{ decryptedValue }}</div>
                </div>
                <div v-else class="text-center" key="encrypted">
                  <label class="label">
                    <span class="label-text font-medium">Decrypted Value:</span>
                  </label>
                  <div class="text-4xl font-bold text-base-content/50 my-4">🔒 Encrypted</div>
                  <button
                    @click="decryptCountHandle"
                    :disabled="!canDecrypt || isDecrypting"
                    class="btn btn-primary"
                  >
                    <span class="loading loading-spinner loading-sm" v-if="isDecrypting"></span>
                    <span v-else>Decrypt</span>
                  </button>
                </div>
              </Transition>
            </div>

            <!-- Counter Controls -->
            <div class="bg-base-200 rounded-lg p-6">
              <h4 class="text-lg font-semibold mb-4">Update Counter</h4>

              <!-- Input Group -->
              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-medium">Increment/Decrement Value:</span>
                </label>
                <input
                  v-model.number="inputValue"
                  type="number"
                  min="-100"
                  max="100"
                  class="input input-bordered"
                  :disabled="!canUpdateCounter || isProcessing"
                  @keyup.enter="handleUpdate"
                />
              </div>

              <!-- Quick Action Buttons -->
              <div class="grid grid-cols-2 gap-2 mb-4">
                <button
                  @click="handleIncrement(1)"
                  :disabled="!canUpdateCounter || isProcessing"
                  class="btn btn-success"
                >
                  +1
                </button>
                <button
                  @click="handleIncrement(5)"
                  :disabled="!canUpdateCounter || isProcessing"
                  class="btn btn-success"
                >
                  +5
                </button>
                <button
                  @click="handleDecrement(1)"
                  :disabled="!canUpdateCounter || isProcessing"
                  class="btn btn-error"
                >
                  -1
                </button>
                <button
                  @click="handleDecrement(5)"
                  :disabled="!canUpdateCounter || isProcessing"
                  class="btn btn-error"
                >
                  -5
                </button>
              </div>

              <!-- Custom Update Button -->
              <button
                @click="handleUpdate"
                :disabled="!canUpdateCounter || isProcessing || inputValue === 0"
                class="btn btn-primary w-full"
              >
                <span class="loading loading-spinner loading-sm" v-if="isProcessing"></span>
                <span v-else-if="inputValue > 0">Increment by {{ inputValue }}</span>
                <span v-else-if="inputValue < 0">Decrement by {{ Math.abs(inputValue) }}</span>
                <span v-else>Enter a value</span>
              </button>
            </div>

            <!-- Status Message with Transition -->
            <Transition name="slide-up">
              <div v-if="message" class="alert" :class="messageAlertClass">
                <span>{{ message }}</span>
              </div>
            </Transition>
          </div>
        </Transition>

        <!-- Not Connected State -->
        <div v-if="!isConnected" class="text-center py-8 text-base-content/60">
          <p>👆 Please connect your wallet to interact with the FHE Counter</p>
        </div>

        <!-- Wrong Network State -->
        <div v-if="isConnected && chainId !== 31337 && chainId !== 11155111" class="alert alert-warning">
          <span>⚠️ Please switch to Hardhat Local (31337) or Sepolia (11155111)</span>
        </div>
      </div>

      <!-- Global Error Alert -->
      <Transition name="slide-down">
        <div v-if="showErrorAlert" class="alert alert-error shadow-lg">
          <div class="flex-1">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4v2m0 0a9 9 0 110-18 9 9 0 010 18z"></path>
            </svg>
            <span>{{ globalErrorMessage }}</span>
          </div>
          <button @click="clearError" class="btn btn-sm btn-ghost">Close</button>
        </div>
      </Transition>

      <!-- Contract Info -->
      <div class="card-actions justify-end p-6 bg-base-200">
        <div class="collapse collapse-arrow border border-base-300 flex-1">
          <input type="checkbox" />
          <div class="collapse-title text-sm font-medium">Contract Details</div>
          <div class="collapse-content">
            <p class="text-sm"><strong>Contract Address:</strong></p>
            <code class="text-xs block bg-base-300 p-2 rounded mt-1">{{ contractAddress || 'Not deployed' }}</code>
            <p class="text-sm mt-2"><strong>Network:</strong> {{ networkName }}</p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useFhevm } from '@fhevm-sdk/vue'
import { useWallet } from '@/composables/useWallet'
import { useFHECounter } from '@/composables/useFHECounter'
import { useIndexedDBStorage } from '@/composables/useIndexedDBStorage'
import { useDebugMode } from '@/lib/utils/debugHelper'
import { useErrorHandler } from '@/lib/utils/errorHandler'
import config from '@/config' // Still needed for mockChains and targetNetworks in other parts

// Initialize utilities
const { initializeDebugMode, toggleDebugMode, isDebugEnabled } = useDebugMode()
const { errorMessage: globalErrorMessage, isVisible: showErrorAlert, clearError } = useErrorHandler()

// Debug mode state (local state to track UI, separate from SDK state)
const debugEnabled = ref(false)

// Initialize debug mode on component mount
onMounted(() => {
  initializeDebugMode()
  debugEnabled.value = isDebugEnabled()

  // Log component initialization
  console.log('🔐 FHECounterDemo component mounted')
  console.log('📝 Debug logs available in browser Developer Tools Console')
})

// Handle debug toggle
const handleDebugToggle = () => {
  const newState = toggleDebugMode()
  debugEnabled.value = newState
  console.log(`Debug mode ${newState ? 'enabled' : 'disabled'}`)
}

// Wallet connection
const { chainId, isConnected, provider, signer } = useWallet()

// Raw provider ref for FHEVM (avoid ethers wrapper to prevent "Cannot access private method")
const rawProvider = computed(() => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return window.ethereum as any
  }
  return undefined
})

// FHEVM instance - pass window.ethereum directly, not ethers wrapper
const {
  instance: fhevmInstance,
  status: fhevmStatus,
  error: fhevmError,
  errorMessage: fhevmErrorMessage,
  refresh: refreshFhevm,
} = useFhevm({
  provider: rawProvider, // Use raw provider
  chainId: chainId,
  enabled: computed(() => isConnected.value && rawProvider.value !== undefined),
  initialMockChains: config.mockChains,
  retry: {
    maxRetries: 3,
    retryDelay: 2000,
  },
  onSuccess: () => {
    console.log('FHEVM instance created successfully!')
  },
})

// Storage for decryption signatures (IndexedDB - persistent across page reloads)
const { storage: storageRef, error: storageError } = useIndexedDBStorage({
  dbName: 'fhevm-vue-app',
  storeName: 'signatures',
})

// Show storage initialization error if any
watch(storageError, (newError) => {
  if (newError) {
    console.warn('[FHECounterDemo] Storage initialization warning:', newError)
  }
})

// FHE Counter operations
const {
  contractAddress,
  handle,
  decryptedValue,
  isDecrypted,
  canGetCount,
  canDecrypt,
  canUpdateCounter,
  isRefreshing,
  isDecrypting,
  isProcessing,
  message,
  refreshCountHandle,
  decryptCountHandle,
  updateCounter,
} = useFHECounter({
  instance: fhevmInstance,
  chainId,
  signer,
  provider,
  storage: storageRef,  // Pass reactive ref for persistence across page reloads
  mockChains: config.mockChains,
})

// Input value (v-model binding)
const inputValue = ref(1)

// Debug mode controls
const isDebugMode = computed(() => debugEnabled.value)

// Update computed properties untuk DaisyUI classes
const fhevmStatusText = computed(() => {
  switch (fhevmStatus.value) {
    case 'idle': return 'Idle'
    case 'loading': return 'Loading...'
    case 'ready': return 'Ready ✓'
    case 'error': return 'Error'
    default: return fhevmStatus.value
  }
})

const fhevmStatusBadgeClass = computed(() => {
  switch (fhevmStatus.value) {
    case 'idle': return 'badge-outline'
    case 'loading': return 'badge-info badge-outline'
    case 'ready': return 'badge-success'
    case 'error': return 'badge-error'
    default: return 'badge-outline'
  }
})

const messageAlertClass = computed(() => {
  const msg = message.value.toLowerCase()
  if (msg.includes('error') || msg.includes('failed')) return 'alert-error'
  if (msg.includes('success') || msg.includes('completed')) return 'alert-success'
  return 'alert-info'
})

const shortHandle = computed(() => {
  if (!handle.value) return ''
  return `${handle.value.slice(0, 10)}...${handle.value.slice(-8)}`
})

const networkName = computed(() => {
  if (!chainId.value) return 'Unknown'
  const network = config.targetNetworks.find(n => n.id === chainId.value)
  return network?.name || `Chain ${chainId.value}`
})

// Action handlers
const handleIncrement = (value: number) => {
  inputValue.value = value
  updateCounter(value)
}

const handleDecrement = (value: number) => {
  inputValue.value = -value
  updateCounter(-value)
}

const handleUpdate = () => {
  if (inputValue.value !== 0) {
    updateCounter(inputValue.value)
  }
}

// Vue-specific: Watch handle changes and auto-clear decrypted value
watch(handle, (newHandle, oldHandle) => {
  if (newHandle !== oldHandle && newHandle) {
    console.log('Handle changed:', newHandle)
  }
})
</script>

<style scoped>
/* Custom transitions and animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from {
  transform: translateY(20px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(10px);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  transform: translateY(-10px);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>