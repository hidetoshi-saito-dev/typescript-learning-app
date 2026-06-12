// insights.ts — 完了イベントからストリーク・週別集計・バッジ・復習候補を導出する純関数群
//
// 日付はすべて「ローカルタイムゾーンの YYYY-MM-DD」文字列で扱う。
// completed_at(UTC) からの日付確定はクライアント側でのみ行うこと（サーバーは UTC のため
// 日本のユーザーの「今日」とずれ、ストリーク判定が壊れる）。
// 設計正本: .company/engineering/docs/retention-features.md

import type { LessonLevel } from '@/lib/lessons/level'

/** 正規化された完了イベント（ログイン: DB行 / ゲスト: 活動ログ の共通形） */
export type DatedCompletion = { lessonId: string; date: string }

export type Badge = {
  id: string
  icon: string
  label: string
  description: string
  earned: boolean
}

export type WeekBucket = { weekStart: string; label: string; count: number }

export function toLocalDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** YYYY-MM-DD に日数を加算（ローカル日付として月跨ぎ・年跨ぎを正しく処理） */
function addDays(date: string, delta: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return toLocalDateString(new Date(y, m - 1, d + delta))
}

/**
 * 連続学習日数。
 * 「今日」または「昨日」で終わる連続日数を数える（今日まだ解いていなくても
 * 昨日までの連続は生きている、という一般的なストリーク仕様）。
 */
export function computeStreak(dates: Iterable<string>, today: string): number {
  const set = new Set(dates)
  if (set.size === 0) return 0
  let cursor = set.has(today) ? today : addDays(today, -1)
  if (!set.has(cursor)) return 0
  let streak = 0
  while (set.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** 直近 weeks 週（月曜起点・古→新）の週別完了数。label は週初日の "M/D" */
export function weeklyCounts(dates: string[], today: string, weeks = 8): WeekBucket[] {
  const [y, m, d] = today.split('-').map(Number)
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7 // 月曜=0
  const currentWeekStart = addDays(today, -dow)

  const buckets: WeekBucket[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = addDays(currentWeekStart, -7 * i)
    const [, wm, wd] = weekStart.split('-').map(Number)
    buckets.push({ weekStart, label: `${wm}/${wd}`, count: 0 })
  }

  const rangeStart = buckets[0].weekStart
  for (const date of dates) {
    if (date < rangeStart) continue
    // 後ろ（新しい週）から「週初日 <= date」を満たす最初のバケットに入れる
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (date >= buckets[i].weekStart) {
        buckets[i].count++
        break
      }
    }
  }
  return buckets
}

/** 達成バッジ5種。未獲得も返す（UI 側でグレー表示し「次の目標」を見せる） */
export function computeBadges(
  completed: ReadonlySet<string>,
  items: { id: string; level: LessonLevel }[],
): Badge[] {
  const total = items.length
  const done = items.filter((i) => completed.has(i.id)).length
  const levelAllDone = (level: LessonLevel) => {
    const inLevel = items.filter((i) => i.level === level)
    return inLevel.length > 0 && inLevel.every((i) => completed.has(i.id))
  }
  return [
    {
      id: 'first-step',
      icon: '🌱',
      label: 'はじめの一歩',
      description: '最初のレッスンを完了',
      earned: done >= 1,
    },
    {
      id: 'beginner-master',
      icon: '🎓',
      label: '初級マスター',
      description: '初級をすべて完了',
      earned: levelAllDone('beginner'),
    },
    {
      id: 'intermediate-master',
      icon: '🏅',
      label: '中級マスター',
      description: '中級をすべて完了',
      earned: levelAllDone('intermediate'),
    },
    {
      id: 'advanced-master',
      icon: '🏆',
      label: '上級マスター',
      description: '上級をすべて完了',
      earned: levelAllDone('advanced'),
    },
    {
      id: 'all-complete',
      icon: '👑',
      label: '全レッスン制覇',
      description: `全${total}レッスンを完了`,
      earned: total > 0 && done === total,
    },
  ]
}

/**
 * 復習候補: 完了が古い順に最大 n 件のレッスン ID。
 * 日付のない完了（活動ログ導入前のゲスト過去分）は「最も古い」とみなし、
 * カタログ順を保ったまま先頭側に並べる。
 */
export function reviewCandidates(
  completed: ReadonlySet<string>,
  events: DatedCompletion[],
  catalogOrder: string[],
  n = 3,
): string[] {
  const dateById = new Map(events.map((e) => [e.lessonId, e.date]))
  return catalogOrder
    .filter((id) => completed.has(id))
    .map((id, idx) => ({
      id,
      // 日付なしは "0000-<カタログ順>" で日付ありのどれよりも古い扱いにする
      sortKey: dateById.get(id) ?? `0000-${String(idx).padStart(6, '0')}`,
    }))
    .sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0))
    .slice(0, n)
    .map((x) => x.id)
}
