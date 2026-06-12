import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '046-api-any-removal',
  title: 'any 全廃 — 挙動を変えずに型を当てる',
  scenario:
    '最終シナリオは既存コードの改修です。引き継いだ会員 API クライアントは「動いてはいるが any だらけ」——歴代の担当者が型を諦めた跡があります。あなたの仕事は、**挙動を1ミリも変えずに**型を当てること。受け入れ条件のテストは改修前からすべて存在し、改修後も同じまま緑、が成功条件です（目安: 15分）。',
  requirements: [
    'データの形を表す型 `ApiUser` と `ApiResponse` を定義する（形はコードの使われ方から読み取る）',
    'シグネチャと変数から `any` を全廃する',
    '`as` によるキャストも使わない（この改修に断定は不要）',
    '関数の挙動・出力は一切変えない（回帰テストが守る）',
  ],
  description:
    '改修クラスの核心は「**挙動を変えない**」です。`any` は便利に見えて、補完が効かない・打ち間違いが実行まで見つからない・リファクタが怖い、と開発を確実に遅くします。コードの使われ方（`res.users`・`u.active`・`u.name`）から型を**逆算して起こす**のはレガシー改修の定番作業です。型を当てた瞬間、これまで見えなかった不整合をコンパイラが列挙してくれます——それが次の改修の安全網になります。',
  challenge:
    '使われ方から `ApiUser`（`name` と `active` を持つ）と `ApiResponse`（`users` 配列を持つ）を定義し、`pickActiveNames` のシグネチャ・`names`・`response` の `any` をすべて適切な型に置き換えてください。ロジックは1行も変えません。',
  hint: `type ApiUser = { name: string; active: boolean }\n\ntype ApiResponse = { users: ApiUser[] }\n\n関数は (res: ApiResponse): string[] に、names は string[] に、response は ApiResponse になります。`,
  initialCode: `// ===== レガシー会員 API クライアント — 改修前 =====
// 動いてはいるが any だらけ。挙動を1ミリも変えずに型を当てるのが今回の仕事

// TODO: データの形を表す型を定義してください（使われ方から読み取る）

// 有効会員（active）の名前一覧を抜き出す
function pickActiveNames(res: any): any {
  const names: any = []
  for (const u of res.users) {
    if (u.active) {
      names.push(u.name)
    }
  }
  return names
}

const response: any = {
  users: [
    { name: "佐藤", active: true },
    { name: "鈴木", active: false },
    { name: "高橋", active: true },
  ],
}

console.log(pickActiveNames(response))`,
  testCases: [
    {
      description: 'any もキャストも残っていない（全廃）',
      assertion: `
if (/\\bany\\b/.test(__originalCode__)) {
  throw new Error("any が残っています。すべて具体的な型に置き換えてください。")
}
if (/\\bas[ \\t]+[A-Za-z_$]/.test(__originalCode__)) {
  throw new Error("as によるキャストは使わず、型注釈で表現してください。")
}
`,
    },
    {
      description: 'データの形が ApiUser と ApiResponse として型定義されている',
      assertion: `
if (!/(type[ \\t]+ApiUser[ \\t]*=|interface[ \\t]+ApiUser\\b)/.test(__originalCode__)) {
  throw new Error("ApiUser 型を定義してください（type または interface）。")
}
if (!/(type[ \\t]+ApiResponse[ \\t]*=|interface[ \\t]+ApiResponse\\b)/.test(__originalCode__)) {
  throw new Error("ApiResponse 型を定義してください（type または interface）。")
}
`,
    },
    {
      description: '有効会員の名前一覧を返す挙動が変わっていない',
      assertion: `
const r1 = pickActiveNames({ users: [{ name: "佐藤", active: true }, { name: "鈴木", active: false }, { name: "高橋", active: true }] })
if (JSON.stringify(r1) !== JSON.stringify(["佐藤", "高橋"])) throw new Error("有効会員の名前一覧の挙動が変わっています。got: " + JSON.stringify(r1))
`,
    },
    {
      description: '空データ・全員無効のときも挙動が変わっていない',
      assertion: `
if (pickActiveNames({ users: [] }).length !== 0) throw new Error("空の users では空配列を返すはずです。")
const r2 = pickActiveNames({ users: [{ name: "A", active: false }] })
if (r2.length !== 0) throw new Error("全員 inactive なら空配列のはずです。")
`,
    },
  ],
}
