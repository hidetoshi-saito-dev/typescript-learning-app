import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { preload } from 'react-dom'
import { getCatalogList } from '@/lib/lessons/catalog'
import { LessonWorkspace } from '@/components/lesson/LessonWorkspace'
import { createClient } from '@/lib/supabase/server'

type Props = {
  params: Promise<{ lessonId: string }>
}

/** 問題文の `code` / **bold** 記法を外してプレーンテキストにする（meta description 用） */
function stripInlineMarkdown(text: string): string {
  return text.replace(/`([^`]+)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lessonId } = await params
  const lesson = getCatalogList().find((l) => l.id === lessonId)
  if (!lesson) return {}
  const lessonNumber = lesson.id.split('-')[0]
  return {
    title: `Lesson ${lessonNumber} ${lesson.title}`,
    description: stripInlineMarkdown(lesson.description).slice(0, 120),
  }
}

export default async function LessonPage({ params }: Props) {
  // Monaco（self-host）の起動チェーンを HTML 段階で先読みさせ、
  // 「ハイドレーション完了 → loader 発見」の直列待ちを解消する（LCP/CLS 対策）。
  // 対象はバージョン非依存の安定ファイル名のみ（ハッシュ付きチャンクは copy 時に変わる）。
  preload('/monaco/vs/loader.js', { as: 'script' })
  preload('/monaco/vs/editor/editor.main.js', { as: 'script' })
  preload('/monaco/vs/editor/editor.main.css', { as: 'style' })
  preload('/monaco/vs/nls.messages-loader.js', { as: 'script' })
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
