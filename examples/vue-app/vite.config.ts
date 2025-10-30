import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // Map @fhevm-sdk subpath exports to actual files
      '@fhevm-sdk/vue': resolve(__dirname, '../../packages/fhevm-sdk/dist/vue/index.js'),
      '@fhevm-sdk/react': resolve(__dirname, '../../packages/fhevm-sdk/dist/react/index.js'),
      '@fhevm-sdk/storage': resolve(__dirname, '../../packages/fhevm-sdk/dist/storage/index.js'),
      '@fhevm-sdk/core': resolve(__dirname, '../../packages/fhevm-sdk/dist/core/index.js'),
      '@fhevm-sdk/utils': resolve(__dirname, '../../packages/fhevm-sdk/dist/utils/index.js'),
      '@fhevm-sdk': resolve(__dirname, '../../packages/fhevm-sdk/dist/index.js'),
      // Buffer polyfill for browser
      'buffer': 'buffer/',
    },
  },
  define: {
    // Polyfills for Node.js globals required by ethers/fhevm
    global: 'globalThis',
    'process.env': {},
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    port: 3001,
    open: true,
  },
})
