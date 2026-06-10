import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '027-never-exhaustiveness',
  title: 'never 型と網羅性チェック',
  description:
    '`never` は「**決して起こらない**」ことを表す型です。判別可能 Union を `switch` で分岐するとき、`default` で `const _: never = shape` と書いておくと、**すべての case を処理し終えていれば** `shape` の型は `never` になり、この代入が通ります。逆に処理し忘れた case があると `shape` は `never` ではなくなり、**コンパイルエラー**で「対応漏れ」を教えてくれます。新しい種類を追加したときの実装漏れを、型が自動で発見してくれる仕組みです。',
  challenge:
    '`Shape` に `"triangle"`（底辺 `base` と高さ `height`）が追加されましたが、`area` が対応していないため `default` の `never` 代入がコンパイルエラーになっています。`"triangle"` の case を追加し、**`(base * height) / 2`** を返して網羅性を満たしてください。',
  hint: `triangle の case を追加します。\n\ncase "triangle":\n  return (shape.base * shape.height) / 2`,
  initialCode: `type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "triangle"; base: number; height: number }

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius * shape.radius
    case "square":
      return shape.size * shape.size
    default: {
      const _exhaustive: never = shape
      return _exhaustive
    }
  }
}`,
  testCases: [
    {
      description: '網羅性チェック（never への代入）を残している',
      assertion: `
if (!/:[ \t]*never/.test(__originalCode__)) {
  throw new Error("default の const _exhaustive: never = shape を残してください（網羅性チェック）。")
}
`,
    },
    {
      description: '三角形の面積を返す',
      assertion: `
const r = area({ kind: "triangle", base: 4, height: 3 })
if (r !== 6) throw new Error("area(triangle, base=4, height=3) が 6 を返しませんでした。got: " + r)
`,
    },
    {
      description: '既存の円・正方形も引き続き動く',
      assertion: `
if (Math.abs(area({ kind: "circle", radius: 1 }) - Math.PI) > 1e-9) {
  throw new Error("area(circle, radius=1) が π を返しませんでした。")
}
if (area({ kind: "square", size: 4 }) !== 16) {
  throw new Error("area(square, size=4) が 16 を返しませんでした。")
}
`,
    },
  ],
}
