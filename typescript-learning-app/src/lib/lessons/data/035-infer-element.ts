import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '035-infer-element',
  title: 'infer 応用 — 配列の要素型',
  description:
    '`infer` は関数の戻り値以外にも使えます。**配列型のパターン** `(infer E)[]` を `extends` に書くと、「`T` が配列なら、その**要素の型**を `E` として取り出す」型が作れます。同じ発想で `Promise<infer V>` から中身の型を取り出すなど、**「コンテナの中身の型」を抜き出す**のは infer の代表的な使い方です。',
  challenge:
    '配列型 `T` から**要素の型**を取り出す型 `ElementType<T>` を、`(infer E)[]` パターンで完成させてください。`typeof scores`（`number[]`）から `number` が取り出せるようになります。',
  hint: `配列型のパターンは (infer E)[] と書きます（カッコを忘れずに）。\n\ntype ElementType<T> = T extends (infer E)[] ? E : never`,
  initialCode: `// ElementType<T> を infer で完成させてください（仮実装: unknown）
type ElementType<T> = unknown

const scores = [70, 85, 90]

// scores の要素型（number）を取り出して使う
const first: ElementType<typeof scores> = scores[0]
console.log(first)`,
  testCases: [
    {
      description: 'ElementType<T> が (infer E)[] パターンの条件型で定義されている',
      assertion: `
if (!/type[ \t]+ElementType[ \t]*<[ \t]*T[ \t]*>[ \t]*=[ \t]*T[ \t]+extends[ \t]*\\([ \t]*infer[ \t]+\\w+[ \t]*\\)[ \t]*\\[[ \t]*\\][ \t]*\\?/.test(__originalCode__)) {
  throw new Error("T extends (infer E)[] ? E : never のように、配列パターンに infer を置いてください。")
}
`,
    },
    {
      description: '取り出した型の変数に正しい値が入る',
      assertion: `
if (first !== 70) throw new Error("first は scores[0]（70）のはずです。got: " + first)
`,
    },
  ],
}
