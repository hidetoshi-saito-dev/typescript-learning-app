import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '005-object-type',
  title: 'オブジェクト型',
  description:
    'TypeScript では `{ プロパティ名: 型 }` の形式でオブジェクトの形を型として表現できます。これを**インラインオブジェクト型**と呼びます。プロパティが不足していたり型が違う場合はコンパイルエラーになります。',
  challenge:
    '関数 `greetUser` の引数 `user` に、`name` プロパティが `string` 型のオブジェクト型注釈 `{ name: string }` を追加してください。',
  hint: `オブジェクト型は { } の中にプロパティ名と型を書きます。\n\nfunction greetUser(user: { name: string }) {\n  ...\n}`,
  initialCode: `function greetUser(user) {
  return "こんにちは、" + user.name
}`,
  testCases: [
    {
      description: 'user にオブジェクト型注釈がある',
      // [{ ] はカッコ文字クラス。\{ をテンプレートリテラル内で使うと未定義エスケープになるため [{] を使用
      assertion: `
if (!/user[ \t]*:[ \t]*[{]/.test(__originalCode__)) {
  throw new Error("user の型注釈を { } のオブジェクト型で書いてください。例: user: { name: string }")
}
`,
    },
    {
      description: 'オブジェクト型に name: string プロパティがある',
      assertion: `
if (!/name[ \t]*:[ \t]*string/.test(__originalCode__)) {
  throw new Error("オブジェクト型の中に name: string プロパティを書いてください。")
}
`,
    },
    {
      description: '関数が正しく動作する',
      assertion: `
const r = greetUser({ name: "Alice" })
if (r !== "こんにちは、Alice") {
  throw new Error("greetUser({ name: 'Alice' }) が 'こんにちは、Alice' を返しませんでした。got: " + r)
}
`,
    },
  ],
}
