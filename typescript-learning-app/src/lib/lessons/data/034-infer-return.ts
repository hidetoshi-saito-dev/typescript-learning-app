import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '034-infer-return',
  title: 'infer の基礎 — MyReturnType',
  description:
    '`infer` は条件型の `extends` パターンの中に**型変数を置いて「捕まえる」**仕組みです。`T extends (...args: any[]) => infer R ? R : never` と書くと、「`T` が関数型なら、その**戻り値の型**を `R` として取り出す」という意味になります。組み込みの `ReturnType<T>` はこの形そのものです。「型の中から一部分を抜き出す」操作は、ライブラリの型定義を読むときにも頻出します。',
  challenge:
    '関数型 `T` から**戻り値の型**を取り出す型 `MyReturnType<T>` を、`infer` を使って完成させてください。仮実装の `unknown` のままでは、取り出した値を文字列として扱えません。',
  hint: `関数型のパターンを extends に書き、戻り値の位置に infer R を置きます。\n\ntype MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never`,
  initialCode: `// MyReturnType<T> を infer で完成させてください（仮実装: unknown）
type MyReturnType<T> = unknown

function getMessage() {
  return "こんにちは、TypeScript"
}

// getMessage の戻り値の型（string）を取り出して使う
const msg: MyReturnType<typeof getMessage> = getMessage()
console.log(msg)`,
  testCases: [
    {
      description: 'MyReturnType<T> が infer を使った条件型で定義されている',
      assertion: `
if (!/type[ \t]+MyReturnType[ \t]*<[ \t]*T[ \t]*>[ \t]*=[ \t]*T[ \t]+extends[ \t]*\\([^)]*\\)[ \t]*=>[ \t]*infer[ \t]+\\w+/.test(__originalCode__)) {
  throw new Error("T extends (...args: any[]) => infer R ? R : never のように、関数型のパターンに infer を置いてください。")
}
`,
    },
    {
      description: '取り出した型の変数に正しい値が入る',
      assertion: `
if (msg !== "こんにちは、TypeScript") throw new Error("msg が getMessage() の戻り値になっていません。got: " + msg)
`,
    },
  ],
}
