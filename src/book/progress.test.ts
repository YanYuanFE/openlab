import assert from 'node:assert/strict'
import { test } from 'node:test'

// a minimal localStorage, installed before progress.ts is loaded
const store = new Map<string, string>()
let blocked = false
globalThis.localStorage = {
  getItem: (k: string) => {
    if (blocked) throw new Error('SecurityError: storage is disabled')
    return store.get(k) ?? null
  },
  setItem: (k: string, v: string) => {
    if (blocked) throw new Error('QuotaExceededError')
    store.set(k, v)
  },
} as Storage
const warnings: unknown[][] = []
console.warn = (...a: unknown[]) => void warnings.push(a)
const { loadStamps, saveStamp } = await import('./progress.ts')
const KEY = 'openlab-book-stamps'

test('stamps saved are read back', () => {
  store.clear()
  saveStamp(3)
  assert.deepEqual(Object.keys(loadStamps()), ['3'])
})

test('unreadable or malformed progress starts empty and says why', () => {
  for (const bad of ['{not json', 'null', '[1,2]', '{"3":"yes"}']) {
    store.set(KEY, bad)
    warnings.length = 0
    assert.deepEqual(loadStamps(), {}, bad)
    assert.deepEqual(loadStamps(), {}, bad)
    assert.equal(warnings.length, 1, `${bad} is reported once however often it is read`)
  }
  store.set(KEY, '{"2":1700000000000,"x":5}')
  assert.deepEqual(loadStamps(), {}, 'a non-numeric chapter key is malformed')
})

test('blocked storage neither breaks reading nor saving', () => {
  blocked = true
  warnings.length = 0
  assert.deepEqual(loadStamps(), {})
  assert.doesNotThrow(() => saveStamp(4))
  // the failed read (repeated inside saving, not reported again) and the failed write
  assert.equal(warnings.length, 2)
  blocked = false
})
