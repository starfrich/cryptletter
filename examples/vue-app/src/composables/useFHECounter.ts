/**
 * useFHECounter - Vue composable for FHE Counter operations
 *
 * This composable provides complete FHE Counter functionality:
 * - Reading encrypted counter value
 * - Encrypting and sending increment/decrement operations
 * - Decrypting counter values
 *
 * It mirrors the pattern from useFHECounterWagmi in the Next.js example.
 */

import { ref, computed, watch, onMounted, type Ref } from 'vue'
import { ethers } from 'ethers'
// Import Vue composables from @fhevm-sdk/vue
import type { FhevmInstance } from '@fhevm-sdk/vue'
import {
  buildParamsFromAbi,
  getEncryptionMethod,
  useFHEDecrypt,
  useFHEEncryption,
} from '@fhevm-sdk/vue'
import { deployedContracts } from '@/contracts/deployedContracts'
import type { SupportedChainId } from '@/contracts/deployedContracts'
import { useWalletCallbacks } from './useWalletCallbacks'
import type { IFhevmStorage } from '@fhevm-sdk/vue'
import { useErrorHandler } from '@/lib/utils/errorHandler'
import { useRetry } from '@/lib/utils/retryHelper'
import { useValidation } from '@/lib/utils/validationHelper'
import { logDebug, logError } from '@/lib/utils/debugHelper'

export interface UseFHECounterParams {
  /** FHEVM instance */
  instance: Ref<FhevmInstance | undefined>
  /** Chain ID */
  chainId: Ref<number | undefined>
  /** Contract address (optional, will use deployed address if not provided) */
  contractAddress?: Ref<`0x${string}` | undefined>
  /** Ethers signer for write operations */
  signer: Ref<ethers.Signer | undefined>
  /** Ethers provider for read operations */
  provider: Ref<ethers.BrowserProvider | undefined>
  /** Storage for decryption signatures (reactive ref for persistence) */
  storage: Ref<IFhevmStorage>
  /** Mock chains for local testing */
  mockChains?: Record<number, string>
}

export interface UseFHECounterReturn {
  // Contract info
  contractAddress: Ref<`0x${string}` | undefined>

  // Counter state
  handle: Ref<string | undefined>
  decryptedValue: Ref<bigint | undefined>
  isDecrypted: Ref<boolean>

  // Status flags
  canGetCount: Ref<boolean>
  canDecrypt: Ref<boolean>
  canUpdateCounter: Ref<boolean>

  // Loading states
  isRefreshing: Ref<boolean>
  isDecrypting: Ref<boolean>
  isProcessing: Ref<boolean>

  // Status message
  message: Ref<string>

  // Actions
  refreshCountHandle: () => Promise<void>
  decryptCountHandle: () => Promise<void>
  updateCounter: (value: number) => Promise<void>
}

