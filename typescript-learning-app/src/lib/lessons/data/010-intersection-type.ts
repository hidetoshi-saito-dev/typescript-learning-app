import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '010-intersection-type',
  title: 'intersection型',
  description:
    '`型A & 型B` と書くと、**両方の型のプロパティをすべて持つ**型を作ることができます。これを**intersection 型**（交差型）と呼びます。別々に定義した型を組み合わせて新しい型を作るときに便利です。',
  challenge:
    '`type Named = { name: string }` と `type Aged = { age: number }` がすでに定義されています。`type Person` を `Named & Aged` という **intersection 型**で定義し、関数 `introduce` の引数 `person` の型に `Person` を使ってください。',
  hint: `& で型を組み合わせます。\n\ntype Named = { name: string }\ntype Aged = { age: number }\ntype Person = Named & Aged\n\nfunction introduce(person: Person) {\n  ...\n}`,
  initialCode: `type Named = { name: string }
type Aged = { age: number }

function introduce(person: { name: string; age: number }) {
  return person.name + "は" + person.age + "歳です"
}`,
  testCases: [
    {
      description: 'type Person が Named & Aged として定義されている',
      assertion: `
const hasPersonIntersection =
  /type[ \t]+Person[ \t]*=[ \t]*Named[ \t]*[&][ \t]*Aged/.test(__originalCode__) ||
  /type[ \t]+Person[ \t]*=[ \t]*Aged[ \t]*[&][ \t]*Named/.test(__originalCode__)
if (!hasPersonIntersection) {
  throw new Error("type Person = Named & Aged という intersection 型を定義してください。")
}
`,
    },
    {
      description: '引数 person に Person 型が使われている',
      assertion: `
if (!/person[ \t]*:[ \t]*Person/.test(__originalCode__)) {
  throw new Error("引数 person の型に Person を使ってください。例: person: Person")
}
`,
    },
    {
      description: '関数が正しく動作する',
      assertion: `
const r = introduce({ name: "田中", age: 25 })
if (r !== "田中は25歳です") throw new Error("introduce({ name: '田中', age: 25 }) が '田中は25歳です' を返しませんでした。got: " + r)
`,
    },
  ],
}
