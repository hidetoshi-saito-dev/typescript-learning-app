import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '021-partial-required',
  title: 'Partial<T> / Required<T>',
  description:
    '`Partial<T>` は、ある型 `T` の**すべてのプロパティを任意（省略可能）**にした型を作ります。「一部だけ更新したい」更新パッチのような場面で活躍します。たとえば `Partial<User>` 型なら `{ age: 21 }` のように一部のプロパティだけを持つオブジェクトを渡せます。逆に **`Required<T>`** は、任意プロパティをすべて**必須**にした型を作ります（`Partial` の反対）。',
  challenge:
    '関数 `updateUser` の引数 `patch` の型を **`Partial<User>`** にして、`User` の一部のプロパティだけを更新できるようにしてください。中の `{ ...user, ...patch }` はそのままで構いません。',
  hint: `patch の型を Partial<User> にします。\n\nfunction updateUser(user: User, patch: Partial<User>): User {\n  return { ...user, ...patch }\n}`,
  initialCode: `type User = { name: string; age: number }

function updateUser(user: User, patch) {
  return { ...user, ...patch }
}`,
  testCases: [
    {
      description: 'patch の型に Partial<User> を使っている',
      assertion: `
if (!/Partial[ \t]*<[ \t]*User/.test(__originalCode__)) {
  throw new Error("patch の型を Partial<User> にしてください。")
}
`,
    },
    {
      description: '年齢だけを更新できる',
      assertion: `
const r = updateUser({ name: "Bob", age: 20 }, { age: 21 })
if (r.name !== "Bob" || r.age !== 21) {
  throw new Error("一部更新の結果が正しくありません。got: " + JSON.stringify(r))
}
`,
    },
    {
      description: '名前だけを更新できる',
      assertion: `
const r = updateUser({ name: "Bob", age: 20 }, { name: "Carol" })
if (r.name !== "Carol" || r.age !== 20) {
  throw new Error("一部更新の結果が正しくありません。got: " + JSON.stringify(r))
}
`,
    },
  ],
}
