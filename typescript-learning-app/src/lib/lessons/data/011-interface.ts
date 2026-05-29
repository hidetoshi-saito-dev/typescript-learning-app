import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '011-interface',
  title: 'interface',
  description:
    '`interface` キーワードを使うと、オブジェクトの形を表す型を定義できます。`type` を使った型エイリアスと似ていますが、`interface` は**同じ名前で複数回宣言できる**（マージされる）・**継承（`extends`）が書きやすい**といった違いがあります。オブジェクト型を表すときは `interface` が広く使われます。',
  challenge:
    '`interface User` を `name: string` と `age: number` の2つのプロパティを持つ型として定義してください。そして関数 `greet` の引数 `user` の型をインラインのオブジェクト型から **`User`** に変更してください。',
  hint: `interface キーワードでオブジェクト型に名前をつけます。\n\ninterface User {\n  name: string\n  age: number\n}\n\nfunction greet(user: User) {\n  ...\n}`,
  initialCode: `function greet(user: { name: string; age: number }) {
  return "こんにちは、" + user.name + "さん"
}`,
  testCases: [
    {
      description: 'interface User が定義されている',
      assertion: `
const interfaceMatch = /interface[ \t]+User[ \t\\r\\n]*\\{([^}]*)\\}/.exec(__originalCode__)
if (!interfaceMatch) {
  throw new Error("interface User { ... } という形で User 型を定義してください。")
}
const interfaceBody = interfaceMatch[1]
if (!/name[ \t]*:[ \t]*string/.test(interfaceBody)) {
  throw new Error("interface User の中に name: string プロパティを定義してください。")
}
if (!/age[ \t]*:[ \t]*number/.test(interfaceBody)) {
  throw new Error("interface User の中に age: number プロパティを定義してください。")
}
`,
    },
    {
      description: '引数 user に User 型が使われている',
      assertion: `
if (!/user[ \t]*:[ \t]*User/.test(__originalCode__)) {
  throw new Error("引数 user の型に User を使ってください。例: user: User")
}
`,
    },
    {
      description: '関数が正しく動作する',
      assertion: `
const r = greet({ name: "田中", age: 25 })
if (r !== "こんにちは、田中さん") throw new Error("greet({ name: '田中', age: 25 }) が 'こんにちは、田中さん' を返しませんでした。got: " + r)
`,
    },
  ],
}
