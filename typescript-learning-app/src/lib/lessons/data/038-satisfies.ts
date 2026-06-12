import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '038-satisfies',
  title: 'satisfies — チェックして、型は広げない',
  description:
    '`satisfies` は「**型チェックは受けるが、推論された具体的な型はそのまま保つ**」演算子です。型注釈 `const palette: Record<string, string> = {...}` を付けると palette の型は `Record<string, string>` に**広がって**しまい、「どのキーが実在するか」の情報が失われます（存在しないキー `palette.warning` へのアクセスも型エラーになりません）。`{...} satisfies Record<string, string>` なら「値がすべて string か」を検査しつつ、palette の型は**実在キーだけを持つ具体的な型のまま**です。`as const` と並ぶ、実務頻出のモダン TypeScript 構文です。',
  challenge:
    '`palette` の**型注釈をやめて**、オブジェクトリテラルの直後に `satisfies Record<string, string>` を付ける形に書き換えてください。チェックは維持したまま、存在しないキーへのアクセスを防げる型になります。',
  hint: `注釈（: 型）は変数名の横、satisfies は値の直後に書きます。\n\nconst palette = {\n  primary: "#2563eb",\n  danger: "#dc2626",\n} satisfies Record<string, string>`,
  initialCode: `// 型注釈だと palette の型が Record に広がり、キーの情報が失われます
const palette: Record<string, string> = {
  primary: "#2563eb",
  danger: "#dc2626",
}

const main = palette.primary
console.log(main)`,
  testCases: [
    {
      description: 'satisfies Record<string, string> を使っている',
      assertion: `
if (!/\\}[ \t]*satisfies[ \t]+Record[ \t]*<[ \t]*string[ \t]*,[ \t]*string[ \t]*>/.test(__originalCode__)) {
  throw new Error("オブジェクトリテラルの直後に satisfies Record<string, string> を付けてください。")
}
`,
    },
    {
      description: '型注釈（: Record）を外している',
      assertion: `
if (/palette[ \t]*:[ \t]*Record/.test(__originalCode__)) {
  throw new Error("palette の型注釈（: Record<...>）は外して、satisfies に置き換えてください。")
}
`,
    },
    {
      description: 'palette の値が保たれている',
      assertion: `
if (palette.primary !== "#2563eb") throw new Error("palette.primary は '#2563eb' のはずです。got: " + palette.primary)
if (palette.danger !== "#dc2626") throw new Error("palette.danger は '#dc2626' のはずです。got: " + palette.danger)
if (main !== "#2563eb") throw new Error("main は palette.primary の値のはずです。got: " + main)
`,
    },
  ],
}
