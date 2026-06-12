'use client'

import Link from 'next/link'
import { useMemo, useSyncExternalStore } from 'react'
import { useHasHydrated } from '@/lib/hooks/use-hydrated'
import {
  getGuestActivityServerSnapshot,
  getGuestActivitySnapshot,
  subscribeGuest,
} from '@/lib/progress/guest'
import {
  computeBadges,
  computeStreak,
  reviewCandidates,
  toLocalDateString,
  weeklyCounts,
  type DatedCompletion,
} from '@/lib/progress/insights'
import type { ProgressDetail } from '@/lib/progress/actions'
import type { LessonListItem } from './LessonList'

type Props = {
  lessons: LessonListItem[]
  completed: ReadonlySet<string>
  isReady: boolean
  serverProgress?: ProgressDetail[]
}

// 学習のきろくパネル: 達成バッジ / 連続学習 / 週別グラフ / 復習導線。
// すべて既存データ（DB: completed_at / ゲスト: 活動ログ）からの導出で、スキーマ変更なし。
// 日付の確定（UTC→ローカル）はハイドレーション後のクライアントでのみ行う
// （サーバーは UTC のため「今日」がずれる & SSR/CSR 不一致を避ける）。
// 設計正本: .company/engineering/docs/retention-features.md
export function RetentionPanel({ lessons, completed, isReady, serverProgress }: Props) {
  const hasHydrated = useHasHydrated()
  const guestActivity = useSyncExternalStore(
    subscribeGuest,
    getGuestActivitySnapshot,
    getGuestActivityServerSnapshot,
  )

  const events = useMemo<DatedCompletion[]>(() => {
    if (!hasHydrated) return []
    if (serverProgress !== undefined) {
      return serverProgress.map((p) => ({
        lessonId: p.lessonId,
        date: toLocalDateString(new Date(p.completedAt)),
      }))
    }
    return guestActivity.map((e) => ({ lessonId: e.id, date: e.d }))
  }, [hasHydrated, serverProgress, guestActivity])

  const today = hasHydrated ? toLocalDateString(new Date()) : null
  const dates = useMemo(() => events.map((e) => e.date), [events])
  const streak = today ? computeStreak(dates, today) : 0
  const weeks = today ? weeklyCounts(dates, today, 8) : []
  const maxWeekCount = Math.max(1, ...weeks.map((w) => w.count))
  const hasDatedEvents = events.length > 0

  const badges = computeBadges(completed, lessons)
  const titleById = useMemo(() => new Map(lessons.map((l) => [l.id, l.title])), [lessons])
  const review = reviewCandidates(
    completed,
    events,
    lessons.map((l) => l.id),
    3,
  )

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">学習のきろく</p>

      {/* 達成バッジ */}
      <ul aria-label="達成バッジ" className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <li
            key={badge.id}
            title={badge.description}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              isReady && badge.earned
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-zinc-200 bg-zinc-50 text-zinc-600 grayscale'
            }`}
          >
            <span aria-hidden="true">{badge.icon}</span>
            {badge.label}
            <span className="sr-only">{badge.earned ? '（達成済み）' : '（未達成）'}</span>
          </li>
        ))}
      </ul>

      {/* 連続学習 + 週別グラフ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm text-zinc-700">
          <span aria-hidden="true">🔥</span> 連続学習{' '}
          <span className="text-xl font-bold tabular-nums text-zinc-900">
            {hasHydrated ? streak : '–'}
          </span>{' '}
          日
          {hasHydrated && streak === 0 && (
            <span className="ml-2 text-xs text-zinc-500">今日のレッスンでスタート！</span>
          )}
        </p>

        {hasDatedEvents ? (
          <div
            role="img"
            aria-label={`直近8週の完了レッスン数: ${weeks.map((w) => `${w.label}の週 ${w.count}本`).join('、')}`}
            className="flex items-end gap-1"
          >
            {weeks.map((week) => (
              <div key={week.weekStart} className="flex w-6 flex-col items-center gap-1">
                {/* 高さは px 指定（% は親の確定高がないと潰れる） */}
                <div
                  title={`${week.label}の週: ${week.count}本`}
                  className={`w-full rounded-sm transition-all ${
                    week.count > 0 ? 'bg-blue-500' : 'bg-zinc-100'
                  }`}
                  style={{
                    height: `${week.count > 0 ? Math.max(8, Math.round((week.count / maxWeekCount) * 44)) : 4}px`,
                  }}
                />
                <span className="text-[9px] leading-none text-zinc-400">{week.label}</span>
              </div>
            ))}
          </div>
        ) : (
          hasHydrated && (
            <p className="text-xs text-zinc-500">
              レッスンを完了すると、週ごとの学習量がここに積み上がります
            </p>
          )
        )}
      </div>

      {/* 復習導線 */}
      {isReady && review.length > 0 && (
        <div className="border-t border-zinc-100 pt-4">
          <p className="mb-2 text-xs font-semibold text-zinc-600">
            復習のすすめ
            <span className="ml-2 font-normal text-zinc-500">
              完了から時間が経ったレッスンをもう一度解くと定着します
            </span>
          </p>
          <ul className="flex flex-wrap gap-2">
            {review.map((id) => (
              <li key={id}>
                <Link
                  href={`/lessons/${id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
                >
                  {titleById.get(id) ?? id}
                  <span aria-hidden="true">↺</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
