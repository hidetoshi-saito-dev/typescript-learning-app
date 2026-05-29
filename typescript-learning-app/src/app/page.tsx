import { getCatalogList } from '@/lib/lessons/catalog'
import { getServerCompletedLessons } from '@/lib/progress/actions'
import { LessonList } from '@/components/home/LessonList'
import { UserMenu } from '@/components/auth/UserMenu'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

type Props = {
  searchParams: Promise<{ code?: string }>
}

export default async function Home({ searchParams }: Props) {
  // Supabase が site_url にリダイレクトした場合、?code= を callback へ転送
  const { code } = await searchParams
  if (code) {
    redirect(`/auth/callback?code=${code}`)
  }
  const lessons = getCatalogList()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const serverCompleted = user ? await getServerCompletedLessons() : undefined

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-8 py-16">
        {/* ヘッダー */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
              TypeScript 学習アプリ
            </h1>
            <p className="mt-2 text-zinc-500">ブラウザで TypeScript をインタラクティブに学ぼう</p>
          </div>
          <div className="shrink-0 pt-1">
            {user ? (
              <UserMenu displayName={user.user_metadata?.user_name ?? user.email ?? 'ユーザー'} />
            ) : (
              <Link
                href="/login"
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50"
              >
                ログイン
              </Link>
            )}
          </div>
        </div>

        {/* レッスン一覧（進捗バッジ付き）*/}
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            レッスン一覧
          </h2>
          <LessonList lessons={lessons} serverCompleted={serverCompleted} />
        </section>
      </main>
    </div>
  )
}
