import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  css: {
    postcss: './postcss.config.js',
  },
  resolve: {
    alias: {
      '@fhevm-sdk/vanilla': resolve(__dirname, '../../packages/fhevm-sdk/dist/vanilla/index.js'),
      '@fhevm-sdk/core': resolve(__dirname, '../../packages/fhevm-sdk/dist/core/index.js'),
      '@fhevm-sdk': resolve(__dirname, '../../packages/fhevm-sdk/dist/index.js'),
      'buffer': 'buffer/',
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    port: 5173,
  },
})