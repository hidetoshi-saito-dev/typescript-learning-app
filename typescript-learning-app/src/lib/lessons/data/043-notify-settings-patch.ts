import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '043-notify-settings-patch',
  title: '既存コードを読んで小さく拡張する',
  scenario:
    '通知配信サービス「Notifier」のチームに参加しました。メールと SMS の通知を送る既存システムが動いています——まず initialCode の既存コードを読んで、何がどう動いているかを把握してください。最初の仕事は小さな機能追加「設定の部分更新」です。既存の挙動を一切壊さないことが受け入れ条件に入っています（目安: 10分）。',
  requirements: [
    '`mergeSettings(base, patch)` を追加する: `patch` には設定の一部のキーだけを渡せる（`Partial<Settings>`）',
    'パッチに無いキーは `base` の値をそのまま残す',
    '`base` オブジェクトは書き換えない（非破壊マージ）',
    '既存の `format` の出力を1文字も変えない',
  ],
  description:
    '実務の機能追加は「書く」より先に「読む」が来ます。`Partial<T>` は 021 で学んだ「全プロパティをオプションにする」ユーティリティ型で、設定の部分更新・PATCH API・オプション引数など実務での出番が非常に多い型です。スプレッド構文 `{ ...base, ...patch }` と組み合わせると、「元を壊さず一部だけ上書き」が1行で書けます。既存の関数たちに触らずに足せるか——機能追加の腕の見せどころです。',
  challenge:
    '`mergeSettings` の `patch` の型を `Partial<Settings>` に変えて、スプレッド構文で base に patch を上書きした**新しいオブジェクト**を返してください。既存コード（`Notice` と `format`）は変更不要です。',
  hint: `function mergeSettings(base: Settings, patch: Partial<Settings>): Settings {\n  return { ...base, ...patch }\n}\n\nスプレッドは後に書いた方が勝ちます（patch のキーが base を上書き）。patch に無いキーは base の値が残ります。`,
  initialCode: `// ===== Notifier 通知配信 — 既存コード（まず読んで把握する）=====

type Notice =
  | { kind: "email"; to: string; subject: string; body: string }
  | { kind: "sms"; to: string; body: string }

// 通知の表示フォーマット（switch + never で全種類の処理を保証している）
function format(n: Notice): string {
  switch (n.kind) {
    case "email":
      return "[EMAIL] " + n.subject + " → " + n.to
    case "sms":
      return "[SMS] " + n.body.slice(0, 20) + " → " + n.to
    default: {
      const _exhaustive: never = n
      return _exhaustive
    }
  }
}

type Settings = {
  theme: "light" | "dark"
  emailEnabled: boolean
  smsEnabled: boolean
}

const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  emailEnabled: true,
  smsEnabled: false,
}

// ===== 機能追加: 設定の部分更新 =====

// TODO: patch を「Settings の一部のキーだけ」を受け取れる型にして、非破壊マージを実装してください
function mergeSettings(base: Settings, patch: Settings): Settings {
  return base
}

console.log(format({ kind: "email", to: "a@example.com", subject: "hi", body: "" }))
console.log(mergeSettings(DEFAULT_SETTINGS, DEFAULT_SETTINGS).theme)`,
  testCases: [
    {
      description: '部分更新のパッチは Settings の一部のキーだけを渡せる型になっている',
      assertion: `
if (!/mergeSettings[ \\t]*\\([^)]*patch[ \\t]*:[ \\t]*Partial[ \\t]*<[ \\t]*Settings[ \\t]*>/.test(__originalCode__)) {
  throw new Error("mergeSettings の patch の型を Partial<Settings> にして、一部のキーだけ渡せるようにしてください。")
}
`,
    },
    {
      description: 'パッチのキーだけが反映され、無いキーは元の値が残る',
      assertion: `
const merged = mergeSettings({ theme: "light", emailEnabled: true, smsEnabled: false }, { theme: "dark" })
if (merged.theme !== "dark") throw new Error("patch の theme が反映されていません。got: " + merged.theme)
if (merged.emailEnabled !== true || merged.smsEnabled !== false) throw new Error("patch に無いキーは base の値が残るはずです。")
`,
    },
    {
      description: '元の設定オブジェクトは書き換えない（非破壊マージ）',
      assertion: `
const base = { theme: "light", emailEnabled: true, smsEnabled: false }
const result = mergeSettings(base, { smsEnabled: true })
if (base.smsEnabled !== false) throw new Error("base を直接書き換えています。スプレッド構文で新しいオブジェクトを作ってください。")
if (result.smsEnabled !== true) throw new Error("patch の smsEnabled が反映されていません。")
`,
    },
    {
      description: '既存機能: 通知フォーマットの出力が変わっていない',
      assertion: `
const e = format({ kind: "email", to: "a@example.com", subject: "件名", body: "本文" })
if (e !== "[EMAIL] 件名 → a@example.com") throw new Error("既存の format(email) の出力が変わっています。got: " + e)
const s = format({ kind: "sms", to: "090-0000-0000", body: "こんにちは" })
if (s !== "[SMS] こんにちは → 090-0000-0000") throw new Error("既存の format(sms) の出力が変わっています。got: " + s)
`,
    },
  ],
}
