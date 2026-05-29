import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '007-optional-property',
  title: 'オプショナルプロパティ',
  description:
    'オブジェクト型のプロパティ名の後ろに `?` をつけると、そのプロパティは**省略可能**になります。省略された場合、値は `undefined` になります。必須でないプロパティに `?` をつけることで、柔軟なオブジェクト型を定義できます。',
  challenge:
    '関数 `formatUser` の引数 `user` のオブジェクト型で、`age` プロパティを **`?`** をつけてオプショナル（省略可能）にしてください。',
  hint: `プロパティ名の後ろに ? をつけます。\n\nfunction formatUser(user: { name: string; age?: number }) {\n  ...\n}`,
  initialCode: `function formatUser(user: { name: string; age: number }) {
  if (user.age !== undefined) {
    return user.name + "（" + user.age + "歳）"
  }
  return user.name
}`,
  testCases: [
    {
      description: 'age プロパティにオプショナル修飾子 ? がついている',
      // [?] はカッコ文字クラス。? はそのまま書くと量指定子として解釈されるため [?] を使用
      assertion: `
if (!/age[ \t]*[?][ \t]*:/.test(__originalCode__)) {
  throw new Error("age の後ろに ? をつけてオプショナルにしてください。例: age?: number")
}
`,
    },
    {
      description: 'name と age を渡したとき正しく動作する',
      assertion: `
const r1 = formatUser({ name: "田中", age: 30 })
if (r1 !== "田中（30歳）") throw new Error("formatUser({ name: '田中', age: 30 }) が '田中（30歳）' を返しませんでした。got: " + r1)
`,
    },
    {
      description: 'age を省略したとき正しく動作する',
      assertion: `
const r2 = formatUser({ name: "田中" })
if (r2 !== "田中") throw new Error("formatUser({ name: '田中' }) が '田中' を返しませんでした。got: " + r2)
`,
    },
  ],
}
