import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '026-discriminated-union',
  title: '判別可能な Union 型',
  description:
    '**判別可能な Union 型（Discriminated Union）** は、各メンバーに共通の**判別タグ**（ここでは `kind`）を持たせた Union です。`switch (shape.kind)` のようにタグで分岐すると、各 `case` の中で TypeScript が型を自動的に絞り込み、そのメンバー固有のプロパティ（`circle` なら `radius`）に安全にアクセスできます。タグを使わずに `radius` を読もうとすると、`square` には `radius` が無いためコンパイルエラーになります。',
  challenge:
    '関数 `area` を完成させてください。`shape.kind` で分岐し、`"circle"` なら **`Math.PI * radius * radius`**、`"square"` なら **`size * size`** を返します。',
  hint: `shape.kind で分岐します。\n\nfunction area(shape: Shape): number {\n  if (shape.kind === "circle") {\n    return Math.PI * shape.radius * shape.radius\n  }\n  return shape.size * shape.size\n}`,
  initialCode: `type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }

function area(shape: Shape): number {
  return 0
}`,
  testCases: [
    {
      description: '円の面積を返す',
      assertion: `
const r = area({ kind: "circle", radius: 2 })
if (Math.abs(r - Math.PI * 4) > 1e-9) {
  throw new Error("area(circle, radius=2) が π×4 を返しませんでした。got: " + r)
}
`,
    },
    {
      description: '正方形の面積を返す',
      assertion: `
const r = area({ kind: "square", size: 3 })
if (r !== 9) throw new Error("area(square, size=3) が 9 を返しませんでした。got: " + r)
`,
    },
  ],
}
