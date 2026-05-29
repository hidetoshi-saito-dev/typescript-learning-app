import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '006-union-type',
  title: 'Union型',
  description:
    '複数の型のうちどれかを受け入れたいときは、`型1 | 型2` の形式で **Union 型**を書きます。たとえば `string | number` は文字列または数値のどちらも受け入れます。`|` で区切った型以外が渡されるとエラーになります。',
  challenge:
    '関数 `stringify` の引数 `value` の型を `string | number` という **Union 型**で注釈してください。',
  hint: `Union 型は | で複数の型をつなぎます。\n\nfunction stringify(value: string | number) {\n  ...\n}`,
  initialCode: `function stringify(value) {
  return String(value)
}`,
  testCases: [
    {
      description: 'value に string | number の Union 型注釈がある',
      // [|] はカッコ文字クラス。| をそのまま使うと OR 演算子として解釈されるため [|] を使用
      assertion: `
if (!/value[ \t]*:/.test(__originalCode__)) {
  throw new Error("value パラメーターに型注釈を追加してください。")
}
const hasUnion =
  /string[ \t]*[|][ \t]*number/.test(__originalCode__) ||
  /number[ \t]*[|][ \t]*string/.test(__originalCode__)
if (!hasUnion) {
  throw new Error("value の型注釈に Union 型 string | number を使ってください。")
}
`,
    },
    {
      description: '文字列を渡したとき正しく動作する',
      assertion: `
const r1 = stringify("hello")
if (r1 !== "hello") throw new Error("stringify('hello') が 'hello' を返しませんでした。got: " + r1)
`,
    },
    {
      description: '数値を渡したとき正しく動作する',
      assertion: `
const r2 = stringify(42)
if (r2 !== "42") throw new Error("stringify(42) が '42' を返しませんでした。got: " + r2)
`,
    },
  ],
}
