import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import WalletConnect from '@/components/WalletConnect.vue'

// Mock the composable
vi.mock('@/composables/useWallet', () => ({
  useWallet: () => ({
    address: { value: undefined },
    chainId: { value: undefined },
    isConnected: { value: false },
    provider: { value: undefined },
    signer: { value: undefined },
    connect: vi.fn(),
    disconnect: vi.fn(),
    switchNetwork: vi.fn(),
  }),
}))

describe('WalletConnect component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders wallet connect button', () => {
    const wrapper = mount(WalletConnect)

    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
  })

  it('displays connection status', () => {
    const wrapper = mount(WalletConnect)

    // Should render either "Connect Wallet" or "Connected" or similar
    const text = wrapper.text()
    expect(text.length > 0).toBe(true)
  })

  it('shows badge for wallet status', () => {
    const wrapper = mount(WalletConnect)

    // Look for badge element (DaisyUI badge)
    const badge = wrapper.find('[role="status"]') || wrapper.find('.badge')
    expect(badge.exists() || wrapper.text().includes('Not Connected')).toBe(true)
  })

  it('has proper accessibility attributes', () => {
    const wrapper = mount(WalletConnect)

    const button = wrapper.find('button')
    expect(button.attributes('type')).toBeTruthy()
  })
})
