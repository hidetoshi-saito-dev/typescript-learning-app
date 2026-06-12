import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '041-menu-master-satisfies',
  title: 'マスタデータと単一情報源',
  scenario:
    'TonariCafe の STEP 2 です。前回の完成形（模範解答）が initialCode に入っています——自分の解き方と違う部分があれば、まず読んで差分を確かめるところから始めてください（それも実務です）。今回は店長から「メニューと価格の一覧をコードに載せたい、商品IDの打ち間違いも型で防げると嬉しい」という依頼です（目安: 10分）。',
  requirements: [
    'メニュー表 `MENU` は「すべての値が数値」であることをチェックしつつ、どのキーが実在するかの情報を失わない（`satisfies` を使い、型注釈は使わない）',
    '商品 ID の型 `MenuId` はメニュー表そのものから導出する（`keyof typeof`）',
    '`totalOf` は商品 ID の配列を受け取り合計金額を返す（引数の型は `MenuId[]` のまま）',
    '既存のキャンセル判定の挙動を変えない',
  ],
  description:
    '`satisfies` は 038 で学んだ「チェックして、型は広げない」演算子です。実務のマスタデータ（メニュー表・設定値・カラーパレット）では、`satisfies` で値の形をチェックしつつ `keyof typeof` で ID 型を導出する組み合わせが定番です。こうするとメニュー表が**単一情報源**になり、存在しない商品 ID を書いたコードはその場で型エラーになります——「マスタに無い商品は注文できない」を型が保証してくれます。',
  challenge:
    '`MENU` のオブジェクトリテラル直後に `satisfies Record<string, number>` を付けてください（型注釈 `:` は使いません）。次に `MenuId` を `keyof typeof MENU` で導出し、仕上げに `totalOf` で合計金額を計算してください。',
  hint: `const MENU = {\n  latte: 480,\n  tea: 420,\n  mocha: 520,\n} satisfies Record<string, number>\n\ntype MenuId = keyof typeof MENU\n\nfunction totalOf(items: MenuId[]): number {\n  return items.reduce((sum, item) => sum + MENU[item], 0)\n}`,
  initialCode: `// ===== 完成済み: STEP 1 注文ステータス（変更不要）=====
type OrderStatus = "pending" | "paid" | "served" | "cancelled"

type Order = {
  id: number
  items: string[]
  status: OrderStatus
}

function canCancel(order: Order): boolean {
  return order.status === "pending" || order.status === "paid"
}

// ===== STEP 2: メニュー表を単一情報源にする =====

// TODO(1): オブジェクトリテラルの直後に satisfies Record<string, number> を付けてください
const MENU = {
  latte: 480,
  tea: 420,
  mocha: 520,
}

// TODO(2): keyof typeof MENU で導出してください（仮実装: string）
type MenuId = string

// TODO(3): 合計金額を計算してください（仮実装: 0）
function totalOf(items: MenuId[]): number {
  return 0
}

console.log(totalOf(["latte", "tea"]), canCancel({ id: 1, items: ["latte"], status: "paid" }))`,
  testCases: [
    {
      description: 'メニュー表は satisfies で値の形をチェックしている（型注釈は使わない）',
      assertion: `
if (!/MENU[ \\t]*=[ \\t]*\\{[^}]*\\}[ \\t\\r\\n]*satisfies[ \\t]+Record[ \\t]*<[ \\t]*string[ \\t]*,[ \\t]*number[ \\t]*>/.test(__originalCode__)) {
  throw new Error("MENU のオブジェクトリテラル直後に satisfies Record<string, number> を付けてください。")
}
if (/MENU[ \\t]*:[ \\t]*Record/.test(__originalCode__)) {
  throw new Error("MENU の型注釈（: Record<...>）は使わず、satisfies に置き換えてください。")
}
`,
    },
    {
      description: '商品 ID の型はメニュー表から導出されている（keyof typeof）',
      assertion: `
if (!/type[ \\t]+MenuId[ \\t]*=[ \\t]*keyof[ \\t]+typeof[ \\t]+MENU\\b/.test(__originalCode__)) {
  throw new Error("type MenuId = keyof typeof MENU の形で、メニュー表から型を導出してください。")
}
if (!/items[ \\t]*:[ \\t]*MenuId[ \\t]*\\[\\]/.test(__originalCode__)) {
  throw new Error("totalOf の引数は items: MenuId[] のままにしてください（string[] に広げない）。")
}
`,
    },
    {
      description: '商品 ID の配列から合計金額が正しく計算される',
      assertion: `
const t1 = totalOf(["latte", "tea"])
if (t1 !== 900) throw new Error("latte(480) + tea(420) = 900 のはずです。got: " + t1)
const t2 = totalOf(["mocha", "mocha", "latte"])
if (t2 !== 1520) throw new Error("mocha(520) + mocha(520) + latte(480) = 1520 のはずです。got: " + t2)
if (MENU.latte !== 480) throw new Error("MENU の価格は変更しないでください。")
`,
    },
    {
      description: '既存機能: キャンセル判定の挙動が変わっていない',
      assertion: `
if (canCancel({ id: 1, items: ["latte"], status: "paid" }) !== true) throw new Error("既存の canCancel の挙動が変わっています（paid はキャンセル可のはず）。")
if (canCancel({ id: 2, items: [], status: "served" }) !== false) throw new Error("既存の canCancel の挙動が変わっています（served はキャンセル不可のはず）。")
`,
    },
  ],
}
