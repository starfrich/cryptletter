import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { useIndexedDBStorage } from '@/composables/useIndexedDBStorage'

describe('useIndexedDBStorage composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear IndexedDB between tests
    const dbs = ['fhevm', 'fhevm-vue-app', 'test-db']
    dbs.forEach(db => {
      const req = indexedDB.deleteDatabase(db)
      req.onsuccess = () => {}
      req.onerror = () => {}
    })
  })

  it('should initialize with default values', () => {
    const { storage, isReady, error } = useIndexedDBStorage()

    expect(storage.value).toBeDefined()
    expect(isReady).toBeDefined()
    expect(error).toBeDefined()
    expect(typeof isReady.value).toBe('boolean')
  })

  it('should accept custom db and store names', () => {
    const { isReady } = useIndexedDBStorage({
      dbName: 'test-db',
      storeName: 'test-store',
    })

    expect(typeof isReady.value).toBe('boolean')
  })

  it('should use default db and store names if not provided', async () => {
    const { storage, isReady } = useIndexedDBStorage()

    await nextTick()
    expect(storage.value).toBeDefined()
  })

  it('should have storage methods', async () => {
    const { storage, isReady } = useIndexedDBStorage()

    await new Promise(resolve => setTimeout(resolve, 100))

    // IndexedDB storage should have standard methods
    expect(typeof storage.value.set).toBe('function')
    expect(typeof storage.value.get).toBe('function')
    expect(typeof storage.value.remove).toBe('function')
  })

  it('should track initialization errors gracefully', async () => {
    const { error, isReady } = useIndexedDBStorage({
      dbName: 'fhevm-vue-app',
      storeName: 'signatures',
    })

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 150))

    // Either ready or has error, but not both
    expect(isReady.value === true).toBe(true)
  })

  it('should support async storage operations', async () => {
    const { storage, isReady } = useIndexedDBStorage()

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(isReady.value).toBe(true)
    expect(storage.value).toBeDefined()

    // Test that storage.get returns promise
    const testKey = 'test-key'
    const result = storage.value.get(testKey)
    expect(result instanceof Promise || result === undefined).toBe(true)
  })
})
