'use client'

import Link from 'next/link'
import { Fragment, useMemo, useSyncExternalStore } from 'react'
import { useHasHydrated } from '@/lib/hooks/use-hydrated'
import { getGuestServerSnapshot, getGuestSnapshot, subscribeGuest } from '@/lib/progress/guest'
import { LEVEL_LABELS, LEVEL_ORDER, type LessonLevel } from '@/lib/lessons/level'
import { getScenarioInfo } from '@/lib/lessons/scenario'
import type { ProgressDetail } from '@/lib/progress/actions'
import { RetentionPanel } from './RetentionPanel'

// ホーム一覧に必要な最小限のみ（Lesson 全体を受けると本文・判定までクライアントに乗る）
export type LessonListItem = {
  id: string
  title: string
  level: LessonLevel
}

type Props = {
  lessons: LessonListItem[]
  /** ログイン時のみ。完了集合に加え、定着支援（ストリーク/グラフ/復習）の導出元になる */
  serverProgress?: ProgressDetail[]
}

const EMPTY_COMPLETED: ReadonlySet<string> = new Set()

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8l3.5 3.5L13 5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LessonList({ lessons, serverProgress }: Props) {
  const hasHydrated = useHasHydrated()
  const guestCompleted = useSyncExternalStore(
    subscribeGuest,
    getGuestSnapshot,
    getGuestServerSnapshot,
  )

  // ログイン済みは即座に serverProgress を、ゲストはハイドレーション後のみ実値を採用
  // 未ハイドレーション時は空集合として扱い、UI は placeholder を表示する
  const isReady = serverProgress !== undefined || hasHydrated
  const completed = useMemo<ReadonlySet<string>>(() => {
    if (serverProgress !== undefined) return new Set(serverProgress.map((p) => p.lessonId))
    return hasHydrated ? guestCompleted : EMPTY_COMPLETED
  }, [serverProgress, guestCompleted, hasHydrated])

  const completedCount = lessons.filter((l) => completed.has(l.id)).length
  const totalCount = lessons.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const allDone = isReady && completedCount === totalCount && totalCount > 0
  const nextIndex = lessons.findIndex((l) => !completed.has(l.id))

  return (
    <div className="flex flex-col gap-5">
      {/* 進捗カード */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">学習進捗</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">
              {isReady ? completedCount : '–'}
              <span className="text-base font-normal text-zinc-500"> / {totalCount}</span>
            </p>
          </div>
          {allDone ? (
            <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
              🎉 コース完了！
            </span>
          ) : (
            isReady &&
            progressPct > 0 && (
              <span className="text-sm font-bold tabular-nums text-blue-600">{progressPct}%</span>
            )
          )}
        </div>

        {/* プログレスバー */}
        <div
          role="progressbar"
          aria-label="学習進捗"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={isReady ? progressPct : 0}
          className="h-2 w-full overflow-hidden rounded-full bg-zinc-100"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700 ease-out"
            style={{ width: `${isReady ? progressPct : 0}%` }}
          />
        </div>

        {isReady && !allDone && nextIndex >= 0 && (
          <p className="mt-3 text-xs text-zinc-500">
            次のレッスン:{' '}
            <span className="font-medium text-zinc-600">{lessons[nextIndex].title}</span>
          </p>
        )}
      </div>

      {/* 学習のきろく（バッジ・ストリーク・グラフ・復習） */}
      <RetentionPanel
        lessons={lessons}
        completed={completed}
        isReady={isReady}
        serverProgress={serverProgress}
      />

      {/* レッスン一覧（レベル別セクション） */}
      {LEVEL_ORDER.map((level) => {
        const sectionLessons = lessons.filter((l) => l.level === level)
        if (sectionLessons.length === 0) return null
        const sectionDone = sectionLessons.filter((l) => completed.has(l.id)).length
        const sectionAllDone = isReady && sectionDone === sectionLessons.length

        return (
          <section key={level} aria-label={LEVEL_LABELS[level]}>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {LEVEL_LABELS[level]}
              </h3>
              <span
                className={`text-xs font-medium tabular-nums ${
                  sectionAllDone ? 'text-green-700' : 'text-zinc-500'
                }`}
              >
                {sectionAllDone ? '✓ ' : ''}
                {isReady ? sectionDone : '–'} / {sectionLessons.length}
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {sectionLessons.map((lesson) => {
                const i = lessons.indexOf(lesson)
                const isDone = isReady && completed.has(lesson.id)
                const isNext = isReady && i === nextIndex && !allDone
                const num = parseInt(lesson.id.split('-')[0], 10)
                // 実践セクションのみ: 連作の先頭にシナリオ小見出しを挿す（他レベルは undefined で無変化）
                const scenarioInfo = level === 'practical' ? getScenarioInfo(lesson.id) : undefined

                return (
                  <Fragment key={lesson.id}>
                    {scenarioInfo?.step === 1 && (
                      <li className="mt-1 px-1 pt-1 text-xs font-bold text-zinc-600">
                        {scenarioInfo.title} — {scenarioInfo.flow}
                      </li>
                    )}
                    <li>
                      <Link
                        href={`/lessons/${lesson.id}`}
                        className={`group flex items-center gap-4 rounded-xl border p-4 transition-all duration-150 ${
                          isDone
                            ? 'border-green-200 bg-green-50 hover:border-green-300 hover:bg-green-100/70'
                            : isNext
                              ? 'border-blue-200 bg-blue-50 shadow-sm shadow-blue-100/60 hover:border-blue-300 hover:bg-blue-100/70'
                              : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        {/* 番号 / チェックバッジ */}
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                            isDone
                              ? 'bg-green-600 text-white'
                              : isNext
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200'
                          }`}
                        >
                          {isDone ? <CheckIcon /> : num}
                        </div>

                        {/* タイトル */}
                        <span
                          className={`flex-1 font-medium ${
                            isDone ? 'text-green-800' : isNext ? 'text-blue-900' : 'text-zinc-800'
                          }`}
                        >
                          {lesson.title}
                        </span>

                        {/* ステータスラベル */}
                        {isDone ? (
                          <span className="shrink-0 text-xs font-semibold text-green-700">
                            完了
                          </span>
                        ) : isNext ? (
                          <span className="shrink-0 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                            開始 →
                          </span>
                        ) : (
                          <span
                            aria-hidden="true"
                            className="shrink-0 text-sm text-zinc-400 transition-colors group-hover:text-zinc-500"
                          >
                            →
                          </span>
                        )}
                      </Link>
                    </li>
                  </Fragment>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
