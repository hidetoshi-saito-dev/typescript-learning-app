import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '022-pick',
  title: 'Pick<T, K>',
  description:
    '`Pick<T, K>` は、ある型 `T` から **`K` で指定したキーだけを抜き出した**新しい型を作ります。`K` にはキー名の文字列リテラル（複数なら Union）を渡します。たとえば `Pick<User, "id" | "name">` は `{ id: number; name: string }` という型になります。大きな型から「画面に出すのはこの一部だけ」という要約型を、元の型に追従させながら作れます。',
  challenge:
    '関数 `toSummary` の戻り値の型を **`Pick<User, "id" | "name">`** にして、`User` から `id` と `name` だけを持つ要約型を表してください。',
  hint: `戻り値の型を Pick<User, "id" | "name"> にします。\n\nfunction toSummary(user: User): Pick<User, "id" | "name"> {\n  return { id: user.id, name: user.name }\n}`,
  initialCode: `type User = { id: number; name: string; email: string; password: string }

function toSummary(user: User) {
  return { id: user.id, name: user.name }
}`,
  testCases: [
    {
      description: '戻り値の型に Pick<User, ...> を使っている',
      assertion: `
if (!/Pick[ \t]*<[ \t]*User/.test(__originalCode__)) {
  throw new Error("戻り値の型を Pick<User, \\"id\\" | \\"name\\"> にしてください。")
}
`,
    },
    {
      description: 'id と name だけを持つ要約を返す',
      assertion: `
const r = toSummary({ id: 1, name: "Alice", email: "a@example.com", password: "secret" })
if (r.id !== 1 || r.name !== "Alice") {
  throw new Error("id と name が正しく取り出せていません。got: " + JSON.stringify(r))
}
if ("password" in r || "email" in r) {
  throw new Error("要約に password や email を含めないでください。got: " + JSON.stringify(r))
}
`,
    },
  ],
}
