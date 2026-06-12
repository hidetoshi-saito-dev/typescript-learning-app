// 実践クラス（040+）の連作シナリオ情報を lessonId から導出する。
// level.ts と同じ思想:
//  - シナリオ配列を単一情報源とし、step/total は配列位置から導出する
//    （lessonId→step の平置きマップは step/total の手書きミスを許すため不採用）
//  - レッスンデータを import しない純データのみ＝Client Component から安全に import できる
//  - catalog との整合（practical 全レッスン登録・catalog 外 ID なし）は scenario.test.ts が固定
// 設計正本: .company/engineering/docs/curriculum-practical.md

export type ScenarioInfo = {
  /** 学習者に見せるドメイン名（例: TonariCafe）。「シナリオA」等のシステム内部語は使わない */
  title: string
  /** 実務フローの種別（新規開発 / 機能追加 / 既存改修） */
  flow: string
  step: number
  total: number
}

type ScenarioDef = { title: string; flow: string; lessons: readonly string[] }

// シナリオはレッスン実装 PR（シナリオA/B/C）ごとに追記していく
const SCENARIOS: readonly ScenarioDef[] = [
  {
    title: 'TonariCafe',
    flow: '新規開発',
    lessons: ['040-order-status-model', '041-menu-master-satisfies', '042-order-input-guard'],
  },
  {
    title: 'Notifier',
    flow: '機能追加',
    lessons: ['043-notify-settings-patch', '044-notify-new-channel', '045-notify-retry-async'],
  },
  {
    title: '会員APIクライアント',
    flow: '既存改修',
    lessons: ['046-api-any-removal', '047-api-unknown-guard', '048-roles-single-source'],
  },
]

export function getScenarioInfo(lessonId: string): ScenarioInfo | undefined {
  for (const s of SCENARIOS) {
    const idx = s.lessons.indexOf(lessonId)
    if (idx >= 0) {
      return { title: s.title, flow: s.flow, step: idx + 1, total: s.lessons.length }
    }
  }
  return undefined
}

/** テスト・一覧 UI 用にシナリオ定義を公開する（読み取り専用） */
export function getScenarios(): readonly ScenarioDef[] {
  return SCENARIOS
}
