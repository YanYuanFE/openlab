// Progress kept in this browser: book chapter stamps and finished lab lessons. Storage is outside our control
// (corrupted, cleared or blocked), so a bad read starts with nothing and a failed write only loses that mark;
// both are logged.

// progress is read on every render, so each distinct problem is logged once
let reported = ''
const report = (what: string, detail: unknown) => {
  if (what === reported) return
  reported = what
  console.warn(what, detail)
}

/** Marks by key (chapter number or lesson id), each the time it was earned. */
type Marks = Record<string, number>

const valid = (v: unknown, keyOk: RegExp): v is Marks =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.entries(v).every(([k, t]) => keyOk.test(k) && typeof t === 'number')

/** One kind of progress: where it is stored, which keys are valid, and how the logs name it. */
interface Store {
  key: string
  keyOk: RegExp
  name: string
  marks: string
  mark: (k: string) => string
}

const STAMPS: Store = { key: 'openlab-book-stamps', keyOk: /^\d+$/, name: 'book progress', marks: 'stamps', mark: (n) => `chapter ${n} stamp` }
const DONE: Store = { key: 'openlab-lessons-done', keyOk: /^[a-z][a-z0-9-]*$/, name: 'lesson progress', marks: 'finished lessons', mark: (id) => `lesson ${id}` }

function load(s: Store): Marks {
  let v: unknown
  try {
    v = JSON.parse(localStorage.getItem(s.key) ?? '{}')
  } catch (e) {
    report(`${s.name} unreadable, starting without ${s.marks}: ${e}`, e)
    return {}
  }
  if (valid(v, s.keyOk)) return v
  report(`${s.name} malformed, starting without ${s.marks}: ${JSON.stringify(v)}`, v)
  return {}
}

function save(s: Store, k: string) {
  try {
    localStorage.setItem(s.key, JSON.stringify({ ...load(s), [k]: Date.now() }))
  } catch (e) {
    report(`${s.name} not saved, ${s.mark(k)} is kept for this visit only: ${e}`, e)
  }
}

export const loadStamps = (): Record<number, number> => load(STAMPS)
export const saveStamp = (n: number) => save(STAMPS, String(n))
export const loadDone = (): Marks => load(DONE)
export const saveDone = (id: string) => save(DONE, id)
