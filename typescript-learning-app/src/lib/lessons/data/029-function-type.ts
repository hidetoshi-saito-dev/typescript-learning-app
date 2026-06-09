import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '029-function-type',
  title: '関数型（コールシグネチャ）',
  description:
    '関数そのものにも型をつけられます。**`(n: number) => number`** は「数値を1つ受け取って数値を返す関数」を表す型です。これを `type Mapper = (n: number) => number` のように名前を付けておくと、高階関数（関数を引数に取る関数）の引数に型をつけられます。コールバックの形が型で保証されるので、渡し間違いを防げます。',
  challenge:
    '関数 `mapNumbers` の引数 `fn` の型を **`Mapper`**（= `(n: number) => number`）にして、配列の各要素に `fn` を適用するようにしてください。`numbers.map(fn)` を返します。',
  hint: `fn の型を Mapper にして map に渡します。\n\nfunction mapNumbers(numbers: number[], fn: Mapper): number[] {\n  return numbers.map(fn)\n}`,
  initialCode: `type Mapper = (n: number) => number

function mapNumbers(numbers: number[], fn): number[] {
  return numbers
}`,
  testCases: [
    {
      description: 'fn の型に Mapper（関数型）を使っている',
      assertion: `
if (!/fn[ \t]*:[ \t]*Mapper/.test(__originalCode__)) {
  throw new Error("引数 fn の型を Mapper にしてください。")
}
`,
    },
    {
      description: '各要素に関数を適用する（2倍）',
      assertion: `
const r = mapNumbers([1, 2, 3], (n) => n * 2)
if (JSON.stringify(r) !== JSON.stringify([2, 4, 6])) {
  throw new Error("mapNumbers([1,2,3], n=>n*2) が [2,4,6] を返しませんでした。got: " + JSON.stringify(r))
}
`,
    },
  ],
}
