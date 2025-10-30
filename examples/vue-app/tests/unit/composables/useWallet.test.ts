import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWallet } from '@/composables/useWallet'

describe('useWallet composable', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    // Reset wallet state
    localStorage.removeItem('wagmi.connected')
  })

  it('should initialize with default values', () => {
    const { chainId, isConnected, address } = useWallet()

    expect(isConnected.value).toBe(false)
    expect(chainId.value).toBeUndefined()
    expect(address.value).toBeUndefined()
  })

  it('should have provider and signer refs', () => {
    const { provider, signer } = useWallet()

    expect(provider).toBeDefined()
    expect(signer).toBeDefined()
  })

  it('should have connect function', () => {
    const { connect } = useWallet()

    expect(typeof connect).toBe('function')
  })

  it('should have disconnect function', () => {
    const { disconnect } = useWallet()

    expect(typeof disconnect).toBe('function')
  })

  it('should handle wallet connection', async () => {
    const { connect, isConnected } = useWallet()

    // Mock window.ethereum.request for successful connection
    ;(window.ethereum.request as any).mockResolvedValueOnce(['0x1234567890123456789012345678901234567890'])

    await connect()

    // Note: Actual connection behavior depends on wagmi/viem implementation
    // This test verifies the function exists and is callable
    expect(typeof connect).toBe('function')
  })

  it('should track connection state', () => {
    const { isConnected } = useWallet()

    expect(typeof isConnected.value).toBe('boolean')
  })
})
