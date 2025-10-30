/**
 * Vue 3 Application Entry Point
 *
 * This is the main entry file that initializes the Vue application.
 */

// Polyfill Buffer for browser environment (required by fhevmjs)
import { Buffer } from 'buffer'
globalThis.Buffer = Buffer

import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

const app = createApp(App)

// Mount the application
app.mount('#app')

// Log initialization
console.log('🚀 FHEVM Vue Example initialized')
console.log('📦 Using @fhevm-sdk/vue adapter')
