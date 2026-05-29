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

export async function getServerCompletedLessons(): Promise<string[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase.from('lesson_progress').select('lesson_id').eq('user_id', user.id)

  return data?.map((row) => row.lesson_id) ?? []
}
