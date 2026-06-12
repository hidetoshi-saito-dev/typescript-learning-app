import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '045-notify-retry-async',
  title: '非同期送信とジェネリックなリトライ',
  scenario:
    'Notifier の最終 STEP です（既存コードは型定義と format に縮約しています）。本番から「送信 API がたまに失敗する」という障害報告が来ました。チームの方針は「失敗したら数回まで再試行する」。どんな型の Promise でも再試行できる汎用ユーティリティ `retry` を作ります——ジェネリクスと非同期の合流点、機能追加の総仕上げです（目安: 15分）。',
  requirements: [
    '`retry` はどんな型の Promise でも扱えるジェネリック関数にする（型引数は `T` と名付ける）',
    '`times` は**総試行回数**: 成功したら即座にその値を返し、それ以上 `fn` を呼ばない',
    '全部失敗したら最後のエラーを投げる（握りつぶさない）',
    '既存の push フォーマットの挙動を変えない',
  ],
  description:
    'ジェネリクス（014）×非同期（030）の合流点です。`retry<T>(fn: () => Promise<T>, times: number): Promise<T>` という署名は「fn が返す Promise の中身が何型でも、retry は同じ型をそのまま返す」と読みます。仮実装のように `string` 専用で書くと、数値や通知オブジェクトを返す送信には使えません——**汎用ユーティリティの型はジェネリクスで書く**のが実務の定石です。動作の検証はタイマーではなく「呼ばれた回数を数えるモック関数」で行います（受け入れ条件参照）。',
  challenge:
    '`retry` をジェネリック関数にして、再試行を実装してください。型引数は `T` と名付け、`fn: () => Promise<T>`・戻り値 `Promise<T>` の署名にします。`for` ループと `try/catch` で、成功したらその値を返し、失敗したら次の試行へ、全滅したら最後のエラーを `throw` します。',
  hint: `async function retry<T>(fn: () => Promise<T>, times: number): Promise<T> {\n  let lastError: unknown\n  for (let i = 0; i < times; i++) {\n    try {\n      return await fn()\n    } catch (e) {\n      lastError = e\n    }\n  }\n  throw lastError\n}\n\nasync 関数にすると中で await が使え、戻り値は自動で Promise<T> に包まれます。`,
  initialCode: `// ===== Notifier — 機能追加: 送信リトライ =====
// （既存コードは型定義と format に縮約。destinationOf 等は変更がないため省略）

type Notice =
  | { kind: "email"; to: string; subject: string; body: string }
  | { kind: "sms"; to: string; body: string }
  | { kind: "push"; deviceId: string; title: string }

function format(n: Notice): string {
  switch (n.kind) {
    case "email":
      return "[EMAIL] " + n.subject + " → " + n.to
    case "sms":
      return "[SMS] " + n.body.slice(0, 20) + " → " + n.to
    case "push":
      return "[PUSH] " + n.title
    default: {
      const _exhaustive: never = n
      return _exhaustive
    }
  }
}

// 送信 API は失敗することがある（ネットワークの実務あるある）
// TODO: どんな型の Promise でも再試行できるよう、ジェネリックにして再試行を実装してください
// （仮実装: string 専用＆再試行なし）
function retry(fn: () => Promise<string>, times: number): Promise<string> {
  return fn()
}

// 使用例: 送信が一時的に失敗しても times 回まで試行する
async function demo(): Promise<void> {
  const sent = await retry(() => Promise.resolve(format({ kind: "push", deviceId: "d", title: "hi" })), 3)
  console.log(sent)
}

demo()`,
  testCases: [
    {
      description: 'retry はどんな型の Promise でも扱えるジェネリック関数になっている（型引数 T）',
      assertion: `
if (!/retry[ \\t]*<[ \\t]*T[ \\t]*>[ \\t]*\\(/.test(__originalCode__)) {
  throw new Error("retry に型引数 T を付けてください（function retry<T>(...) の形）。")
}
if (!/fn[ \\t]*:[ \\t]*\\([ \\t]*\\)[ \\t]*=>[ \\t]*Promise[ \\t]*<[ \\t]*T[ \\t]*>/.test(__originalCode__)) {
  throw new Error("fn の型は () => Promise<T> にしてください。")
}
if (!/\\)[ \\t]*:[ \\t]*Promise[ \\t]*<[ \\t]*T[ \\t]*>/.test(__originalCode__)) {
  throw new Error("retry の戻り値の型は Promise<T> にしてください。")
}
`,
    },
    {
      description: '失敗する送信も times 回までの再試行で成功する（2回失敗→3回目成功）',
      assertion: `
let calls = 0
const flaky = () => {
  calls++
  return calls < 3 ? Promise.reject(new Error("network error")) : Promise.resolve("ok")
}
const result = await retry(flaky, 3)
if (result !== "ok") throw new Error("2回失敗しても3回目で成功するはずです。got: " + result)
if (calls !== 3) throw new Error("ちょうど3回呼ばれるはずです。got: " + calls + "回")
`,
    },
    {
      description: '一度で成功する送信は1回しか呼ばれない（むだな再試行をしない）',
      assertion: `
let calls = 0
const stable = () => {
  calls++
  return Promise.resolve("sent")
}
const result = await retry(stable, 5)
if (result !== "sent") throw new Error("成功した値がそのまま返るはずです。got: " + result)
if (calls !== 1) throw new Error("成功したら再試行しないはずです。got: " + calls + "回")
`,
    },
    {
      description: 'すべて失敗したらエラーが呼び出し側に伝わる（握りつぶさない）',
      assertion: `
let calls = 0
const broken = () => {
  calls++
  return Promise.reject(new Error("dead"))
}
let threw = false
try {
  await retry(broken, 2)
} catch (e) {
  threw = true
}
if (!threw) throw new Error("全滅したらエラーを throw するはずです。")
if (calls !== 2) throw new Error("times = 2 なら2回だけ試すはずです。got: " + calls + "回")
`,
    },
    {
      description: '既存機能: push フォーマットの挙動が変わっていない',
      assertion: `
if (format({ kind: "push", deviceId: "d", title: "新着" }) !== "[PUSH] 新着") throw new Error("既存の format(push) の出力が変わっています。")
`,
    },
  ],
}
