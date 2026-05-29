import { notFound } from 'next/navigation'
import { getCatalogList } from '@/lib/lessons/catalog'
import { LessonWorkspace } from '@/components/lesson/LessonWorkspace'
import { createClient } from '@/lib/supabase/server'

type Props = {
  params: Promise<{ lessonId: string }>
}

export default async function LessonPage({ params }: Props) {
  const { lessonId } = await params
  const lessons = getCatalogList()
  const index = lessons.findIndex((l) => l.id === lessonId)
  if (index === -1) notFound()

  const lesson = lessons[index]
  const prevLesson =
    index > 0 ? { id: lessons[index - 1].id, title: lessons[index - 1].title } : undefined
  const nextLesson =
    index < lessons.length - 1
      ? { id: lessons[index + 1].id, title: lessons[index + 1].title }
      : undefined

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isGuest = !user

  return (
    <LessonWorkspace
      lesson={lesson}
      prevLesson={prevLesson}
      nextLesson={nextLesson}
      isGuest={isGuest}
    />
  )
}
