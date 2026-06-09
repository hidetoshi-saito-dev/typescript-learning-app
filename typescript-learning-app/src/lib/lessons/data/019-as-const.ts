import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '019-as-const',
  title: 'const アサーション (as const)',
  description:
    '配列やオブジェクトのリテラルに **`as const`** を付けると、TypeScript はそれを**もっとも狭い型**として扱います。たとえば `const palette = ["primary", "secondary"]` の型は `string[]` ですが、`["primary", "secondary"] as const` と書くと型は `readonly ["primary", "secondary"]` になり、各要素も `"primary"` のような**リテラル型**として固定されます。これにより、配列の値を Union 型の引数に安全に渡せたり、誤った書き換えを型で防げます。',
  challenge:
    '`palette` 配列に **`as const`** を付けて、要素をリテラル型として固定してください（配列の値はそのままで構いません）。',
  hint: `配列リテラルの末尾に as const を付けます。\n\nconst palette = ["primary", "secondary", "accent"] as const`,
  initialCode: `const palette = ["primary", "secondary", "accent"]

function firstColor(): string {
  return palette[0]
}`,
  testCases: [
    {
      description: '配列に as const が付いている',
      assertion: `
if (!/\\][ \t]*as[ \t]+const/.test(__originalCode__)) {
  throw new Error("配列リテラルの末尾に as const を付けてください。")
}
`,
    },
    {
      description: '先頭の色を返す',
      assertion: `
const r = firstColor()
if (r !== "primary") throw new Error("firstColor() が 'primary' を返しませんでした。got: " + r)
`,
    },
  ],
}
