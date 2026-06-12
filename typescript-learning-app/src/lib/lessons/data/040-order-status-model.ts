import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '040-order-status-model',
  title: '要件を型にする — 注文ステータス設計',
  scenario:
    'あなたは近所のカフェ「TonariCafe」の注文管理ツールを新規開発することになりました。店長の依頼は「注文の状態をコードで正しく管理したい、今は文字列で適当に入れていて打ち間違いが怖い」とのことです。まずはドメインの言葉を型にする、新規開発の最初の一歩です（目安: 10分）。',
  requirements: [
    '注文ステータスは `pending`（受付）・`paid`（支払済）・`served`（提供済）・`cancelled`（キャンセル）の4種類だけを許す',
    'ステータス一覧 `ALL_STATUSES` の宣言行は変更しない（判定で使います）',
    'キャンセルできるのは提供前（`pending` か `paid`）の注文だけ',
    '`any` やキャストで型検査をごまかさない',
  ],
  description:
    'TypeScript の現場では、「とりうる値が決まっている文字列」を `string` のまま扱わず**リテラル Union 型**にするのが鉄則です。リテラル Union にすれば、ステータスの打ち間違いは実行する前にコンパイルの時点で型エラーになり、レビューで人間が目を凝らす必要がなくなります。要件の言葉をそのまま型に写し取ることが、新規開発における仕様の第一防衛線になります。',
  challenge:
    '仮実装の `type OrderStatus = string` を、要件どおり4つのリテラルの Union 型に置き換えてください。続けて `canCancel` を「提供前ならキャンセル可」という業務ルールどおりに実装してください。`ALL_STATUSES` の宣言行は変更しないでください。',
  hint: `リテラル Union は「値そのもの」を型として | で並べます。\n\ntype OrderStatus = "pending" | "paid" | "served" | "cancelled"\n\ncanCancel は order.status を "pending"・"paid" と比較します（=== と || を使います）。`,
  initialCode: `// ===== TonariCafe 注文管理 — STEP 1: ステータスの型設計 =====

// TODO: 要件に合わせてリテラル Union に置き換えてください（仮実装: string）
type OrderStatus = string

type Order = {
  id: number
  items: string[]
  status: OrderStatus
}

// 全ステータスの一覧（この行は変更しないでください。判定で使います）
const ALL_STATUSES: OrderStatus[] = ["pending", "paid", "served", "cancelled"]

// 業務ルール: キャンセルできるのは「提供前」だけ
function canCancel(order: Order): boolean {
  return false // TODO: 仮実装を直してください
}

const order: Order = { id: 1, items: ["latte"], status: "pending" }
console.log(canCancel(order), ALL_STATUSES.length)`,
  testCases: [
    {
      description: '注文ステータスが4つの値だけを許すリテラル Union 型で宣言されている',
      assertion: `
if (!/type[ \\t]+OrderStatus[ \\t\\r\\n]*=[ \\t\\r\\n|]*(["'][^"']*["'][ \\t\\r\\n]*\\|[ \\t\\r\\n]*){3}["'][^"']*["']/.test(__originalCode__)) {
  throw new Error("type OrderStatus を 4つの文字列リテラルの Union（\\"pending\\" | \\"paid\\" | \\"served\\" | \\"cancelled\\"）に置き換えてください。")
}
`,
    },
    {
      description: '4つのステータス名がすべて一覧 ALL_STATUSES に入っている',
      assertion: `
if (!/ALL_STATUSES[ \\t]*:[ \\t]*OrderStatus[ \\t]*\\[\\]/.test(__originalCode__)) {
  throw new Error("ALL_STATUSES の宣言（: OrderStatus[]）は変更しないでください。")
}
if (ALL_STATUSES.length !== 4) throw new Error("ALL_STATUSES は4要素のはずです。got: " + ALL_STATUSES.length)
for (const s of ["pending", "paid", "served", "cancelled"]) {
  if (!ALL_STATUSES.includes(s)) throw new Error("ALL_STATUSES に \\"" + s + "\\" がありません。")
}
`,
    },
    {
      description: '提供前（pending・paid）の注文だけキャンセルできる',
      assertion: `
if (canCancel({ id: 1, items: [], status: "pending" }) !== true) throw new Error("pending の注文はキャンセルできるはずです。")
if (canCancel({ id: 2, items: [], status: "paid" }) !== true) throw new Error("paid の注文はキャンセルできるはずです。")
if (canCancel({ id: 3, items: [], status: "served" }) !== false) throw new Error("served の注文はキャンセルできないはずです。")
if (canCancel({ id: 4, items: [], status: "cancelled" }) !== false) throw new Error("cancelled の注文はキャンセルできないはずです。")
`,
    },
    {
      description: 'any やキャストで型検査をごまかしていない',
      assertion: `
if (/\\bas[ \\t]+(any|unknown|const)\\b/.test(__originalCode__) || /:[ \\t]*any\\b/.test(__originalCode__)) {
  throw new Error("as や any で型検査を黙らせず、OrderStatus の型そのものを直してください。")
}
`,
    },
  ],
}
