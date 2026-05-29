import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '003-return-type',
  title: '関数の戻り値型',
  description:
    '関数の引数だけでなく、**戻り値**にも型注釈をつけられます。戻り値型は引数リストの閉じカッコ `)` の直後に `: 型名` の形式で書きます。誤った型の値を `return` するとコンパイルエラーになります。',
  challenge:
    '関数 `formatName` の**戻り値型**として `: string` を追加してください。引数の型注釈はすでに書かれています。',
  hint: `戻り値型は ) の直後に書きます。\n\nfunction formatName(first: string, last: string): string {\n  ...\n}`,
  initialCode: `function formatName(first: string, last: string) {
  return last + " " + first
}`,
  testCases: [
    {
      description: '戻り値に : string の型注釈が書かれている',
      // [)] はカッコ文字クラス。\) をテンプレートリテラル内で使うと未定義エスケープになるため [)] を使用
      assertion: `
if (!/[)][ \t]*:[ \t]*string/.test(__originalCode__)) {
  throw new Error("戻り値型の注釈が正しくありません。) の直後に : string と書いてください。")
}
`,
    },
    {
      description: '関数が正しく動作する',
      assertion: `
const r = formatName("太郎", "田中")
if (r !== "田中 太郎") throw new Error("formatName('太郎', '田中') が '田中 太郎' を返しませんでした。got: " + r)
`,
    },
  ],
}
