// scenario.test.ts — SCENARIOS（連作定義）と catalog の整合を固定する。
// scenario.ts は catalog を import しない静的データのため、二重管理のドリフト
// （実践レッスンの登録漏れ・存在しない ID・重複所属）はこのテストだけが守る。
// 設計正本: .company/engineering/docs/curriculum-practical.md（レビューE-3）

import { describe, expect, it } from 'vitest'
import { getCatalogList } from './catalog'
import { getLessonLevel } from './level'
import { getScenarioInfo, getScenarios } from './scenario'

describe('scenario.ts と catalog の整合', () => {
  const practicalIds = getCatalogList()
    .map((l) => l.id)
    .filter((id) => getLessonLevel(id) === 'practical')
  const catalogIds = new Set(getCatalogList().map((l) => l.id))

  it('catalog の実践レッスンはすべていずれかのシナリオに属する', () => {
    for (const id of practicalIds) {
      expect(getScenarioInfo(id), `${id} が SCENARIOS に未登録`).toBeDefined()
    }
  })

  it('SCENARIOS に catalog 外・実践以外・重複の ID がない', () => {
    const seen = new Set<string>()
    for (const s of getScenarios()) {
      for (const id of s.lessons) {
        expect(catalogIds.has(id), `${id} が catalog に存在しない`).toBe(true)
        expect(getLessonLevel(id), `${id} は practical ではない`).toBe('practical')
        expect(seen.has(id), `${id} が複数シナリオに重複所属`).toBe(false)
        seen.add(id)
      }
    }
  })

  it('step/total が配列位置から正しく導出される', () => {
    for (const s of getScenarios()) {
      s.lessons.forEach((id, idx) => {
        expect(getScenarioInfo(id)).toEqual({
          title: s.title,
          flow: s.flow,
          step: idx + 1,
          total: s.lessons.length,
        })
      })
    }
  })
})
