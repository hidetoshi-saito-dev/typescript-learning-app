import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '016-keyof',
  title: 'keyof 演算子',
  description:
    '`keyof` 演算子を使うと、**オブジェクト型のプロパティ名すべてを文字列リテラルの Union 型として取り出せます**。たとえば `type Point = { x: number; y: number }` に対して `keyof Point` は `"x" | "y"` という型になります。これをジェネリクスの制約（`K extends keyof T`）と組み合わせると、「`obj` に**実在するキー**しか渡せない」関数を型安全に書けます。存在しないキーを渡すとコンパイル時にエラーになります。',
  challenge:
    'オブジェクト `obj` とそのキー `key` を受け取り、対応する値を返す関数 `getProperty` を、**型安全なジェネリック関数**として完成させてください。型変数 `K` を **`extends keyof T`** で制約し、引数 `key` の型を `K`、戻り値を `T[K]` にします。',
  hint: `<T, K extends keyof T> で「K は T のキーのどれか」に制約します。\n\nfunction getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {\n  return obj[key]\n}`,
  initialCode: `function getProperty(obj, key) {
  return obj[key]
}`,
  testCases: [
    {
      description: '型変数 K が keyof で制約されている',
      assertion: `
if (!/extends[ \t]+keyof[ \t]+\\w/.test(__originalCode__)) {
  throw new Error("K extends keyof T のように、型変数を keyof で制約してください。")
}
`,
    },
    {
      description: '文字列プロパティの値を取り出せる',
      assertion: `
const user = { name: "Alice", age: 30 }
const r = getProperty(user, "name")
if (r !== "Alice") throw new Error("getProperty(user, 'name') が 'Alice' を返しませんでした。got: " + r)
`,
    },
    {
      description: '数値プロパティの値を取り出せる',
      assertion: `
const user = { name: "Alice", age: 30 }
const r = getProperty(user, "age")
if (r !== 30) throw new Error("getProperty(user, 'age') が 30 を返しませんでした。got: " + r)
`,
    },
  ],
}
