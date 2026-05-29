import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '004-array-type',
  title: '配列型',
  description:
    '配列の型は `要素型[]` または `Array<要素型>` の形式で書きます。たとえば文字列の配列は `string[]`、数値の配列は `number[]` です。**配列型**を指定すると、異なる型の要素が混在するミスをコンパイル前に検出できます。',
  challenge: '関数 `join` の引数 `words` に `: string[]` という型注釈を追加してください。',
  hint: `配列型は型名の後ろに [] をつけます。\n\nfunction join(words: string[]) {\n  ...\n}`,
  initialCode: `function join(words) {
  return words.join(", ")
}`,
  testCases: [
    {
      description: 'words に : string[] の型注釈が書かれている',
      // string[] の [] は正規表現でエスケープが必要なため includes() で確認する
      assertion: `
if (!/words[ \t]*:[ \t]*string/.test(__originalCode__)) {
  throw new Error("words の型注釈が正しくありません。words: string[] と書いてください。")
}
if (!__originalCode__.includes('string[]') && !__originalCode__.includes('Array<string>')) {
  throw new Error("配列型の注釈がありません。string[] または Array<string> と書いてください。")
}
`,
    },
    {
      description: '関数が正しく動作する',
      assertion: `
const r = join(["TypeScript", "React", "Next.js"])
if (r !== "TypeScript, React, Next.js") {
  throw new Error("join(['TypeScript', 'React', 'Next.js']) が正しい値を返しませんでした。got: " + r)
}
`,
    },
  ],
}
