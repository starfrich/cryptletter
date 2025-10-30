import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { useFHECounter } from '@/composables/useFHECounter'
import type { FhevmInstance } from '@fhevm-sdk/vue'

describe('useFHECounter composable', () => {
  const mockInstance = ref<FhevmInstance | undefined>(undefined)
  const mockChainId = ref<number | undefined>(31337)
  const mockSigner = ref(undefined)
  const mockProvider = ref(undefined)
  const mockStorage = {
    set: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockInstance.value = undefined
    mockChainId.value = 31337
    mockSigner.value = undefined
    mockProvider.value = undefined
  })

  it('should initialize with default values', () => {
    const counter = useFHECounter({
      instance: mockInstance,
      chainId: mockChainId,
      signer: mockSigner,
      provider: mockProvider,
      storage: mockStorage as any,
    })

    expect(counter.handle.value).toBeUndefined()
    expect(counter.decryptedValue.value).toBeUndefined()
    expect(counter.isDecrypted.value).toBe(false)
    expect(counter.message.value).toBeDefined()
  })

  it('should have loading state flags', () => {
    const counter = useFHECounter({
      instance: mockInstance,
      chainId: mockChainId,
      signer: mockSigner,
      provider: mockProvider,
      storage: mockStorage as any,
    })

    expect(typeof counter.isRefreshing.value).toBe('boolean')
    expect(typeof counter.isDecrypting.value).toBe('boolean')
    expect(typeof counter.isProcessing.value).toBe('boolean')
  })

  it('should have action methods', () => {
    const counter = useFHECounter({
      instance: mockInstance,
      chainId: mockChainId,
      signer: mockSigner,
      provider: mockProvider,
      storage: mockStorage as any,
    })

    expect(typeof counter.refreshCountHandle).toBe('function')
    expect(typeof counter.decryptCountHandle).toBe('function')
    expect(typeof counter.updateCounter).toBe('function')
  })

  it('should track contract address', () => {
    const counter = useFHECounter({
      instance: mockInstance,
      chainId: mockChainId,
      signer: mockSigner,
      provider: mockProvider,
      storage: mockStorage as any,
    })

    expect(counter.contractAddress).toBeDefined()
  })

  it('should have capability flags', () => {
    const counter = useFHECounter({
      instance: mockInstance,
      chainId: mockChainId,
      signer: mockSigner,
      provider: mockProvider,
      storage: mockStorage as any,
    })

    expect(typeof counter.canGetCount.value).toBe('boolean')
    expect(typeof counter.canDecrypt.value).toBe('boolean')
    expect(typeof counter.canUpdateCounter.value).toBe('boolean')
  })

  it('should handle invalid chain ID', () => {
    mockChainId.value = 999 // Invalid chain

    const counter = useFHECounter({
      instance: mockInstance,
      chainId: mockChainId,
      signer: mockSigner,
      provider: mockProvider,
      storage: mockStorage as any,
    })

    expect(counter.contractAddress.value).toBeUndefined()
  })

  it('should not allow operations without provider/signer', () => {
    mockChainId.value = 31337
    mockProvider.value = undefined
    mockSigner.value = undefined

    const counter = useFHECounter({
      instance: mockInstance,
      chainId: mockChainId,
      signer: mockSigner,
      provider: mockProvider,
      storage: mockStorage as any,
    })

    expect(counter.canGetCount.value).toBe(false)
    expect(counter.canUpdateCounter.value).toBe(false)
  })
})
