'use client'

import { useSyncExternalStore } from 'react'

// useSyncExternalStore はマウント後に getSnapshot を呼び、
// getServerSnapshot と異なれば再レンダーを誘発する。
// この性質を利用して "ハイドレーション完了" を検知する。
const subscribe = () => () => {}
const getSnapshot = () => true
const getServerSnapshot = () => false

export function useHasHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
