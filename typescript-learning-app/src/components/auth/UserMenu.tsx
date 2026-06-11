'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Props = {
  displayName: string
}

export function UserMenu({ displayName }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // キーボード操作: Escape でメニューを閉じる（オーバーレイはマウス専用のため）
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50"
      >
        <span
          aria-hidden="true"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700"
        >
          {displayName.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-[120px] truncate">{displayName}</span>
      </button>

      {open && (
        <>
          <div aria-hidden="true" className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-zinc-100 bg-white py-1 shadow-lg"
          >
            <button
              role="menuitem"
              onClick={handleSignOut}
              className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
            >
              ログアウト
            </button>
          </div>
        </>
      )}
    </div>
  )
}
