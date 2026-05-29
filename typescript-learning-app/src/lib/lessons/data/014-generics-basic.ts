import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '014-generics-basic',
  title: 'ジェネリクス基本',
  description:
    '**ジェネリクス**は、関数や型を「型をパラメータ化して」再利用できるようにする機能です。`function name<T>(arg: T): T` のように `<T>` という**型変数**を宣言すると、呼び出すたびに別の型として扱えます。`any` と違って、**渡した型と返り値の型を関連付けて**保持できる点が強みです。',
  challenge:
    '関数 `identity` を**ジェネリック関数**として定義してください。型変数 `T` を使い、引数 `value` の型を `T`、戻り値の型も `T` にしてください。実装は `value` をそのまま返します。',
  hint: `関数名のあとに <T> を書いて型変数を宣言します。\n\nfunction identity<T>(value: T): T {\n  return value\n}`,
  initialCode: `function identity(value: any): any {
  return value
}`,
  testCases: [
    {
      description: '型変数 <T> が宣言されている',
      assertion: `
if (!/function[ \t]+identity[ \t]*<[ \t]*T[ \t]*>/.test(__originalCode__)) {
  throw new Error("function identity<T>(...) のように型変数 <T> を宣言してください。")
}
`,
    },
    {
      description: '引数と戻り値の型に T が使われている',
      assertion: `
// "value: T)" または "value: T," を要求し、"value: T | ..." のような Union 型は許容しない
if (!/value[ \t]*:[ \t]*T[ \t]*[,)]/.test(__originalCode__)) {
  throw new Error("引数 value の型を T のみにしてください。例: value: T")
}
// "): T {" を要求し、戻り値も T のみ
if (!/\\)[ \t]*:[ \t]*T[ \t]*\\{/.test(__originalCode__)) {
  throw new Error("戻り値の型を T のみにしてください。例: function identity<T>(value: T): T {")
}
`,
    },
    {
      description: '渡した値がそのまま返る',
      assertion: `
const r1 = identity(42)
if (r1 !== 42) throw new Error("identity(42) が 42 を返しませんでした。got: " + r1)
const r2 = identity("hello")
if (r2 !== "hello") throw new Error("identity('hello') が 'hello' を返しませんでした。got: " + r2)
`,
    },
  ],
}
