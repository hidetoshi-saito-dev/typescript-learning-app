import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '002-number-boolean',
  title: '数値型と真偽値型',
  description:
    'TypeScript には `string` 以外にも `number`（数値）と `boolean`（真偽値）という**プリミティブ型**があります。引数に正しい型注釈をつけることで、数値の代わりに文字列が渡されるなどの誤りを**コンパイル前**に検出できます。',
  challenge:
    '関数 `describe` の引数 `age` に `: number` を、引数 `active` に `: boolean` という型注釈を追加してください。',
  hint: `引数が複数ある場合も、それぞれの引数名の直後に : 型名 を書きます。\n\nfunction describe(age: number, active: boolean) {\n  ...\n}`,
  initialCode: `function describe(age, active) {
  return active ? age + "歳（アクティブ）" : age + "歳"
}`,
  testCases: [
    {
      description: 'age に : number の型注釈が書かれている',
      // [ \t] は半角スペース・タブのみ（\s は全角スペースにもマッチするため使用しない）
      assertion: `
if (!/age[ \t]*:[ \t]*number/.test(__originalCode__)) {
  throw new Error("age の型注釈が正しくありません。age: number と半角文字で書いてください。")
}
`,
    },
    {
      description: 'active に : boolean の型注釈が書かれている',
      assertion: `
if (!/active[ \t]*:[ \t]*boolean/.test(__originalCode__)) {
  throw new Error("active の型注釈が正しくありません。active: boolean と半角文字で書いてください。")
}
`,
    },
    {
      description: '関数が正しく動作する',
      assertion: `
const r1 = describe(20, true)
if (r1 !== "20歳（アクティブ）") throw new Error("describe(20, true) が '20歳（アクティブ）' を返しませんでした。got: " + r1)
const r2 = describe(30, false)
if (r2 !== "30歳") throw new Error("describe(30, false) が '30歳' を返しませんでした。got: " + r2)
`,
    },
  ],
}
