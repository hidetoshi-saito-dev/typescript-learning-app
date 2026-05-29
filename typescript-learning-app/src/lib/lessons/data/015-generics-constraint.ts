import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '015-generics-constraint',
  title: 'ジェネリクス制約 (extends)',
  description:
    'ジェネリクスの型変数を `<T extends 型>` のように書くと、**型変数を制約**できます。これにより、関数内で「`T` は少なくともこの形を持っている」と保証され、共通のプロパティを安全に使えます。たとえば `<T extends { length: number }>` と書くと、`T` 型の値に対して `.length` プロパティが使えるようになります。',
  challenge:
    '関数 `getLength` を、**`length: number` を持つ任意の型** `T` を受け取るジェネリック関数として定義してください。型変数 `T` を **`extends { length: number }`** で制約し、引数 `value` の型を `T`、戻り値で `value.length` を返します。',
  hint: `<T extends { length: number }> と書いて T を制約します。\n\nfunction getLength<T extends { length: number }>(value: T): number {\n  return value.length\n}`,
  initialCode: `function getLength<T>(value: T): number {
  return value.length
}`,
  testCases: [
    {
      description: '型変数 T が { length: number } で制約されている',
      assertion: `
if (!/T[ \t]+extends[ \t]*\\{[ \t]*length[ \t]*:[ \t]*number[ \t;]*\\}/.test(__originalCode__)) {
  throw new Error("T extends { length: number } のように T を制約してください。")
}
`,
    },
    {
      description: '文字列の長さを返す',
      assertion: `
const r = getLength("hello")
if (r !== 5) throw new Error("getLength('hello') が 5 を返しませんでした。got: " + r)
`,
    },
    {
      description: '配列の長さを返す',
      assertion: `
const r = getLength([1, 2, 3, 4])
if (r !== 4) throw new Error("getLength([1,2,3,4]) が 4 を返しませんでした。got: " + r)
`,
    },
  ],
}
