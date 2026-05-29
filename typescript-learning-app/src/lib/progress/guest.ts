const STORAGE_KEY = 'ts-learning-guest-progress'
const CHANGE_EVENT = 'guest-progress-change'
const EMPTY_SET: ReadonlySet<string> = new Set()

let cachedSnapshot: ReadonlySet<string> = EMPTY_SET
let cachedRaw: string | null = null

function readLocalStorage(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function notifyChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }
}

export function markComplete(lessonId: string): void {
  try {
    const completed = readLocalStorage()
    completed.add(lessonId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]))
    notifyChange()
  } catch {
    // localStorage 利用不可の場合は無視（プライベートブラウジング等）
  }
}

export function clearGuestProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    notifyChange()
  } catch {
    // localStorage 利用不可
  }
}

// useSyncExternalStore 用のスナップショット取得
// 同じ raw 文字列なら同一参照を返すことで再レンダー判定を安定させる
export function getGuestSnapshot(): ReadonlySet<string> {
  if (typeof window === 'undefined') return EMPTY_SET
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === cachedRaw) return cachedSnapshot
  cachedRaw = raw
  try {
    cachedSnapshot = raw ? new Set(JSON.parse(raw) as string[]) : EMPTY_SET
  } catch {
    cachedSnapshot = EMPTY_SET
  }
  return cachedSnapshot
}

// SSR とハイドレーション初回で使われるスナップショット
export function getGuestServerSnapshot(): ReadonlySet<string> {
  return EMPTY_SET
}

// localStorage 変更（他タブ）と markComplete/clearGuestProgress 呼び出し（同タブ）の両方を購読
export function subscribeGuest(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', callback)
  window.addEventListener(CHANGE_EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(CHANGE_EVENT, callback)
  }
}
