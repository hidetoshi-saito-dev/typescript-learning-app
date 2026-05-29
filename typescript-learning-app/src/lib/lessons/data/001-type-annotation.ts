import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '001-type-annotation',
  title: '型注釈の基本',
  description:
    'TypeScript では変数や引数に**型注釈**をつけることで、扱えるデータの種類を明示できます。型注釈があることで、コードの誤りを**実行前**に検出できます。',
  challenge:
    '以下の関数 `greet` の引数 `name` は型注釈がなく、暗黙的な `any` 型になっています。`name` に `: string` という型注釈を追加して、型エラーを解消してください。',
  hint: `引数名のすぐ後ろにコロンと型名を書きます。\n\nfunction greet(name: string) {\n  ...\n}`,
  initialCode: `function greet(name) {
  return "こんにちは、" + name
}`,
  testCases: [
    {
      description: 'name に : string の型注釈が書かれている',
      // __originalCode__ は Worker が実行前に注入するオリジナルの TypeScript ソース文字列。
      // [ \t] は半角スペース・タブのみ許可（\s は全角スペースにもマッチするため NG）。
      // テンプレートリテラル内では \t はタブ文字に変換されるので二重エスケープ不要。
      assertion: `
if (!/name[ \t]*:[ \t]*string/.test(__originalCode__)) {
  throw new Error("name の型注釈が正しくありません。name: string と半角文字で書いてください。")
}
`,
    },
    {
      description: '文字列を渡すと挨拶文が返る',
      assertion: `
const result = greet("TypeScript")
if (result !== "こんにちは、TypeScript") {
  throw new Error("Expected 'こんにちは、TypeScript', got: " + result)
}
`,
    },
  ],
}
