import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '036-template-literal-type',
  title: 'テンプレートリテラル型の基礎',
  description:
    '**テンプレートリテラル型**は「文字列の**形そのもの**を型にする」機能です。型の世界でバッククォートを使い、`user-${number}`（両端をバッククォートで囲む）と書くと「`user-` で始まり数値が続く文字列」**だけ**を許す型になります（`${number}` の部分が穴）。ID・キー名・CSS クラス名など「決まった形式の文字列」を型で守れるようになります。なお、文字列連結（`"user-" + n`）の結果は幅広い `string` 型に広がってしまうため、この型には代入できません。**テンプレートリテラル式**（値の世界のバッククォート）で作る必要があります。',
  challenge:
    '`UserId` 型を、バッククォートで囲んだ**テンプレートリテラル型** `user-${number}` に書き換えてください。すると `makeUserId` の `"user-" + n`（連結の結果は `string` 型）が型エラーになるので、**テンプレートリテラル式**（バッククォートの `user-${n}`）に直します。',
  hint: `型と式の両方をバッククォートに変えます。\n\ntype UserId = \`user-\${number}\`\n\nfunction makeUserId(n: number): UserId {\n  return \`user-\${n}\`\n}`,
  initialCode: `// UserId をテンプレートリテラル型にしてください（仮実装: どんな文字列でも通る string）
type UserId = string

function makeUserId(n: number): UserId {
  return "user-" + n
}

const id = makeUserId(7)
console.log(id)`,
  testCases: [
    {
      description: 'UserId がテンプレートリテラル型で定義されている',
      assertion: `
if (!/type[ \t]+UserId[ \t]*=[ \t]*\`[^\`]*\\$\\{[ \t]*number[ \t]*\\}\`/.test(__originalCode__)) {
  throw new Error("UserId をテンプレートリテラル型 \`user-\${number}\` で定義してください。")
}
`,
    },
    {
      description: '型の形が user- で始まる',
      assertion: `
if (!/\`user-\\$\\{[ \t]*number[ \t]*\\}\`/.test(__rawCode__)) {
  throw new Error("UserId の形は \`user-\${number}\`（user- で始まり数値が続く）にしてください。")
}
`,
    },
    {
      description: 'makeUserId が user-番号 の文字列を返す',
      assertion: `
const g1 = makeUserId(7)
if (g1 !== "user-7") throw new Error("makeUserId(7) は 'user-7' を返すべきです。got: " + g1)
const g2 = makeUserId(123)
if (g2 !== "user-123") throw new Error("makeUserId(123) は 'user-123' を返すべきです。got: " + g2)
`,
    },
  ],
}
