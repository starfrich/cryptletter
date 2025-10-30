import { vi } from 'vitest'
import 'fake-indexeddb/auto'

// Mock window.ethereum for wallet testing
const mockEthereum = {
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  isMetaMask: true,
}

Object.defineProperty(window, 'ethereum', {
  value: mockEthereum,
  writable: true,
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}
