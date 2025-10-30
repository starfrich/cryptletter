<!-- WalletConnect.vue -->
<template>
  <div class="wallet-connect">
    <!-- Connected State -->
    <div v-if="isConnected" class="flex items-center gap-2">
      <!-- Network Switcher Dropdown -->
      <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="btn btn-sm gap-2">
          <span class="badge badge-sm" :class="networkBadgeClass">
            {{ networkIcon }}
          </span>
          {{ networkName }}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        <ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-200 rounded-box w-52 mt-1 z-10">
          <li v-for="network in availableNetworks" :key="network.id">
            <button
              @click="handleNetworkSwitch(network.id)"
              :disabled="chainId === network.id"
              :class="chainId === network.id ? 'active' : ''"
            >
              <span class="badge badge-sm" :class="getNetworkBadgeClass(network.id)">
                {{ getNetworkIcon(network.id) }}
              </span>
              {{ network.name }}
              <span v-if="chainId === network.id" class="ml-auto">✓</span>
            </button>
          </li>
        </ul>
      </div>

      <!-- Address Badge -->
      <div class="badge badge-lg gap-1">
        <span class="text-lg">👤</span>
        {{ shortAddress }}
      </div>

      <!-- Disconnect Button -->
      <button @click="disconnect" class="btn btn-outline btn-sm">
        Disconnect
      </button>
    </div>

    <!-- Disconnected State -->
    <div v-else class="flex flex-col items-center gap-2">
      <button
        @click="connect"
        :disabled="isConnecting"
        class="btn btn-primary"
      >
        <span class="loading loading-spinner loading-sm" v-if="isConnecting"></span>
        <span v-else>Connect Wallet</span>
      </button>
      <div v-if="error" class="alert alert-error alert-sm">
        <span>{{ error.message }}</span>
      </div>
      <div v-if="!hasEthereum" class="alert alert-info alert-sm">
        <span>Please install <a href="https://metamask.io/" target="_blank" class="link">MetaMask</a> to connect</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWallet } from '@/composables/useWallet'
import config from '@/config'

const {
  address,
  chainId,
  isConnected,
  isConnecting,
  error,
  connect,
  disconnect,
  switchNetwork,
} = useWallet({
  autoConnect: true,
})

// Check if ethereum is available
const hasEthereum = computed(() => typeof window !== 'undefined' && window.ethereum !== undefined)

// Available networks from config
const availableNetworks = computed(() => config.targetNetworks)

// Short address format (0x1234...5678)
const shortAddress = computed(() => {
  if (!address.value) return ''
  return `${address.value.slice(0, 6)}...${address.value.slice(-4)}`
})

// Network name
const networkName = computed(() => {
  if (!chainId.value) return 'Unknown'

  const network = config.targetNetworks.find(n => n.id === chainId.value)
  return network?.name || `Chain ${chainId.value}`
})

// Network icon
const networkIcon = computed(() => {
  if (!chainId.value) return '🔗'
  if (chainId.value === 31337) return '🏠'
  if (chainId.value === 11155111) return '🌐'
  return '🔗'
})

// Get network icon for specific chain
const getNetworkIcon = (networkId: number) => {
  if (networkId === 31337) return '🏠'
  if (networkId === 11155111) return '🌐'
  return '🔗'
}

// Network badge class for DaisyUI
const networkBadgeClass = computed(() => {
  return getNetworkBadgeClass(chainId.value)
})

// Get network badge class for specific chain
const getNetworkBadgeClass = (networkId: number | undefined) => {
  if (!networkId) return 'badge-ghost'

  // Hardhat local
  if (networkId === 31337) return 'badge-secondary'
  // Sepolia
  if (networkId === 11155111) return 'badge-accent'

  return 'badge-ghost'
}

// Handle network switch
const handleNetworkSwitch = async (targetChainId: number) => {
  if (chainId.value === targetChainId) return

  try {
    await switchNetwork(targetChainId)
    console.log(`Switched to network ${targetChainId}`)
  } catch (error) {
    console.error('Failed to switch network:', error)
  }
}
</script>

<style scoped>
.wallet-connect {
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style>
