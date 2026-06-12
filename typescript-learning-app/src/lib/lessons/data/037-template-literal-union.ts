import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '037-template-literal-union',
  title: 'テンプレートリテラル型 × Union',
  description:
    'テンプレートリテラル型の穴 `${}` に **Union 型を入れると、全メンバーの組み合わせに展開**されます。`type Size = "sm" | "md" | "lg"` に対して、バッククォートの `btn-${Size}` は `"btn-sm" | "btn-md" | "btn-lg"` という Union になります。CSS クラス名・イベント名・API のキーなど「**パターンの決まった文字列の集合**」を、列挙を手書きせずに型として表現できます。',
  challenge:
    '`SizeClass` 型を、バッククォートで囲んだ `btn-${Size}` に書き換えてください。`Size` に新しいサイズを足すだけで `SizeClass` も自動的に増えるようになります。連結 `"btn-" + size` は `string` 型に広がるため、**テンプレートリテラル式**に直す必要があります。',
  hint: `穴に Union 型を入れると全組み合わせに展開されます。\n\ntype SizeClass = \`btn-\${Size}\`\n\nfunction sizeClass(size: Size): SizeClass {\n  return \`btn-\${size}\`\n}`,
  initialCode: `type Size = "sm" | "md" | "lg"

// SizeClass をテンプレートリテラル型にしてください（仮実装: string）
type SizeClass = string

function sizeClass(size: Size): SizeClass {
  return "btn-" + size
}

const medium = sizeClass("md")
console.log(medium)`,
  testCases: [
    {
      description: 'SizeClass がテンプレートリテラル型で定義されている',
      assertion: `
if (!/type[ \t]+SizeClass[ \t]*=[ \t]*\`[^\`]*\\$\\{[ \t]*Size[ \t]*\\}\`/.test(__originalCode__)) {
  throw new Error("SizeClass をテンプレートリテラル型 \`btn-\${Size}\` で定義してください。")
}
`,
    },
    {
      description: '型の形が btn- で始まり Size を埋め込んでいる',
      assertion: `
if (!/\`btn-\\$\\{[ \t]*Size[ \t]*\\}\`/.test(__rawCode__)) {
  throw new Error("SizeClass の形は \`btn-\${Size}\` にしてください。")
}
`,
    },
    {
      description: 'sizeClass が btn-サイズ の文字列を返す',
      assertion: `
const m = sizeClass("md")
if (m !== "btn-md") throw new Error("sizeClass('md') は 'btn-md' を返すべきです。got: " + m)
const l = sizeClass("lg")
if (l !== "btn-lg") throw new Error("sizeClass('lg') は 'btn-lg' を返すべきです。got: " + l)
`,
    },
  ],
}
