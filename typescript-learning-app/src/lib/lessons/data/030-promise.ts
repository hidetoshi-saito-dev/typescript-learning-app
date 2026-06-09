import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '030-promise',
  title: 'Promise<T> 型',
  description:
    '`Promise<T>` は、**いま手元にはないが、いずれ得られる値**（型 `T`）を表す型です。非同期処理（時間のかかる処理）の戻り値はこの形になります。たとえば「少し待ってから文字列を返す」関数の戻り値の型は `Promise<string>` です。値を取り出すときは `await` を使います（`const v = await delay(...)`）。`new Promise((resolve) => ...)` の `resolve(value)` に渡した値が、`await` した側に届きます。',
  challenge:
    '関数 `delay` を、**`Promise<string>`** を返すように完成させてください。`new Promise` を使い、`ms` ミリ秒後に `value` を `resolve` します。戻り値の型注釈も `Promise<string>` にしてください。',
  hint: `setTimeout の中で resolve します。\n\nfunction delay(ms: number, value: string): Promise<string> {\n  return new Promise((resolve) => setTimeout(() => resolve(value), ms))\n}`,
  initialCode: `function delay(ms: number, value: string) {
  return value
}`,
  testCases: [
    {
      description: '戻り値の型に Promise<...> を使っている',
      assertion: `
if (!/Promise[ \t]*</.test(__originalCode__)) {
  throw new Error("delay の戻り値の型を Promise<string> にしてください。")
}
`,
    },
    {
      description: 'Promise を返している',
      assertion: `
const p = delay(5, "x")
if (!p || typeof p.then !== "function") {
  throw new Error("delay は Promise を返す必要があります（new Promise を使ってください）。")
}
`,
    },
    {
      description: 'await すると値が取り出せる',
      assertion: `
const r = await delay(5, "done")
if (r !== "done") throw new Error("await delay(5, 'done') が 'done' になりませんでした。got: " + r)
`,
    },
  ],
}
