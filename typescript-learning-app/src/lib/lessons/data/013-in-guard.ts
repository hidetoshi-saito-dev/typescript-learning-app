import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '013-in-guard',
  title: 'in 演算子による型ガード',
  description:
    'オブジェクトの Union 型を扱うとき、`in` 演算子を使うと**特定のプロパティを持っているかどうか**で型を絞り込めます。たとえば `if ("swim" in animal)` と書くと、その if ブロック内では `animal` がそのプロパティを持つ型に絞り込まれます。',
  challenge:
    '`type Fish` と `type Bird` がすでに定義されています。関数 `move` の引数 `animal` は `Fish | Bird` 型です。`in` 演算子で **`swim` プロパティを持つかどうか** を確認し、Fish なら `animal.swim()`、Bird なら `animal.fly()` を返してください。',
  hint: `in 演算子でプロパティの存在を確認します。\n\nif ("swim" in animal) {\n  return animal.swim()\n}\nreturn animal.fly()`,
  initialCode: `type Fish = { swim: () => string }
type Bird = { fly: () => string }

function move(animal: Fish | Bird) {
  return animal.swim()
}`,
  testCases: [
    {
      description: 'in 演算子による型ガードが使われている',
      assertion: `
const hasInGuard =
  /["']swim["'][ \t]+in[ \t]+animal/.test(__rawCode__) ||
  /["']fly["'][ \t]+in[ \t]+animal/.test(__rawCode__)
if (!hasInGuard) {
  throw new Error("'swim' in animal のような in 演算子による型ガードを使ってください。")
}
`,
    },
    {
      description: 'Fish を渡すと swim() の結果が返る',
      assertion: `
const r = move({ swim: () => "泳いでいる" })
if (r !== "泳いでいる") throw new Error("Fish を渡したとき swim() の結果 '泳いでいる' を返しませんでした。got: " + r)
`,
    },
    {
      description: 'Bird を渡すと fly() の結果が返る',
      assertion: `
const r = move({ fly: () => "飛んでいる" })
if (r !== "飛んでいる") throw new Error("Bird を渡したとき fly() の結果 '飛んでいる' を返しませんでした。got: " + r)
`,
    },
  ],
}
