<!-- App.vue -->
<template>
  <div id="app" class="min-h-screen flex flex-col">
    <header class="navbar bg-base-200 border-b border-base-300 sticky top-0 z-50">
      <div class="navbar-start">
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-bold text-primary">
            ⚡ FHEVM Vue Example
          </h1>
        </div>
      </div>
      <div class="navbar-end">
        <WalletConnect />
      </div>
    </header>

    <main class="flex-1 p-4 md:p-8">
      <div class="container mx-auto max-w-6xl">
        <FHECounterDemo />
      </div>
    </main>

    <footer class="footer footer-center p-4 bg-base-200 text-base-content border-t border-base-300">
      <aside>
        <p>
          Built with
          <a href="https://docs.zama.ai/protocol" target="_blank" rel="noopener" class="link link-primary">
            Zama FHEVM
          </a>
          •
          <a href="https://vuejs.org/" target="_blank" rel="noopener" class="link link-primary">
            Vue 3
          </a>
          •
          <a href="https://github.com/zama-ai/fhevm-react-template" target="_blank" rel="noopener" class="link link-primary">
            GitHub
          </a>
        </p>
        <p class="text-sm text-base-content/60">
          This example demonstrates the FHEVM SDK Vue adapter for building privacy-preserving dApps
        </p>
      </aside>
    </footer>
  </div>
</template>

<script setup lang="ts">
import WalletConnect from './components/WalletConnect.vue'
import FHECounterDemo from './components/FHECounterDemo.vue'
</script>

<style>
.loading {
  animation: shimmer 2s infinite;
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.1) 100%
  );
  background-size: 1000px 100%;
}

@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}
</style>