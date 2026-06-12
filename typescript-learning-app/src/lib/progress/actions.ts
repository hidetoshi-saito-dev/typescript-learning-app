'use server'

import { createClient } from '@/lib/supabase/server'
import { getCatalogList } from '@/lib/lessons/catalog'

export async function markLessonComplete(lessonId: string): Promise<void> {
  // サーバー側でレッスンIDの存在を検証（FK 代替）
  const catalog = getCatalogList()
  const validIds = new Set(catalog.map((l) => l.id))
  if (!validIds.has(lessonId)) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('lesson_progress').upsert(
    {
      user_id: user.id,
      course_id: 'typescript-basics',
      lesson_id: lessonId,
    },
    { onConflict: 'user_id,lesson_id' },
  )
}

export async function mergeGuestProgress(lessonIds: string[]): Promise<void> {
  if (lessonIds.length === 0) return

  const catalog = getCatalogList()
  const validIds = new Set(catalog.map((l) => l.id))
  const filtered = lessonIds.filter((id) => validIds.has(id))
  if (filtered.length === 0) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('lesson_progress').upsert(
    filtered.map((lessonId) => ({
      user_id: user.id,
      course_id: 'typescript-basics',
      lesson_id: lessonId,
    })),
    { onConflict: 'user_id,lesson_id' },
  )
}

export type ProgressDetail = { lessonId: string; completedAt: string }

/**
 * 完了レッスンを completed_at 付きで返す（古い順）。
 * バッジ・ストリーク・週別グラフ・復習候補はすべてここから導出する（スキーマ変更不要）。
 * 日付（YYYY-MM-DD）への変換はクライアント側で行うこと（サーバーは UTC のため）。
 */
export async function getServerProgressDetail(): Promise<ProgressDetail[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('lesson_progress')
    .select('lesson_id, completed_at')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: true })

  return data?.map((row) => ({ lessonId: row.lesson_id, completedAt: row.completed_at })) ?? []
}
