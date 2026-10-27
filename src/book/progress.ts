// Chapter stamps, kept in this browser. Storage is outside our control (corrupted, cleared or blocked), so a bad
// read starts the reader with no stamps and a failed write only loses the stamp; both are logged.

const KEY = 'openlab-book-stamps'

// stamps are read on every render, so each distinct problem is logged once
let reported = ''
const report = (what: string, detail: unknown) => {
  if (what === reported) return
  reported = what
  console.warn(what, detail)
}

const valid = (v: unknown): v is Record<number, number> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.entries(v).every(([k, t]) => /^\d+$/.test(k) && typeof t === 'number')

export function loadStamps(): Record<number, number> {
  let v: unknown
  try {
    v = JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch (e) {
    report(`book progress unreadable, starting without stamps: ${e}`, e)
    return {}
  }
  if (valid(v)) return v
  report(`book progress malformed, starting without stamps: ${JSON.stringify(v)}`, v)
  return {}
}

export function saveStamp(n: number) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadStamps(), [n]: Date.now() }))
  } catch (e) {
    report(`book progress not saved, chapter ${n} stamp is kept for this visit only: ${e}`, e)
  }
}
