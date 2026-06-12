import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '044-notify-new-channel',
  title: '新チャネル追加 — コンパイラが全修正箇所を教える',
  scenario:
    'Notifier の STEP 2 です。前回の完成形が initialCode に入っています。今日のチケットは「プッシュ通知チャネルの追加」——Union 型に push を1行足した状態から始まります。エディタを見てください、**3つの関数が同時に型エラー**になっているはずです。これは事故ではありません。コンパイラが「直すべき場所の完全なリスト」を作ってくれたのです（目安: 15分）。',
  requirements: [
    'push 通知のフォーマットは `[PUSH] タイトル` の形式',
    'push の宛先は `deviceId`・本文の上限は 100 文字（email 5000・sms 70 は変更しない）',
    '3つの `default` 節（never による網羅性チェック）はそのまま残す',
    'email・SMS の既存の挙動を1文字も変えない',
  ],
  description:
    '027 の never 網羅性チェックの実務適用です。判別共用体に新しいバリアントを足した瞬間、never チェックを置いた**すべての switch が型エラーになり、修正が必要な場所をコンパイラが漏れなく列挙**してくれます。これが「型のある実務」の最強の体験です——もし JavaScript なら、push 対応を忘れた関数は本番で初めて壊れます。grep でも人間の記憶でもなく、コンパイラに影響範囲を教えさせる仕組みを自分の手で確かめてください。',
  challenge:
    '赤線が出ている3つの関数（`format`・`destinationOf`・`charLimitOf`）に `case "push"` を追加して、仕様どおりの値を返してください。3つの `default` 節はそのまま残します。なお実務では網羅性チェックを `assertNever` ヘルパー関数に括り出す書き方もあります（このレッスンでは default 節のままにしてください）。',
  hint: `switch に case を1つずつ足していきます。\n\ncase "push":\n  return "[PUSH] " + n.title\n\ndestinationOf には n.deviceId を返す case を、charLimitOf には 100 を返す case を足します。3つの型エラーがすべて消えたら完成です。`,
  initialCode: `// ===== Notifier — 機能追加: プッシュ通知チャネル =====
// Union に push を1行追加した状態です。3つの関数が型エラーになっているはず——
// それがこのレッスンの主役です（赤線 = 直すべき場所の完全なリスト）

type Notice =
  | { kind: "email"; to: string; subject: string; body: string }
  | { kind: "sms"; to: string; body: string }
  | { kind: "push"; deviceId: string; title: string }

type Settings = {
  theme: "light" | "dark"
  emailEnabled: boolean
  smsEnabled: boolean
}

function mergeSettings(base: Settings, patch: Partial<Settings>): Settings {
  return { ...base, ...patch }
}

// 仕様: push は "[PUSH] タイトル" の形式
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

// 仕様: push の宛先は deviceId
function destinationOf(n: Notice): string {
  switch (n.kind) {
    case "email":
      return n.to
    case "sms":
      return n.to
    default: {
      const _exhaustive: never = n
      return _exhaustive
    }
  }
}

// 仕様: push の本文上限は 100 文字（email は 5000・sms は 70）
function charLimitOf(n: Notice): number {
  switch (n.kind) {
    case "email":
      return 5000
    case "sms":
      return 70
    default: {
      const _exhaustive: never = n
      return _exhaustive
    }
  }
}

console.log(format({ kind: "email", to: "a@example.com", subject: "hi", body: "" }))
console.log(mergeSettings({ theme: "light", emailEnabled: true, smsEnabled: false }, { theme: "dark" }).theme)`,
  testCases: [
    {
      description: '網羅性チェック（default 節の never）が3つの関数すべてに残っている',
      assertion: `
if (!/(?:[\\s\\S]*?default[ \\t]*:[\\s\\S]{0,80}?:[ \\t]*never[ \\t]*=){3}/.test(__originalCode__)) {
  throw new Error("3つの switch の default 節（const _exhaustive: never = n）はそのまま残してください。")
}
if (/\\bas[ \\t]+never\\b/.test(__originalCode__)) {
  throw new Error("as never で網羅性チェックをごまかさないでください。")
}
`,
    },
    {
      description: 'push 通知は [PUSH] タイトル の形式でフォーマットされる',
      assertion: `
const p = format({ kind: "push", deviceId: "dev-1", title: "新着のお知らせ" })
if (p !== "[PUSH] 新着のお知らせ") throw new Error("push の format は \\"[PUSH] タイトル\\" の形式のはずです。got: " + p)
`,
    },
    {
      description: 'push の宛先は deviceId・本文上限は 100 文字になっている',
      assertion: `
const d = destinationOf({ kind: "push", deviceId: "dev-42", title: "t" })
if (d !== "dev-42") throw new Error("push の宛先は deviceId のはずです。got: " + d)
const c = charLimitOf({ kind: "push", deviceId: "dev-1", title: "t" })
if (c !== 100) throw new Error("push の本文上限は 100 のはずです。got: " + c)
`,
    },
    {
      description: '既存機能: email と SMS の挙動が変わっていない',
      assertion: `
if (format({ kind: "email", to: "a@example.com", subject: "件名", body: "" }) !== "[EMAIL] 件名 → a@example.com") throw new Error("既存の format(email) の出力が変わっています。")
if (destinationOf({ kind: "sms", to: "090-1111-2222", body: "x" }) !== "090-1111-2222") throw new Error("既存の destinationOf(sms) が変わっています。")
if (charLimitOf({ kind: "email", to: "a", subject: "s", body: "" }) !== 5000) throw new Error("既存の charLimitOf(email) の値が変わっています。")
if (charLimitOf({ kind: "sms", to: "a", body: "" }) !== 70) throw new Error("既存の charLimitOf(sms) の値が変わっています。")
`,
    },
    {
      description: '既存機能: 設定の部分更新が壊れていない',
      assertion: `
const m = mergeSettings({ theme: "light", emailEnabled: true, smsEnabled: false }, { theme: "dark" })
if (m.theme !== "dark" || m.emailEnabled !== true) throw new Error("既存の mergeSettings の挙動が変わっています。")
`,
    },
  ],
}
