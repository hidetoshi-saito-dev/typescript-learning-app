import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '009-literal-type',
  title: 'リテラル型',
  description:
    '`"left"` や `42` のような**値そのもの**を型として使うことができます。これを**リテラル型**と呼びます。Union 型と組み合わせて `"left" | "right" | "center"` のように書くと、特定の値のみを受け入れる型が作れます。これにより、無効な値の混入をコンパイル前に防ぐことができます。',
  challenge:
    '関数 `setAlignment` の引数 `direction` の型を `string` から、`"left"` か `"right"` か `"center"` のみを受け入れる**リテラル Union 型**に変更してください。',
  hint: `文字列リテラルを | で組み合わせます。\n\nfunction setAlignment(direction: "left" | "right" | "center") {\n  ...\n}`,
  initialCode: `function setAlignment(direction: string) {
  return "align: " + direction
}`,
  testCases: [
    {
      description: 'direction の型が string のままでない',
      assertion: `
if (/direction[ \t]*:[ \t]*string[ \t]*[)]/.test(__originalCode__)) {
  throw new Error('direction の型は string から "left" | "right" | "center" のリテラル型に変更してください。')
}
`,
    },
    {
      description: 'direction の型に "left" が含まれている',
      assertion: `
if (!__originalCode__.includes('"left"') && !__originalCode__.includes("'left'")) {
  throw new Error('direction の型に "left" を含むリテラル型を使ってください。例: "left" | "right" | "center"')
}
`,
    },
    {
      description: 'direction の型に "right" と "center" が含まれている',
      assertion: `
if (!__originalCode__.includes('"right"') && !__originalCode__.includes("'right'")) {
  throw new Error('direction の型に "right" を含むリテラル型を使ってください。')
}
if (!__originalCode__.includes('"center"') && !__originalCode__.includes("'center'")) {
  throw new Error('direction の型に "center" を含むリテラル型を使ってください。')
}
`,
    },
    {
      description: '関数が正しく動作する',
      assertion: `
const r = setAlignment("left")
if (r !== "align: left") throw new Error("setAlignment('left') が 'align: left' を返しませんでした。got: " + r)
`,
    },
  ],
}
