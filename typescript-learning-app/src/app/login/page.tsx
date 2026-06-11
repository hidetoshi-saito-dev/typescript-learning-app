import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginButtons } from '@/components/auth/LoginButtons'
import { safeRedirectPath } from '@/lib/auth/safe-redirect'

type Props = {
  searchParams: Promise<{ redirect?: string; error?: string }>
}

// redirect パラメータ付き URL が乱立して索引されないよう noindex（リンク追跡は許可）
export const metadata: Metadata = {
  title: 'ログイン',
  robots: { index: false, follow: true },
}

export default async function LoginPage({ searchParams }: Props) {
  const { redirect: rawRedirect, error } = await searchParams
  // 外部URL/プロトコル相対への誘導を防ぐため内部パスのみ許可する
  const redirectTo = safeRedirectPath(rawRedirect)

  // ログイン済みならスキップ
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect(redirectTo)

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        {/* カード */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">ログイン</h1>
            <p className="mt-2 text-sm text-zinc-500">
              レッスン 4 以降を続けるにはログインが必要です
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              ログインに失敗しました。もう一度お試しください。
            </div>
          )}

          <LoginButtons redirectTo={redirectTo} />

          <p className="mt-6 text-center text-xs text-zinc-500">
            ログインすることで、学習進捗がクラウドに保存されます
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors">
            ← ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  )
}
