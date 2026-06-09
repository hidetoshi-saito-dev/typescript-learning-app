import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '017-indexed-access',
  title: 'インデックスアクセス型 T[K]',
  description:
    '**インデックスアクセス型** `T[K]` を使うと、ある型 `T` のプロパティ `K` の**型だけ**をピンポイントで取り出せます。たとえば `type Article = { title: string; views: number }` のとき、`Article["title"]` は `string` 型を表します。型を直接書き写す代わりに「あの型のあのプロパティと同じ型」と**参照**できるので、元の型が変わっても自動で追従します。',
  challenge:
    '関数 `getTitle` の戻り値の型を、`string` と直接書く代わりに **`Article["title"]`** というインデックスアクセス型で表してください。`Article` の `title` の型が変わっても自動で追従するようになります。',
  hint: `戻り値の型注釈を Article["title"] に変えます。\n\nfunction getTitle(article: Article): Article["title"] {\n  return article.title\n}`,
  initialCode: `type Article = { title: string; views: number }

function getTitle(article: Article): string {
  return article.title
}`,
  testCases: [
    {
      description: '戻り値の型に Article["title"] を使っている',
      assertion: `
if (!/Article\\[["']title["']\\]/.test(__originalCode__)) {
  throw new Error("戻り値の型を Article[\\"title\\"] というインデックスアクセス型で書いてください。")
}
`,
    },
    {
      description: 'タイトルを返す',
      assertion: `
const r = getTitle({ title: "Hello", views: 10 })
if (r !== "Hello") throw new Error("getTitle(...) が 'Hello' を返しませんでした。got: " + r)
`,
    },
  ],
}
