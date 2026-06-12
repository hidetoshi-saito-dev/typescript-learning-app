import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '048-roles-single-source',
  title: '二重管理の解消 — 挙動を変えないリファクタ',
  scenario:
    '改修の卒業課題です（同じコードベースの別ファイル、権限まわりを扱います）。`type Role` と `const ROLES` が**別々に手書き**されています——過去に viewer を追加したとき片方を直し忘れて本番障害になった、といういわくつきのコードです。`as const` と `typeof` で単一情報源に統合してください。受け入れ条件のテストは**改修の前後で完全に同一**です（目安: 10分）。',
  requirements: [
    '`ROLES` の配列リテラルに `as const` を付け、`type Role` は `(typeof ROLES)[number]` で配列から導出する',
    '手書きの Union（`type Role = "admin" | ...`）は削除して導出に一本化する',
    '`isRole` と `describeRole` の挙動を一切変えない（テストは改修前後で同一）',
  ],
  description:
    '019 の `as const` と 017/018 の `typeof`・インデックスアクセスの合流点です。「同じ知識を2か所に手書きする」のは改修対象の代表格——人間は必ずどちらか片方を直し忘れます。`(typeof ROLES)[number]` は「ROLES 配列の要素の型」と読み、**値の配列を直せば型も自動で追従**するようになります。なお `as const` を付けると `includes` の引数の型が狭まって型エラーになります——`some` での比較に書き換えるところまでがこの改修です（コンパイラの導きに従ってください）。',
  challenge:
    '`ROLES` の配列リテラル直後に `as const` を付け、`type Role` を `(typeof ROLES)[number]` の導出に置き換えてください（手書きの Union は削除）。`isRole` が型エラーになったら `ROLES.some((r) => r === value)` の形に直します。挙動はそのまま、二重管理だけが消えます。',
  hint: `const ROLES = ["admin", "editor", "viewer"] as const\n\ntype Role = (typeof ROLES)[number]\n\nfunction isRole(value: string): boolean {\n  return ROLES.some((r) => r === value)\n}\n\nas const で ROLES は readonly のタプルになり、要素の型がリテラルのまま保たれます。`,
  initialCode: `// ===== レガシー会員 API — 最後の改修: 権限の二重管理 =====
// 型と値が別々に手書きされている。過去に viewer 追加時、片方を直し忘れて
// 本番障害になった——二重管理を単一情報源に統合するリファクタ

// TODO: ROLES から型を導出して、手書き Union を削除してください
type Role = "admin" | "editor" | "viewer"

const ROLES = ["admin", "editor", "viewer"]

function isRole(value: string): boolean {
  return ROLES.includes(value)
}

function describeRole(role: Role): string {
  if (role === "admin") return "管理者"
  if (role === "editor") return "編集者"
  return "閲覧者"
}

console.log(isRole("admin"), describeRole("viewer"))`,
  testCases: [
    {
      description: 'ロール一覧 ROLES が as const で読み取り専用の単一情報源になっている',
      assertion: `
if (!/ROLES[ \\t]*=[ \\t]*\\[[^\\]]*\\][ \\t\\r\\n]*as[ \\t]+const\\b/.test(__originalCode__)) {
  throw new Error("ROLES の配列リテラル直後に as const を付けてください。")
}
`,
    },
    {
      description: 'Role 型は ROLES 配列から導出され、手書きの Union は残っていない',
      assertion: `
if (!/type[ \\t]+Role[ \\t]*=[ \\t]*\\(?[ \\t]*typeof[ \\t]+ROLES[ \\t]*\\)?[ \\t]*\\[[ \\t]*number[ \\t]*\\]/.test(__originalCode__)) {
  throw new Error("type Role = (typeof ROLES)[number] の形で配列から導出してください。")
}
if (/type[ \\t]+Role[ \\t]*=[ \\t\\r\\n|]*["']/.test(__originalCode__)) {
  throw new Error("手書きの Union（type Role = \\"admin\\" | ...）は削除して、導出に一本化してください。")
}
`,
    },
    {
      description: '挙動が改修前と完全に同じ（このテストは改修前から1文字も変えていません）',
      assertion: `
if (isRole("admin") !== true || isRole("editor") !== true || isRole("viewer") !== true) throw new Error("既存のロールが isRole で true になりません。")
if (isRole("guest") !== false) throw new Error("未知のロールは false のはずです。")
if (JSON.stringify([...ROLES]) !== JSON.stringify(["admin", "editor", "viewer"])) throw new Error("ROLES の内容と順序は変えないでください。")
if (describeRole("admin") !== "管理者" || describeRole("editor") !== "編集者" || describeRole("viewer") !== "閲覧者") throw new Error("describeRole の出力が変わっています。")
`,
    },
  ],
}
