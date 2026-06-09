import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '012-typeof-guard',
  title: 'typeof 型ガード',
  description:
    'Union 型の値を扱うとき、`typeof` 演算子を使うと**実行時に型を絞り込む**ことができます。たとえば `string | number` を受け取る関数の中で `if (typeof value === "string")` と書くと、その if ブロック内では `value` が `string` 型として扱われ、文字列専用のメソッド（例: `.toUpperCase()`）が呼べるようになります。',
  challenge:
    '関数 `format` は `string | number` を受け取り、文字列なら **大文字化**、数値なら **小数点以下2桁の文字列**を返します。`typeof value === "string"` で **型を絞り込んで** `.toUpperCase()` や `.toFixed(2)` が型エラーにならないようにしてください。',
  hint: `typeof で型ガードできます。\n\nif (typeof value === "string") {\n  return value.toUpperCase()\n}\nreturn value.toFixed(2)`,
  initialCode: `function format(value: string | number) {
  return value.toUpperCase()
}`,
  testCases: [
    {
      description: 'typeof による型ガードが使われている',
      assertion: `
const hasTypeofGuard =
  /typeof[ \t]+value[ \t]*===[ \t]*["']string["']/.test(__rawCode__) ||
  /typeof[ \t]+value[ \t]*===[ \t]*["']number["']/.test(__rawCode__)
if (!hasTypeofGuard) {
  throw new Error("typeof value === 'string' のような型ガードを使ってください。")
}
`,
    },
    {
      description: '文字列を渡すと大文字化される',
      assertion: `
const r = format("hello")
if (r !== "HELLO") throw new Error("format('hello') が 'HELLO' を返しませんでした。got: " + r)
`,
    },
    {
      description: '数値を渡すと小数点以下2桁の文字列になる',
      assertion: `
const r = format(3.14159)
if (r !== "3.14") throw new Error("format(3.14159) が '3.14' を返しませんでした。got: " + r)
`,
    },
  ],
}
