// insights.test.ts — 定着支援の導出ロジック境界固定
// ストリークは「日付の同一性・連続性」というタイムゾーン事故の温床なので、
// 月跨ぎ・年跨ぎ・歯抜けを明示的に固定する。

import { describe, expect, it } from 'vitest'
import {
  computeBadges,
  computeStreak,
  reviewCandidates,
  toLocalDateString,
  weeklyCounts,
} from './insights'

describe('toLocalDateString', () => {
  it('ローカル日付を YYYY-MM-DD で返す（ゼロ埋め）', () => {
    expect(toLocalDateString(new Date(2026, 5, 3))).toBe('2026-06-03')
    expect(toLocalDateString(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('computeStreak', () => {
  const TODAY = '2026-06-12'

  it('記録なしは 0', () => {
    expect(computeStreak([], TODAY)).toBe(0)
  })

  it('今日だけ完了 → 1', () => {
    expect(computeStreak(['2026-06-12'], TODAY)).toBe(1)
  })

  it('昨日まで3連続（今日はまだ）→ 3 のまま生きている', () => {
    expect(computeStreak(['2026-06-09', '2026-06-10', '2026-06-11'], TODAY)).toBe(3)
  })

  it('一昨日で途切れている → 0', () => {
    expect(computeStreak(['2026-06-09', '2026-06-10'], TODAY)).toBe(0)
  })

  it('歯抜けは連続の起点まで数える', () => {
    expect(computeStreak(['2026-06-08', '2026-06-11', '2026-06-12'], TODAY)).toBe(2)
  })

  it('同じ日の複数完了は1日として数える', () => {
    expect(computeStreak(['2026-06-12', '2026-06-12', '2026-06-11'], TODAY)).toBe(2)
  })

  it('月跨ぎの連続を正しく数える', () => {
    expect(computeStreak(['2026-05-31', '2026-06-01'], '2026-06-01')).toBe(2)
  })

  it('年跨ぎの連続を正しく数える', () => {
    expect(computeStreak(['2025-12-31', '2026-01-01'], '2026-01-01')).toBe(2)
  })
})

describe('weeklyCounts', () => {
  // 2026-06-12 は金曜（週初の月曜は 2026-06-08）
  const TODAY = '2026-06-12'

  it('指定週数ぶんのバケットを古→新で返す', () => {
    const buckets = weeklyCounts([], TODAY, 8)
    expect(buckets).toHaveLength(8)
    expect(buckets[7].weekStart).toBe('2026-06-08') // 今週（月曜起点）
    expect(buckets[6].weekStart).toBe('2026-06-01')
    expect(buckets[0].weekStart).toBe('2026-04-20')
    expect(buckets[7].label).toBe('6/8')
  })

  it('日付を正しい週に集計する（週境界の日曜/月曜を含む）', () => {
    const buckets = weeklyCounts(['2026-06-07', '2026-06-08', '2026-06-12', '2026-06-01'], TODAY, 2)
    // 2週: [6/1週, 6/8週]。6/7(日)は 6/1週・6/8(月)と6/12(金)は 6/8週
    expect(buckets[0].count).toBe(2)
    expect(buckets[1].count).toBe(2)
  })

  it('範囲より古い日付は無視する', () => {
    const buckets = weeklyCounts(['2020-01-01', '2026-06-12'], TODAY, 2)
    expect(buckets[0].count + buckets[1].count).toBe(1)
  })
})

describe('computeBadges', () => {
  const items = [
    { id: '001-a', level: 'beginner' as const },
    { id: '002-b', level: 'beginner' as const },
    { id: '016-c', level: 'intermediate' as const },
    { id: '032-d', level: 'advanced' as const },
  ]

  it('未完了はすべて unearned', () => {
    const badges = computeBadges(new Set(), items)
    expect(badges.every((b) => !b.earned)).toBe(true)
  })

  it('1本完了で「はじめの一歩」のみ earned', () => {
    const badges = computeBadges(new Set(['001-a']), items)
    expect(badges.find((b) => b.id === 'first-step')?.earned).toBe(true)
    expect(badges.find((b) => b.id === 'beginner-master')?.earned).toBe(false)
  })

  it('レベル全完了でレベルマスター earned', () => {
    const badges = computeBadges(new Set(['001-a', '002-b']), items)
    expect(badges.find((b) => b.id === 'beginner-master')?.earned).toBe(true)
    expect(badges.find((b) => b.id === 'all-complete')?.earned).toBe(false)
  })

  it('全完了で全バッジ earned', () => {
    const badges = computeBadges(new Set(items.map((i) => i.id)), items)
    expect(badges.every((b) => b.earned)).toBe(true)
  })
})

describe('reviewCandidates', () => {
  const order = ['001', '002', '003', '004']

  it('完了が古い順に最大 n 件返す', () => {
    const completed = new Set(['001', '002', '003'])
    const events = [
      { lessonId: '001', date: '2026-06-10' },
      { lessonId: '002', date: '2026-06-08' },
      { lessonId: '003', date: '2026-06-12' },
    ]
    expect(reviewCandidates(completed, events, order, 2)).toEqual(['002', '001'])
  })

  it('日付のない完了（過去のゲスト分）は最も古い扱い・カタログ順を保つ', () => {
    const completed = new Set(['002', '003', '004'])
    const events = [{ lessonId: '004', date: '2026-06-01' }]
    expect(reviewCandidates(completed, events, order, 3)).toEqual(['002', '003', '004'])
  })

  it('未完了はそもそも候補に入らない', () => {
    expect(reviewCandidates(new Set(['003']), [], order, 3)).toEqual(['003'])
  })
})
