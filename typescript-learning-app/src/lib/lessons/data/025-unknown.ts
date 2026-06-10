import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '025-unknown',
  title: 'unknown 型',
  description:
    '`unknown` は **`any` の安全な代替**です。`any` は「何でもアリ」で型チェックを素通りさせてしまいますが、`unknown` は「中身が何か分からない」値を表し、**まず絞り込まないと使えません**。たとえば `unknown` 型の値にいきなり `.toUpperCase()` を呼ぶとコンパイルエラーになり、`if (typeof value === "string")` で絞り込んで初めて文字列として扱えます。外部から来る素性の知れないデータ（API レスポンスなど）を安全に扱うときの出発点になります。',
  challenge:
    '関数 `describe` の引数 `value` の型を、`any` ではなく **`unknown`** にしてください。`unknown` でも、中の `typeof` による絞り込みがあるので安全に処理できます。',
  hint: `引数の型を unknown にします。\n\nfunction describe(value: unknown): string {\n  ...\n}`,
  initialCode: `function describe(value: any): string {
  if (typeof value === "string") {
    return "文字列: " + value
  }
  if (typeof value === "number") {
    return "数値: " + value
  }
  return "不明"
}`,
  testCases: [
    {
      description: '引数 value の型が unknown になっている',
      assertion: `
if (!/value[ \t]*:[ \t]*unknown/.test(__originalCode__)) {
  throw new Error("引数 value の型を any ではなく unknown にしてください。")
}
`,
    },
    {
      description: '文字列を説明できる',
      assertion: `
const r = describe("hello")
if (r !== "文字列: hello") throw new Error("describe('hello') が '文字列: hello' を返しませんでした。got: " + r)
`,
    },
    {
      description: '数値を説明できる',
      assertion: `
const r = describe(42)
if (r !== "数値: 42") throw new Error("describe(42) が '数値: 42' を返しませんでした。got: " + r)
`,
    },
    {
      description: 'それ以外は不明を返す',
      assertion: `
const r = describe(true)
if (r !== "不明") throw new Error("describe(true) が '不明' を返しませんでした。got: " + r)
`,
    },
  ],
}
