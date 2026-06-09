import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '031-awaited-async',
  title: 'async / await と Awaited<T>',
  description:
    '関数に **`async`** を付けると、その関数の戻り値は自動的に `Promise` でラップされます。たとえば `async function f(): Promise<string>` の中で `return "Alice"` と書くだけで、呼び出し側には `Promise<string>` が返ります。中身を取り出すには **`await`** を使います。なお、`Promise<string>` の中身の型は **`Awaited<Promise<string>>`**（= `string`）として取り出せます。`Awaited<T>` は「Promise を剥がした中身の型」を表すユーティリティ型です。',
  challenge:
    '`fetchName` に **`async`** を付けて `Promise<string>` を返すようにし、`greet` の中で **`await fetchName()`** で名前を受け取ってください。`greet` は `"こんにちは、" + name` を返します。',
  hint: `async と await を使います。\n\nasync function fetchName(): Promise<string> {\n  return "Alice"\n}\n\n// greet の中で:\nconst name = await fetchName()`,
  initialCode: `function fetchName(): string {
  return "Alice"
}

async function greet(): Promise<string> {
  const name = fetchName()
  return "こんにちは、" + name
}`,
  testCases: [
    {
      description: 'fetchName を async 関数にしている',
      assertion: `
if (!/async[ \t]+function[ \t]+fetchName/.test(__originalCode__)) {
  throw new Error("fetchName に async を付けて async function fetchName にしてください。")
}
`,
    },
    {
      description: 'await で fetchName の結果を受け取っている',
      assertion: `
if (!/await[ \t]+fetchName/.test(__originalCode__)) {
  throw new Error("greet の中で await fetchName() のように await で受け取ってください。")
}
`,
    },
    {
      description: '挨拶文を返す',
      assertion: `
const r = await greet()
if (r !== "こんにちは、Alice") throw new Error("await greet() が 'こんにちは、Alice' になりませんでした。got: " + r)
`,
    },
  ],
}
