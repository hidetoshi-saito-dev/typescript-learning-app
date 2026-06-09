import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '020-readonly',
  title: 'Readonly<T> と readonly',
  description:
    '`Readonly<T>` は、ある型 `T` の**すべてのプロパティを読み取り専用**にした新しい型を作るユーティリティ型です。たとえば `Readonly<Point>` 型の値は読むことはできても、`point.x = 10` のような**再代入をするとコンパイルエラー**になります。「この関数は引数を書き換えない」という約束を型で表現でき、意図しない変更を防げます。個別のプロパティに付ける `readonly` 修飾子の一括版だと考えると分かりやすいです。',
  challenge:
    '関数 `describe` の引数 `point` の型を **`Readonly<Point>`** にして、関数内で誤って書き換えられないようにしてください（中の処理は変えなくて構いません）。',
  hint: `引数の型を Readonly<Point> にします。\n\nfunction describe(point: Readonly<Point>): string {\n  return point.x + "," + point.y\n}`,
  initialCode: `type Point = { x: number; y: number }

function describe(point: Point): string {
  return point.x + "," + point.y
}`,
  testCases: [
    {
      description: '引数の型に Readonly<...> を使っている',
      assertion: `
if (!/Readonly[ \t]*</.test(__originalCode__)) {
  throw new Error("引数 point の型を Readonly<Point> にしてください。")
}
`,
    },
    {
      description: '座標を文字列化できる',
      assertion: `
const r = describe({ x: 3, y: 4 })
if (r !== "3,4") throw new Error("describe({x:3,y:4}) が '3,4' を返しませんでした。got: " + r)
`,
    },
  ],
}
