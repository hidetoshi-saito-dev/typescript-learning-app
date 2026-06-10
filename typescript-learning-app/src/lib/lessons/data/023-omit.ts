import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '023-omit',
  title: 'Omit<T, K>',
  description:
    '`Omit<T, K>` は、ある型 `T` から **`K` で指定したキーを除いた**新しい型を作ります。`Pick` の補集合だと考えると分かりやすいです。たとえば `Omit<User, "password">` は `User` から `password` を取り除いた型になります。「外部に返すときはパスワードだけ落とす」といった、安全な公開用の型を作るのに便利です。',
  challenge:
    '関数 `toPublic` の戻り値の型を **`Omit<User, "password">`** にして、`User` から `password` を除いた公開用の型を表してください。中の処理（分割代入で password を落とす）はそのままで構いません。',
  hint: `戻り値の型を Omit<User, "password"> にします。\n\nfunction toPublic(user: User): Omit<User, "password"> {\n  const { password, ...rest } = user\n  return rest\n}`,
  initialCode: `type User = { id: number; name: string; password: string }

function toPublic(user: User) {
  const { password, ...rest } = user
  return rest
}`,
  testCases: [
    {
      description: '戻り値の型に Omit<User, ...> を使っている',
      assertion: `
if (!/Omit[ \t]*<[ \t]*User/.test(__originalCode__)) {
  throw new Error("戻り値の型を Omit<User, \\"password\\"> にしてください。")
}
`,
    },
    {
      description: 'password を除いた公開情報を返す',
      assertion: `
const r = toPublic({ id: 1, name: "Alice", password: "secret" })
if (r.id !== 1 || r.name !== "Alice") {
  throw new Error("id と name は残してください。got: " + JSON.stringify(r))
}
if ("password" in r) {
  throw new Error("戻り値に password が含まれています。除いてください。got: " + JSON.stringify(r))
}
`,
    },
  ],
}
