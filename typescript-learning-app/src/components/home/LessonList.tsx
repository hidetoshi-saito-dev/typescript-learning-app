'use client'

import Link from 'next/link'
import { useMemo, useSyncExternalStore } from 'react'
import { useHasHydrated } from '@/lib/hooks/use-hydrated'
import { getGuestServerSnapshot, getGuestSnapshot, subscribeGuest } from '@/lib/progress/guest'
import type { Lesson } from '@/types'

type Props = {
  lessons: Lesson[]
  serverCompleted?: string[]
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

export function LessonList({ lessons, serverCompleted }: Props) {
  const hasHydrated = useHasHydrated()
  const guestCompleted = useSyncExternalStore(
    subscribeGuest,
    getGuestSnapshot,
    getGuestServerSnapshot,
  )

  // ログイン済みは即座に serverCompleted を、ゲストはハイドレーション後のみ実値を採用
  // 未ハイドレーション時は空集合として扱い、UI は placeholder を表示する
  const isReady = serverCompleted !== undefined || hasHydrated
  const completed = useMemo<ReadonlySet<string>>(() => {
    if (serverCompleted !== undefined) return new Set(serverCompleted)
    return hasHydrated ? guestCompleted : EMPTY_COMPLETED
  }, [serverCompleted, guestCompleted, hasHydrated])

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

      {/* レッスン一覧 */}
      <ul className="flex flex-col gap-2">
        {lessons.map((lesson, i) => {
          const isDone = isReady && completed.has(lesson.id)
          const isNext = isReady && i === nextIndex && !allDone
          const num = parseInt(lesson.id.split('-')[0], 10)

          return (
            <li key={lesson.id}>
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
                  <span className="shrink-0 text-xs font-semibold text-green-700">完了</span>
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
          )
        })}
      </ul>
    </div>
  )
}
