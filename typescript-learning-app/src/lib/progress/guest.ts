import { toLocalDateString } from './insights'

const STORAGE_KEY = 'ts-learning-guest-progress'
// 活動ログ: 初完了イベント {id, d:"YYYY-MM-DD"(ローカル)} の配列。
// ストリーク・週別グラフ用（導入日以降の完了から育つ）。設計: retention-features.md
const ACTIVITY_KEY = 'ts-learning-guest-activity-v1'
const CHANGE_EVENT = 'guest-progress-change'
const EMPTY_SET: ReadonlySet<string> = new Set()

export type GuestActivityEntry = { id: string; d: string }
const EMPTY_ACTIVITY: readonly GuestActivityEntry[] = []
let cachedActivityRaw: string | null = null
let cachedActivity: readonly GuestActivityEntry[] = EMPTY_ACTIVITY

function readActivity(): GuestActivityEntry[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GuestActivityEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

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
    const isFirstCompletion = !completed.has(lessonId)
    completed.add(lessonId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]))
    if (isFirstCompletion) {
      // ストリーク/グラフは「初完了」を学習イベントとして数える（DB の completed_at と同じ意味論）
      const log = readActivity()
      log.push({ id: lessonId, d: toLocalDateString(new Date()) })
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(log))
    }
    notifyChange()
  } catch {
    // localStorage 利用不可の場合は無視（プライベートブラウジング等）
  }
}

// useSyncExternalStore 用（同じ raw なら同一参照を返して再レンダー判定を安定させる）
export function getGuestActivitySnapshot(): readonly GuestActivityEntry[] {
  if (typeof window === 'undefined') return EMPTY_ACTIVITY
  const raw = localStorage.getItem(ACTIVITY_KEY)
  if (raw === cachedActivityRaw) return cachedActivity
  cachedActivityRaw = raw
  try {
    const parsed = raw ? (JSON.parse(raw) as GuestActivityEntry[]) : []
    cachedActivity = Array.isArray(parsed) ? parsed : EMPTY_ACTIVITY
  } catch {
    cachedActivity = EMPTY_ACTIVITY
  }
  return cachedActivity
}

export function getGuestActivityServerSnapshot(): readonly GuestActivityEntry[] {
  return EMPTY_ACTIVITY
}

export function clearGuestProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(ACTIVITY_KEY)
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
