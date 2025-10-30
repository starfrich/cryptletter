import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import FHECounterDemo from '@/components/FHECounterDemo.vue'

// Mock composables
vi.mock('@/composables/useWallet', () => ({
  useWallet: () => ({
    address: { value: undefined },
    chainId: { value: undefined },
    isConnected: { value: false },
    provider: { value: undefined },
    signer: { value: undefined },
  }),
}))

vi.mock('@/composables/useIndexedDBStorage', () => ({
  useIndexedDBStorage: () => ({
    storage: { value: { get: vi.fn(), set: vi.fn(), remove: vi.fn() } },
    isReady: { value: true },
    error: { value: undefined },
  }),
}))

vi.mock('@fhevm-sdk/vue', () => ({
  useFhevm: () => ({
    instance: { value: undefined },
    status: { value: 'idle' },
    error: { value: undefined },
    errorMessage: { value: undefined },
    refresh: vi.fn(),
  }),
}))

vi.mock('@/composables/useFHECounter', () => ({
  useFHECounter: () => ({
    contractAddress: { value: undefined },
    handle: { value: undefined },
    decryptedValue: { value: undefined },
    isDecrypted: { value: false },
    canGetCount: { value: false },
    canDecrypt: { value: false },
    canUpdateCounter: { value: false },
    isRefreshing: { value: false },
    isDecrypting: { value: false },
    isProcessing: { value: false },
    message: { value: '' },
    refreshCountHandle: vi.fn(),
    decryptCountHandle: vi.fn(),
    updateCounter: vi.fn(),
  }),
}))

describe('FHECounterDemo component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without errors', () => {
    const wrapper = mount(FHECounterDemo)

    expect(wrapper.exists()).toBe(true)
  })

  it('shows wallet connection message when not connected', () => {
    const wrapper = mount(FHECounterDemo)

    const text = wrapper.text()
    expect(text.includes('connect') || text.includes('Connect')).toBe(true)
  })

  it('renders FHEVM status badge', () => {
    const wrapper = mount(FHECounterDemo)

    // Should contain FHEVM in the text
    expect(wrapper.text().includes('FHEVM')).toBe(true)
  })

  it('renders counter demo title', () => {
    const wrapper = mount(FHECounterDemo)

    expect(wrapper.text().includes('FHE Counter')).toBe(true)
  })

  it('has proper card structure', () => {
    const wrapper = mount(FHECounterDemo)

    // Should have DaisyUI card elements
    const card = wrapper.find('.card')
    expect(card.exists()).toBe(true)
  })

  it('displays not connected state', () => {
    const wrapper = mount(FHECounterDemo)

    // When not connected, should prompt to connect wallet
    const text = wrapper.text().toLowerCase()
    expect(text.includes('connect') || text.includes('wallet')).toBe(true)
  })
})
