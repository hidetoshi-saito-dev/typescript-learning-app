import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '042-order-input-guard',
  title: '外部入力の検証 — unknown から Order へ',
  scenario:
    'TonariCafe の最終 STEP です。前回までの完成形が initialCode に入っています（メニュー機能は紙面の都合で省略しています）。リリース前に店長から「Web フォームからの注文も受け付けたい」と言われました——外から来るデータには何が入っているかわかりません。新規開発の仕上げは、境界の検証です（目安: 15分）。',
  requirements: [
    '外部入力は `unknown` で受け、型述語 `value is Order` の検証関数で絞り込む',
    '`as` や `any` で型を断定しない',
    '正しい注文は ID と品数つきのメッセージで受け付け、不正な値（形が違う・ステータスが不正・null）は拒否する',
    '既存のステータス一覧とキャンセル判定の挙動を変えない',
  ],
  description:
    '028 で学んだ型述語の実務適用です。フォーム入力・API レスポンス・`JSON.parse` の結果——**境界の外から来る値**は、どんな型注釈を書いても実行時には何の保証もありません。実務の鉄則は「境界では `unknown` で受けて、検証してから中に入れる」です。`as Order` と断定すれば型エラーは消えますが実行時に壊れます。型述語なら検証コードそのものが型の証明になり、検証を通った後は安全に `Order` として扱えます。',
  challenge:
    '`isOrder` の戻り値を `value is Order` の型述語に変え、`id` が数値・`items` が文字列の配列・`status` が4種類のステータスのどれか、をすべて検証してください。仕上げに `registerOrder` の受付メッセージを「注文 7 を受け付けました（2品）」の形（ID と品数を埋め込む）に直してください。',
  hint: `オブジェクトかどうか → プロパティの存在 → 各プロパティの型、の順に検証します。in 演算子で存在を確かめると、その後のプロパティアクセスが型エラーになりません。\n\nfunction isOrder(value: unknown): value is Order {\n  if (typeof value !== "object" || value === null) return false\n  if (!("id" in value) || !("items" in value) || !("status" in value)) return false\n  if (typeof value.id !== "number") return false\n  if (!Array.isArray(value.items)) return false\n  if (!value.items.every((item: unknown) => typeof item === "string")) return false\n  return ALL_STATUSES.some((s) => s === value.status)\n}`,
  initialCode: `// ===== 完成済み: STEP 1-2（変更不要・メニュー機能は紙面の都合で省略）=====
type OrderStatus = "pending" | "paid" | "served" | "cancelled"

type Order = {
  id: number
  items: string[]
  status: OrderStatus
}

const ALL_STATUSES: OrderStatus[] = ["pending", "paid", "served", "cancelled"]

function canCancel(order: Order): boolean {
  return order.status === "pending" || order.status === "paid"
}

// ===== STEP 3: 外部入力の検証 =====

// TODO: 戻り値を「value is Order」の型述語にして、本当の検証を実装してください（仮実装: 常に false）
function isOrder(value: unknown): boolean {
  return false
}

// フォームや API から来た「何が入っているかわからない値」の受付窓口
function registerOrder(value: unknown): string {
  if (!isOrder(value)) {
    return "不正な注文です"
  }
  // TODO: 「注文 7 を受け付けました（2品）」の形で ID と品数を返してください
  // （isOrder が boolean のままだと value.id へのアクセスが型エラーになります）
  return "注文を受け付けました"
}

console.log(registerOrder({ id: 1, items: ["latte"], status: "pending" }))`,
  testCases: [
    {
      description: '検証関数は value is Order の型述語になっている（as や any で断定しない）',
      assertion: `
if (!/\\)[ \\t]*:[ \\t]*\\w+[ \\t]+is[ \\t]+Order\\b/.test(__originalCode__)) {
  throw new Error("isOrder の戻り値を「value is Order」の型述語にしてください。")
}
if (/\\bas[ \\t]+(Order|any)\\b/.test(__originalCode__) || /:[ \\t]*any\\b/.test(__originalCode__)) {
  throw new Error("as や any で型を断定せず、検証（型述語）で絞り込んでください。")
}
`,
    },
    {
      description: '正しい形の注文は ID と品数つきのメッセージで受け付けられる',
      assertion: `
const okMsg = registerOrder({ id: 7, items: ["latte", "tea"], status: "paid" })
if (okMsg !== "注文 7 を受け付けました（2品）") throw new Error("正しい注文は「注文 7 を受け付けました（2品）」を返すはずです。got: " + okMsg)
`,
    },
    {
      description: '形が違う値・不正なステータス・null は受け付けない',
      assertion: `
if (registerOrder({ id: 8, items: [], status: "flying" }) !== "不正な注文です") throw new Error("存在しないステータスの注文は拒否するはずです。")
if (registerOrder(null) !== "不正な注文です") throw new Error("null は拒否するはずです。")
if (registerOrder({ id: 9, status: "paid" }) !== "不正な注文です") throw new Error("items が無い注文は拒否するはずです。")
if (registerOrder({ id: 10, items: [1, 2], status: "paid" }) !== "不正な注文です") throw new Error("items が文字列の配列でない注文は拒否するはずです。")
`,
    },
    {
      description: '既存機能: ステータス一覧とキャンセル判定の挙動が変わっていない',
      assertion: `
if (ALL_STATUSES.length !== 4) throw new Error("ALL_STATUSES は4要素のはずです。")
if (canCancel({ id: 1, items: [], status: "pending" }) !== true) throw new Error("既存の canCancel の挙動が変わっています（pending はキャンセル可のはず）。")
if (canCancel({ id: 2, items: [], status: "cancelled" }) !== false) throw new Error("既存の canCancel の挙動が変わっています（cancelled はキャンセル不可のはず）。")
`,
    },
  ],
}