export function useFHECounter(params: UseFHECounterParams): UseFHECounterReturn {
  const { instance, chainId, signer, provider, storage } = params

  // Initialize utility composables
  const { handleError, shouldRetry: shouldRetryError, isUserError } = useErrorHandler()
  const { retryWithProgress, retryNetworkCall } = useRetry()
  const { validateAddress: validateAddr } = useValidation()

  // Use debug helpers with alias for consistency
  const logErrorMsg = logError

  // Create wallet callbacks from signer
  const { signTypedData, getAddress: getAddressCallback } = useWalletCallbacks({ signer })

  // Resolve contract info
  const contractInfo = computed(() => {
    const chain = chainId.value as SupportedChainId | undefined
    if (!chain || !(chain in deployedContracts)) return undefined
    return deployedContracts[chain].FHECounter
  })

  const contractAddress = computed<`0x${string}` | undefined>(() => {
    if (params.contractAddress?.value) return params.contractAddress.value
    return contractInfo.value?.address as `0x${string}` | undefined
  })

  const contractAbi = computed(() => contractInfo.value?.abi)

  // State
  const handle = ref<string | undefined>(undefined)
  const isRefreshing = ref(false)
  const isProcessing = ref(false)
  const message = ref('')
  const userAddress = ref<string | undefined>(undefined)

  // Watch signer and get address (cache it to avoid repeated calls)
  watch(signer, async (newSigner) => {
    if (newSigner) {
      try {
        userAddress.value = await newSigner.getAddress()
      } catch (e) {
        console.error('Failed to get address from signer:', e)
        userAddress.value = undefined
      }
    } else {
      userAddress.value = undefined
    }
  }, { immediate: true })

  // Check if we can perform operations
  const hasContract = computed(() => Boolean(contractAddress.value && contractAbi.value))
  const hasProvider = computed(() => Boolean(provider.value))
  const hasSigner = computed(() => Boolean(signer.value))
  const canGetCount = computed(() => hasContract.value && hasProvider.value && !isRefreshing.value)
  const canUpdateCounter = computed(() => hasContract.value && Boolean(instance.value) && hasSigner.value && !isProcessing.value)

  // Read count handle from contract using raw provider (avoid ethers wrapper)
  const refreshCountHandle = async () => {
    if (!canGetCount.value) {
      const errorMsg = 'Cannot read count: contract or provider not available'
      message.value = errorMsg
      logDebug('refreshCountHandle blocked', { canGetCount: canGetCount.value })
      return
    }

    isRefreshing.value = true
    message.value = 'Reading encrypted count...'

    try {
      if (!contractAddress.value || !contractAbi.value) {
        const errorMsg = 'Contract not available'
        message.value = errorMsg
        logErrorMsg('refreshCountHandle error', new Error(errorMsg))
        return
      }

      // Use raw window.ethereum to avoid private method access
      const rawProvider = window.ethereum
      if (!rawProvider) {
        const errorMsg = 'No Ethereum provider found'
        message.value = errorMsg
        logErrorMsg('refreshCountHandle error', new Error(errorMsg))
        return
      }

      // Validate contract address
      if (!validateAddr(contractAddress.value)) {
        const errorMsg = `Invalid contract address: ${contractAddress.value}`
        message.value = errorMsg
        logErrorMsg('refreshCountHandle validation error', new Error(errorMsg))
        return
      }

      // Find getCount function signature
      const getCountAbi = contractAbi.value.find(
        (item: any) => item.type === 'function' && item.name === 'getCount'
      )

      if (!getCountAbi) {
        const errorMsg = 'getCount function not found in ABI'
        message.value = errorMsg
        logErrorMsg('refreshCountHandle error', new Error(errorMsg))
        return
      }

      // Create function selector (first 4 bytes of keccak256 hash of signature)
      const functionSignature = 'getCount()'
      const functionSelector = ethers.id(functionSignature).slice(0, 10)

      logDebug('Calling getCount with retry', { contractAddress: contractAddress.value })

      // Call contract directly using eth_call with retry
      const result = await retryNetworkCall(async () => {
        return await rawProvider.request({
          method: 'eth_call',
          params: [{
            to: contractAddress.value,
            data: functionSelector
          }, 'latest']
        })
      })

      handle.value = result as string
      message.value = 'Encrypted count retrieved'
      logDebug('refreshCountHandle success', { handle: handle.value })
    } catch (e) {
      const errorMsg = handleError(e)
      message.value = `Failed to read count: ${errorMsg}`
      logErrorMsg('refreshCountHandle caught error', e)

      // If retryable, could attempt auto-retry here in future
      if (shouldRetryError(e)) {
        logDebug('Error is retryable', { error: e })
      }
    } finally {
      isRefreshing.value = false
    }
  }

  // Use SDK's useFHEDecrypt hook
  const decryptRequests = computed(() => {
    if (!hasContract.value || !handle.value || handle.value === ethers.ZeroHash) return undefined
    return [{ handle: handle.value, contractAddress: contractAddress.value! }] as const
  })

  const {
    canDecrypt,
    decrypt,
    isDecrypting,
    message: decryptMessage,
    results: decryptResults,
  } = useFHEDecrypt({
    instance,
    signTypedData,
    getAddress: getAddressCallback,
    // Pass the current storage value - will be MemoryStorage initially, then IndexedDB
    // The storage instance itself handles persistence once it's IndexedDB
    fhevmDecryptionSignatureStorage: storage.value,
    chainId,
    requests: decryptRequests,
  })

  // Watch decrypt message and update main message
  watch(decryptMessage, (newMsg) => {
    if (newMsg) message.value = newMsg
  })

  // Extract decrypted value from results
  const decryptedValue = computed(() => {
    if (!handle.value) return undefined
    const result = decryptResults.value[handle.value]
    if (result === undefined) return undefined
    return BigInt(result as any)
  })

  const isDecrypted = computed(() => {
    return Boolean(handle.value && decryptedValue.value !== undefined)
  })

  const decryptCountHandle = async () => {
    // Don't throw errors from decrypt - let the retry logic handle it
    // The UI will show the error message from the decrypt composable
    try {
      await decrypt()
    } catch (error) {
      // Error is already handled by useFHEDecrypt and shown in UI via message
      // We just log it here for debugging
      logDebug('Decrypt error caught (will retry automatically)', { error })
    }
  }

  // Use SDK's useFHEEncryption hook
  // Create a stable callback function that always gets the latest value
  const getAddressStable = async () => {
    const callback = getAddressCallback.value
    if (!callback) throw new Error('getAddress callback not available')
    return await callback()
  }

  const { encryptWith } = useFHEEncryption({
    instance,
    getAddress: getAddressStable,
    contractAddress,
  })

  // Helper to get encryption method from ABI
  const getEncryptionMethodFor = (functionName: 'increment' | 'decrement') => {
    if (!contractAbi.value) {
      return { method: undefined, error: 'Contract ABI not available' }
    }

    const functionAbi = contractAbi.value.find(
      item => item.type === 'function' && item.name === functionName
    )

    if (!functionAbi) {
      return { method: undefined, error: `Function ABI not found for ${functionName}` }
    }

    if ((functionAbi as any).type === 'fallback' || (functionAbi as any).type === 'receive') {
      return { method: undefined, error: `Function ${functionName} is fallback or receive` }
    }

    if (!functionAbi.inputs || functionAbi.inputs.length === 0) {
      return { method: undefined, error: `No inputs found for ${functionName}` }
    }

    const firstInput = functionAbi.inputs[0]!
    if (!firstInput.internalType) {
      return { method: undefined, error: `No internalType for ${functionName} first input` }
    }

    return {
      method: getEncryptionMethod(firstInput.internalType),
      error: undefined
    }
  }

  // Update counter (increment/decrement) using raw provider
  const updateCounter = async (value: number) => {
    if (isProcessing.value || !canUpdateCounter.value || value === 0) {
      logDebug('updateCounter blocked', { isProcessing: isProcessing.value, canUpdateCounter: canUpdateCounter.value, value })
      return
    }

    const op = value > 0 ? 'increment' : 'decrement'
    const valueAbs = Math.abs(value)

    isProcessing.value = true
    message.value = `Starting ${op}(${valueAbs})...`

    try {
      if (!contractAddress.value || !contractAbi.value || !userAddress.value) {
        const errorMsg = 'Contract or user address not available'
        message.value = errorMsg
        logErrorMsg('updateCounter error', new Error(errorMsg))
        return
      }

      // Validate contract address and user address
      if (!validateAddr(contractAddress.value) || !validateAddr(userAddress.value)) {
        const errorMsg = 'Invalid contract or user address'
        message.value = errorMsg
        logErrorMsg('updateCounter validation error', new Error(errorMsg))
        return
      }

      logDebug(`Starting ${op} operation`, { value: valueAbs, userAddress: userAddress.value })

      // Get encryption method
      const { method, error: methodError } = getEncryptionMethodFor(op)
      if (!method) {
        const errorMsg = methodError ?? 'Encryption method not found'
        message.value = errorMsg
        logErrorMsg('updateCounter encryption method error', new Error(errorMsg))
        return
      }

      // Encrypt value with retry
      message.value = `Encrypting with ${method}...`
      logDebug('Encrypting value', { method, valueAbs })

      let enc
      try {
        enc = await retryWithProgress(
          `Encrypt ${op}`,
          async () => {
            logDebug('Calling encryptWith with method', { method, valueAbs })
            const result = await encryptWith((builder: any) => {
              logDebug('Builder received', { builder, hasMethod: typeof builder[method] })
              builder[method](valueAbs)
            })
            logDebug('encryptWith returned', { result })
            return result
          },
          { maxRetries: 2 }
        )
      } catch (error) {
        const errorMsg = `Encryption failed: ${error instanceof Error ? error.message : String(error)}`
        message.value = errorMsg
        logErrorMsg('updateCounter encryption caught error', error)
        return
      }

      if (!enc) {
        const errorMsg = 'Encryption failed: encryptWith returned null/undefined'
        message.value = errorMsg
        logErrorMsg('updateCounter encryption error', new Error(errorMsg))
        return
      }

      logDebug('Encryption successful', { encryptionType: method })

      // Build transaction data using ABI encoder
      const params = buildParamsFromAbi(enc, contractAbi.value as any, op)

      // Create interface to encode function call
      const iface = new ethers.Interface(contractAbi.value as any)
      const data = iface.encodeFunctionData(op, params)

      // Send transaction using raw provider
      const rawProvider = window.ethereum
      if (!rawProvider) {
        const errorMsg = 'No Ethereum provider found'
        message.value = errorMsg
        logErrorMsg('updateCounter provider error', new Error(errorMsg))
        return
      }

      message.value = 'Sending transaction...'
      logDebug('Sending transaction', { op, to: contractAddress.value, dataLength: data.length })

      const txHash = await retryNetworkCall(async () => {
        return await rawProvider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: userAddress.value,
            to: contractAddress.value,
            data: data,
          }]
        })
      })

      logDebug('Transaction sent', { txHash })
      message.value = 'Waiting for confirmation...'

      // Wait for transaction receipt with retry
      let receipt = null
      let attempts = 0
      const maxAttempts = 60 // 60 seconds timeout

      while (!receipt && attempts < maxAttempts) {
        try {
          receipt = await retryNetworkCall(async () => {
            return await rawProvider.request({
              method: 'eth_getTransactionReceipt',
              params: [txHash]
            })
          }, { maxRetries: 1 }) // Minimal retries for receipt polling

          if (!receipt) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            attempts++
            if (attempts % 10 === 0) {
              logDebug('Waiting for receipt', { attempts, txHash })
            }
          }
        } catch (e) {
          logErrorMsg('Error getting receipt', e)
          await new Promise(resolve => setTimeout(resolve, 1000))
          attempts++
        }
      }

      if (!receipt) {
        const errorMsg = 'Transaction timeout - check wallet for status'
        message.value = errorMsg
        logErrorMsg('updateCounter timeout', new Error(errorMsg))
        return
      }

      const successMsg = `${op}(${valueAbs}) completed!`
      message.value = successMsg
      logDebug('Transaction confirmed', { op, receipt })

      // Refresh count after successful operation
      await refreshCountHandle()
    } catch (e) {
      const errorMsg = handleError(e)
      message.value = `${op} failed: ${errorMsg}`
      logErrorMsg('updateCounter caught error', e)

      if (isUserError(e)) {
        logDebug('Error caused by user action', { error: e })
      }
    } finally {
      isProcessing.value = false
    }
  }

  // Auto-fetch count on mount if provider is ready
  onMounted(() => {
    if (canGetCount.value) {
      refreshCountHandle()
    }
  })

  // Watch for provider/contract changes and refetch
  watch([hasProvider, hasContract], ([newHasProvider, newHasContract]) => {
    if (newHasProvider && newHasContract) {
      refreshCountHandle()
    }
  })

  return {
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
  }
}
