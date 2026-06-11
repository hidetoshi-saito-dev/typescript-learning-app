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
  // 「ハイドレーション完了 → loader 発見」の直列待ちを解消する（LCP 対策）。
  // 【fetchPriority: 'low' が必須】既定優先度で preload すると、初回ペイントに必要な
  // CSS/フォントと帯域を奪い合い FCP を悪化させる（本番 Lighthouse で実測:
  // editor.main.css を as=style(VeryHigh) で preload した版は FCP 1.1s→7.0s に退行。
  // チェーン起動が早まるほど 948KB の editor チャンクがペイント前に流入するため）。
  // low なら「クリティカルに譲りつつキャッシュだけ温める」になる。
  // CSS は preload しない（102KB・最大の競合源。AMD loader が後で自前取得する）。
  // 対象はバージョン非依存の安定ファイル名のみ（ハッシュ付きチャンクは copy 時に変わる）。
  preload('/monaco/vs/loader.js', { as: 'script', fetchPriority: 'low' })
  preload('/monaco/vs/editor/editor.main.js', { as: 'script', fetchPriority: 'low' })
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
