import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '018-typeof-type',
  title: 'typeof 型演算子（値から型）',
  description:
    '型の文脈で使う `typeof` は、**既にある値から型を生成**します。初級で学んだ「`typeof 型ガード`（`if (typeof x === "string")`）」は**値の文脈**の話でしたが、こちらは**型の文脈**です。たとえば `const config = { theme: "dark", fontSize: 14 }` に対して `type Config = typeof config` と書くと、`config` の形（`{ theme: string; fontSize: number }`）がそのまま型になります。手で型を書き写す必要がなく、値と型が**ズレません**。',
  challenge:
    '`defaultConfig` の形を手書きで型注釈する代わりに、**`type Config = typeof defaultConfig`** で型を生成し、`applyConfig` の引数 `config` の型を **`Config`** にしてください。',
  hint: `値から型を作ります。\n\ntype Config = typeof defaultConfig\n\nfunction applyConfig(config: Config): string {\n  ...\n}`,
  initialCode: `const defaultConfig = { theme: "dark", fontSize: 14 }

function applyConfig(config: { theme: string; fontSize: number }): string {
  return config.theme + ":" + config.fontSize
}`,
  testCases: [
    {
      description: 'type ... = typeof で値から型を生成している',
      assertion: `
if (!/type[ \t]+\\w+[ \t]*=[ \t]*typeof[ \t]+\\w/.test(__originalCode__)) {
  throw new Error("type Config = typeof defaultConfig のように、値から型を生成してください。")
}
`,
    },
    {
      description: '生成した型を引数の型注釈に使っている',
      assertion: `
if (!/config[ \t]*:[ \t]*Config\\b/.test(__originalCode__)) {
  throw new Error("applyConfig の引数 config の型を、生成した Config 型にしてください。")
}
`,
    },
    {
      description: '設定を文字列化できる',
      assertion: `
const r = applyConfig({ theme: "light", fontSize: 16 })
if (r !== "light:16") throw new Error("applyConfig(...) が 'light:16' を返しませんでした。got: " + r)
`,
    },
  ],
}
