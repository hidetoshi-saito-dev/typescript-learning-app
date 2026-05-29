import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '008-type-alias',
  title: 'type エイリアス',
  description:
    '`type` キーワードを使うと、型に**名前（エイリアス）**をつけることができます。同じ型を複数の場所で使いたいときや、複雑な型を読みやすくしたいときに便利です。`type Point = { x: number; y: number }` のように定義します。',
  challenge:
    '`type Point` というエイリアスを定義して、`x` と `y` をそれぞれ `number` 型で持つオブジェクト型を表してください。そして関数 `distance` の引数 `a` と `b` の型をインラインのオブジェクト型から **`Point`** に変更してください。',
  hint: `type キーワードで型に名前をつけます。\n\ntype Point = { x: number; y: number }\n\nfunction distance(a: Point, b: Point) {\n  ...\n}`,
  initialCode: `function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}`,
  testCases: [
    {
      description: 'type Point エイリアスが定義されている',
      assertion: `
if (!/type[ \t]+Point[ \t]*=/.test(__originalCode__)) {
  throw new Error("type Point = ... という型エイリアスを定義してください。")
}
if (!/x[ \t]*:[ \t]*number/.test(__originalCode__)) {
  throw new Error("Point 型に x: number プロパティを定義してください。")
}
if (!/y[ \t]*:[ \t]*number/.test(__originalCode__)) {
  throw new Error("Point 型に y: number プロパティを定義してください。")
}
`,
    },
    {
      description: '引数 a と b に Point 型が使われている',
      assertion: `
if (!/a[ \t]*:[ \t]*Point/.test(__originalCode__)) {
  throw new Error("引数 a の型に Point を使ってください。例: a: Point")
}
if (!/b[ \t]*:[ \t]*Point/.test(__originalCode__)) {
  throw new Error("引数 b の型に Point を使ってください。例: b: Point")
}
`,
    },
    {
      description: '関数が正しく動作する',
      assertion: `
const r = distance({ x: 0, y: 0 }, { x: 3, y: 4 })
if (r !== 5) throw new Error("distance({x:0,y:0},{x:3,y:4}) が 5 を返しませんでした。got: " + r)
`,
    },
  ],
}
