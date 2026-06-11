import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '032-conditional-type',
  title: '条件型の基礎',
  description:
    '**条件型（Conditional Types）**は「型の if 文」です。`T extends U ? X : Y` と書くと、「`T` が `U` に代入可能なら `X`、そうでなければ `Y`」という型になります。たとえば `T extends string ? true : false` は、`T` が文字列型のとき `true` 型、それ以外のとき `false` 型になります。型の世界で分岐ができると、「入力の型に応じて出力の型が変わる」柔軟な設計が可能になります。',
  challenge:
    '型 `IsString<T>` を**条件型**で完成させてください。`T` が `string` に代入可能なら `true` 型、そうでなければ `false` 型になるようにします。仮実装の `boolean` のままでは「true かもしれないし false かもしれない」曖昧な型のままです。',
  hint: `extends の左に判定したい型変数、右に比較先の型を書き、? と : で分岐します。\n\ntype IsString<T> = T extends string ? true : false`,
  initialCode: `// IsString<T> を条件型にしてください（仮実装: boolean）
type IsString<T> = boolean

// IsString が正しく定義できていれば、これらの代入は型チェックを通ります
const a: IsString<string> = true
const b: IsString<number> = false
const c: IsString<"hello"> = true

console.log(a, b, c)`,
  testCases: [
    {
      description: 'IsString<T> が条件型（T extends string ? true : false）で定義されている',
      assertion: `
if (!/type[ \t]+IsString[ \t]*<[ \t]*T[ \t]*>[ \t]*=[ \t]*T[ \t]+extends[ \t]+string[ \t]*\\?[ \t]*true[ \t]*:[ \t]*false/.test(__originalCode__)) {
  throw new Error("IsString<T> を T extends string ? true : false の条件型で定義してください。")
}
`,
    },
    {
      description: '判定結果の値が正しい',
      assertion: `
if (a !== true) throw new Error("a は true であるべきです。got: " + a)
if (b !== false) throw new Error("b は false であるべきです。got: " + b)
if (c !== true) throw new Error("c は true であるべきです。got: " + c)
`,
    },
  ],
}
