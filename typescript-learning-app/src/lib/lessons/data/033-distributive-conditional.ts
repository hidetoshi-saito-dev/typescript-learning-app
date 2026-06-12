import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '033-distributive-conditional',
  title: '分配条件型と MyExclude',
  description:
    '条件型に **Union 型を渡すと、メンバーが1つずつ順番に評価**されます（**分配**・Distributive）。`"a" | "b"` を渡すと「`"a"` の評価結果 | `"b"` の評価結果」になります。この性質と、Union の中では消える `never` 型を組み合わせると「**Union から特定のメンバーを取り除く**」型が作れます。組み込みの `Exclude<T, U>` の正体は、まさに `T extends U ? never : T` という分配条件型です。',
  challenge:
    'Union 型 `T` から `U` に代入可能なメンバーを取り除く型 `MyExclude<T, U>` を完成させてください。分配条件型 `T extends U ? never : T` を使います。正しく書けると `ActiveStatus` は `"draft" | "published"` になります。',
  hint: `Union の各メンバーが U にマッチしたら never（Union から消える）、マッチしなければそのまま残します。\n\ntype MyExclude<T, U> = T extends U ? never : T`,
  initialCode: `// MyExclude<T, U> を分配条件型にしてください（仮実装: T をそのまま返す）
type MyExclude<T, U> = T

type Status = "draft" | "published" | "archived"
type ActiveStatus = MyExclude<Status, "archived">

// ActiveStatus が "draft" | "published" になれば完成
const actives: ActiveStatus[] = ["draft", "published"]
console.log(actives)`,
  testCases: [
    {
      description: 'MyExclude<T, U> が分配条件型（T extends U ? never : T）で定義されている',
      assertion: `
if (!/type[ \t]+MyExclude[ \t]*<[ \t]*T[ \t]*,[ \t]*U[ \t]*>[ \t]*=[ \t]*T[ \t]+extends[ \t]+U[ \t]*\\?[ \t]*never[ \t]*:[ \t]*T/.test(__originalCode__)) {
  throw new Error("MyExclude<T, U> を T extends U ? never : T の分配条件型で定義してください。")
}
`,
    },
    {
      description: 'ActiveStatus の値を保持できる',
      assertion: `
if (actives.length !== 2) throw new Error("actives は2要素のはずです。got: " + actives.length)
if (actives[0] !== "draft" || actives[1] !== "published") {
  throw new Error("actives は ['draft', 'published'] のはずです。got: " + JSON.stringify(actives))
}
`,
    },
  ],
}
