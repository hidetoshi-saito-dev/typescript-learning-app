import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '024-record',
  title: 'Record<K, V>',
  description:
    '`Record<K, V>` は、**キーの型 `K`** と **値の型 `V`** から、オブジェクト型を組み立てるユーティリティ型です。たとえば `Record<"yen" | "usd", number>` は `{ yen: number; usd: number }` という型になります。「決められたキー集合すべてに、同じ型の値を持たせる」テーブルやマップを、型で正確に表現できます。キーを足し忘れるとコンパイルエラーになるので、対応漏れも防げます。',
  challenge:
    '為替テーブル `rates` に **`Record<"yen" | "usd", number>`** という型注釈を付けて、`"yen"` と `"usd"` の両方に数値を持つことを型で保証してください（値はそのままで構いません）。',
  hint: `変数に型注釈を付けます。\n\nconst rates: Record<"yen" | "usd", number> = { yen: 150, usd: 1 }`,
  initialCode: `const rates = { yen: 150, usd: 1 }

function getRate(currency: "yen" | "usd"): number {
  return rates[currency]
}`,
  testCases: [
    {
      description: 'rates に Record<...> の型注釈が付いている',
      assertion: `
if (!/Record[ \t]*</.test(__originalCode__)) {
  throw new Error("rates の型注釈を Record<\\"yen\\" | \\"usd\\", number> にしてください。")
}
`,
    },
    {
      description: '通貨で為替レートを引ける',
      assertion: `
if (getRate("yen") !== 150) throw new Error("getRate('yen') が 150 を返しませんでした。got: " + getRate("yen"))
if (getRate("usd") !== 1) throw new Error("getRate('usd') が 1 を返しませんでした。got: " + getRate("usd"))
`,
    },
  ],
}
