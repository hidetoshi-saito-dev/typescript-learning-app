import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '039-event-name',
  title: '総合 — infer × テンプレートリテラル型',
  description:
    '上級の総仕上げです。テンプレートリテラル型の**パターンの中に `infer` を置く**と、「文字列の形がマッチしたら、その**一部分を型として抜き出す**」ことができます。`T extends on${infer E}（バッククォート囲み） ? E : never` は「`T` が `on` で始まる文字列リテラル型なら、`on` の後ろを `E` として取り出す」という意味です。`"onClick"` からは `"Click"` が取り出せます。**条件型（032）× infer（034）× テンプレートリテラル型（036）**の3つが一本につながる、型レベルプログラミングの入口です。',
  challenge:
    '`"onClick"` のようなハンドラ名から `on` の後ろを取り出す型 `EventName<T>` を完成させてください。バッククォート囲みのパターンを使った `T extends on${infer E} ? E : never` の形を使います。仮実装の `string` のままでは「どんな文字列でも可」になってしまいます。',
  hint: `テンプレートリテラル型の穴に infer を置いて「後ろ半分」を捕まえます。\n\ntype EventName<T> = T extends \`on\${infer E}\` ? E : never`,
  initialCode: `// EventName<T> を完成させてください（仮実装: string）
type EventName<T> = string

// "onClick" → "Click" のように、on の後ろだけを取り出したい
const clickName: EventName<"onClick"> = "Click"
const changeName: EventName<"onChange"> = "Change"

console.log(clickName, changeName)`,
  testCases: [
    {
      description:
        'EventName<T> がテンプレートリテラル型のパターンに infer を置いた条件型になっている',
      assertion: `
if (!/type[ \t]+EventName[ \t]*<[ \t]*T[ \t]*>[ \t]*=[ \t]*T[ \t]+extends[ \t]*\`[^\`]*\\$\\{[ \t]*infer[ \t]+\\w+[ \t]*\\}\`[ \t]*\\?/.test(__originalCode__)) {
  throw new Error("T extends \`on\${infer E}\` ? E : never のように、テンプレートリテラル型のパターンに infer を置いてください。")
}
`,
    },
    {
      description: 'パターンが on で始まる',
      assertion: `
if (!/extends[ \t]*\`on\\$\\{[ \t]*infer[ \t]+\\w+[ \t]*\\}\`/.test(__rawCode__)) {
  throw new Error("パターンは \`on\${infer E}\`（on で始まる）にしてください。")
}
`,
    },
    {
      description: '取り出した型の変数に正しい値が入る',
      assertion: `
if (clickName !== "Click") throw new Error("clickName は 'Click' のはずです。got: " + clickName)
if (changeName !== "Change") throw new Error("changeName は 'Change' のはずです。got: " + changeName)
`,
    },
  ],
}
