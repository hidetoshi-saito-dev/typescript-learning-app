import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '028-type-predicate',
  title: 'ユーザー定義型ガード（型述語 is）',
  description:
    '戻り値の型を **`value is string`** のように書いた関数を **ユーザー定義型ガード（型述語）** と呼びます。`typeof` や `in` では表せない独自の判定ロジックを、型の絞り込みに反映できます。たとえば `isString` を `filter` に渡すと、TypeScript は「通過した要素は `string` だ」と理解し、続く `.toUpperCase()` を型エラーなく呼べます。戻り値の型を単なる `boolean` にすると絞り込みが効かず、`.toUpperCase()` でエラーになります。',
  challenge:
    '関数 `isString` の戻り値の型を、`boolean` ではなく **`value is string`**（型述語）にしてください。これで `filter(isString)` の後に `.toUpperCase()` が安全に呼べるようになります。',
  hint: `戻り値の型を value is string にします。\n\nfunction isString(value: unknown): value is string {\n  return typeof value === "string"\n}`,
  initialCode: `function isString(value: unknown): boolean {
  return typeof value === "string"
}

function shout(values: unknown[]): string[] {
  return values.filter(isString).map((s) => s.toUpperCase())
}`,
  testCases: [
    {
      description: '型述語 value is string を使っている',
      assertion: `
if (!/is[ \t]+string/.test(__originalCode__)) {
  throw new Error("isString の戻り値の型を value is string（型述語）にしてください。")
}
`,
    },
    {
      description: '文字列だけを大文字化する',
      assertion: `
const r = shout(["a", "b"])
if (JSON.stringify(r) !== JSON.stringify(["A", "B"])) {
  throw new Error("shout(['a','b']) が ['A','B'] を返しませんでした。got: " + JSON.stringify(r))
}
`,
    },
    {
      description: '文字列以外が混ざっていても文字列だけ処理する',
      assertion: `
const r = shout(["a", 1, "b", true])
if (JSON.stringify(r) !== JSON.stringify(["A", "B"])) {
  throw new Error("混在配列から文字列だけ大文字化できていません。got: " + JSON.stringify(r))
}
`,
    },
  ],
}
