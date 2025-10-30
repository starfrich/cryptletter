/**
 * useWallet - Vue composable for wallet connection
 *
 * This composable provides wallet connection functionality similar to Wagmi's useAccount + useWalletClient.
 * It manages MetaMask/wallet connection, network switching, and provides ethers.js interop.
 */

import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'
import { ethers } from 'ethers'

export interface UseWalletOptions {
  /** Target chain ID to connect to */
  chainId?: number
  /** Auto-connect on mount if previously connected */
  autoConnect?: boolean
}

export interface UseWalletReturn {
  /** Current wallet address */
  address: Ref<string | undefined>
  /** Current chain ID */
  chainId: Ref<number | undefined>
  /** Connection status */
  isConnected: Ref<boolean>
  /** Loading state */
  isConnecting: Ref<boolean>
  /** Error state */
  error: Ref<Error | undefined>
  /** Ethers provider (read-only) */
  provider: Ref<any>
  /** Ethers signer (write operations) */
  signer: Ref<any>
  /** Connect wallet */
  connect: () => Promise<void>
  /** Disconnect wallet */
  disconnect: () => void
  /** Switch to a different network */
  switchNetwork: (targetChainId: number) => Promise<void>
}

export function useWallet(options: UseWalletOptions = {}): UseWalletReturn {
  const { chainId: targetChainId, autoConnect = true } = options

  // State
  const address = ref<string | undefined>(undefined)
  const chainId = ref<number | undefined>(undefined)
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const error = ref<Error | undefined>(undefined)
  const provider = ref<ethers.BrowserProvider | undefined>(undefined)
  const signer = ref<ethers.Signer | undefined>(undefined)

  // Check if window.ethereum is available
  const ethereum = computed(() => window.ethereum)

  // Initialize provider and signer
  const initializeProvider = async () => {
    if (!ethereum.value) {
      error.value = new Error('No Ethereum provider found. Please install MetaMask.')
      return
    }

    try {
      const browserProvider = new ethers.BrowserProvider(ethereum.value as any)
      provider.value = browserProvider

      // Get signer
      const ethSigner = await browserProvider.getSigner()
      signer.value = ethSigner

      // Get address
      const addr = await ethSigner.getAddress()
      address.value = addr

      // Get network
      const network = await browserProvider.getNetwork()
      chainId.value = Number(network.chainId)

      isConnected.value = true
      error.value = undefined
    } catch (e) {
      error.value = e as Error
      isConnected.value = false
    }
  }

  // Connect wallet
  const connect = async () => {
    if (!ethereum.value) {
      error.value = new Error('No Ethereum provider found. Please install MetaMask.')
      return
    }

    isConnecting.value = true
    error.value = undefined

    try {
      // Request account access
      await ethereum.value.request({ method: 'eth_requestAccounts' })

      await initializeProvider()

      // Switch to target network if specified
      if (targetChainId && chainId.value !== targetChainId) {
        await switchNetwork(targetChainId)
      }

      // Store connection state
      localStorage.setItem('walletConnected', 'true')
    } catch (e) {
      error.value = e as Error
      isConnected.value = false
    } finally {
      isConnecting.value = false
    }
  }

  // Disconnect wallet
  const disconnect = () => {
    address.value = undefined
    chainId.value = undefined
    provider.value = undefined
    signer.value = undefined
    isConnected.value = false
    error.value = undefined
    localStorage.removeItem('walletConnected')
  }

  // Switch network
  const switchNetwork = async (targetChainId: number) => {
    if (!ethereum.value) {
      error.value = new Error('No Ethereum provider found')
      return
    }

    try {
      // Convert chainId to hex
      const chainIdHex = '0x' + targetChainId.toString(16)

      await ethereum.value.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      })

      // Update chain ID after switch
      const network = await provider.value?.getNetwork()
      if (network) {
        chainId.value = Number(network.chainId)
      }
    } catch (e: any) {
      // Error code 4902 means the chain hasn't been added to MetaMask
      if (e.code === 4902) {
        error.value = new Error(`Network ${targetChainId} not found. Please add it to MetaMask.`)
      } else {
        error.value = e as Error
      }
    }
  }

  // Event handlers
  const handleAccountsChanged = (accounts: unknown) => {
    const accountsArray = accounts as string[]
    if (accountsArray.length === 0) {
      disconnect()
    } else {
      address.value = accountsArray[0]
      // Re-initialize to get new signer
      initializeProvider()
    }
  }

  const handleChainChanged = (newChainId: unknown) => {
    const chainIdNumber = typeof newChainId === 'string'
      ? parseInt(newChainId, 16)
      : Number(newChainId)

    chainId.value = chainIdNumber

    // Re-initialize provider for new network
    initializeProvider()
  }

  const handleDisconnect = () => {
    disconnect()
  }

  // Setup event listeners
  onMounted(() => {
    if (ethereum.value && ethereum.value.on) {
      ethereum.value.on('accountsChanged', handleAccountsChanged)
      ethereum.value.on('chainChanged', handleChainChanged)
      ethereum.value.on('disconnect', handleDisconnect)
    }

    // Auto-connect if previously connected
    if (autoConnect && localStorage.getItem('walletConnected') === 'true') {
      connect()
    }
  })

  // Cleanup event listeners
  onUnmounted(() => {
    if (ethereum.value && ethereum.value.removeListener) {
      ethereum.value.removeListener('accountsChanged', handleAccountsChanged)
      ethereum.value.removeListener('chainChanged', handleChainChanged)
      ethereum.value.removeListener('disconnect', handleDisconnect)
    }
  })

  return {
    address,
    chainId,
    isConnected,
    isConnecting,
    error,
    provider,
    signer,
    connect,
    disconnect,
    switchNetwork,
  }
}
