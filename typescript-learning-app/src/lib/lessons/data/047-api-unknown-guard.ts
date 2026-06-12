import type { Lesson } from '@/types'

export const lesson: Lesson = {
  id: '047-api-unknown-guard',
  title: '境界を unknown にする — キャストからの卒業',
  scenario:
    '改修 STEP 2 です。前回 any を全廃したコード（完成形）が initialCode に入っています。今回の障害チケットは「API が不正なデータを返すとアプリごとクラッシュする」——原因は `JSON.parse` の結果を `as ApiResponse` で信じ込んでいる1行です。042 で学んだ境界の検証を、今度は**既存バグの修正**として適用します（目安: 15分）。',
  requirements: [
    '`JSON.parse` の結果は `unknown` で受ける（`let data: unknown` を宣言し try の中で代入する）',
    'try が包むのは `JSON.parse` の行だけ: パースの失敗は catch・形の違いは検証（if）で弾く',
    '型述語 `isApiResponse` で `users` 配列の各要素まで検証し、壊れた JSON も不正な形も `null` を返す（クラッシュさせない）',
    '`as ApiResponse` と `any` を使わない',
  ],
  description:
    '`as` キャストは「コンパイラを黙らせる」だけで、実行時には何もしてくれません。境界（JSON）から来た値は 042 と同じく `unknown`＋型述語で検証します。ポイントは **try の範囲を JSON.parse だけに絞る**こと——「JSON が壊れている」と「形が違う」は別の失敗です。検証の失敗まで catch で握りつぶす書き方にすると、検証後のコードの本物のバグまで `null` に化けて原因調査が難しくなります。catch の範囲を絞るのは実務のエラーハンドリングの作法です。',
  challenge:
    '`handleResponse` を改修してください。`let data: unknown` を宣言して try の中で `data = JSON.parse(json)` を代入し（catch では `null` を返す）、型述語 `isApiResponse(value: unknown): value is ApiResponse` を実装して、検証に通らなければ `null`、通れば `pickActiveNames` の結果を返します。',
  hint: `let data: unknown\ntry {\n  data = JSON.parse(json)\n} catch {\n  return null\n}\nif (!isApiResponse(data)) return null\nreturn pickActiveNames(data)\n\nisApiResponse は 042 と同じ手順です: object チェック → "users" in value → Array.isArray → 各要素の name / active の型を検証します。`,
  initialCode: `// ===== 完成済み: STEP 1（any 全廃済み・変更不要）=====
type ApiUser = { name: string; active: boolean }

type ApiResponse = { users: ApiUser[] }

function pickActiveNames(res: ApiResponse): string[] {
  const names: string[] = []
  for (const u of res.users) {
    if (u.active) {
      names.push(u.name)
    }
  }
  return names
}

// ===== STEP 2: 境界の改修（バグ修正）=====
// JSON 文字列を受けて有効会員名を返す。今は as で「信じ込んで」いるため、
// 不正なデータが来ると実行時にクラッシュする（障害チケットの原因）

// TODO: as ApiResponse をやめて、unknown 受け＋型述語の検証に改修してください
function handleResponse(json: string): string[] | null {
  const data = JSON.parse(json) as ApiResponse
  return pickActiveNames(data)
}

console.log(handleResponse('{"users":[{"name":"佐藤","active":true}]}'))`,
  testCases: [
    {
      description: 'JSON は unknown で受けて型述語で検証している（as での断定をやめる）',
      assertion: `
if (!/:[ \\t]*unknown\\b[\\s\\S]{0,40}?=[ \\t]*JSON[ \\t]*\\.[ \\t]*parse\\b/.test(__originalCode__)) {
  throw new Error("JSON.parse の結果は unknown で受けてください（let data: unknown → try 内で代入）。")
}
if (!/\\)[ \\t]*:[ \\t]*\\w+[ \\t]+is[ \\t]+ApiResponse\\b/.test(__originalCode__)) {
  throw new Error("isApiResponse の戻り値を「value is ApiResponse」の型述語にしてください。")
}
if (/\\bas[ \\t]+ApiResponse\\b/.test(__originalCode__) || /\\bany\\b/.test(__originalCode__)) {
  throw new Error("as ApiResponse や any を使わず、検証で絞り込んでください。")
}
`,
    },
    {
      description: '正常な JSON からは有効会員の名前一覧が返る',
      assertion: `
const ok = handleResponse('{"users":[{"name":"佐藤","active":true},{"name":"鈴木","active":false}]}')
if (JSON.stringify(ok) !== JSON.stringify(["佐藤"])) throw new Error("正常な JSON では有効会員名の配列を返すはずです。got: " + JSON.stringify(ok))
`,
    },
    {
      description: '形が違うデータはクラッシュせず null を返す（バグ修正の証明）',
      assertion: `
if (handleResponse('{"members":[]}') !== null) throw new Error("users が無いデータは null を返すはずです（改修前はここでクラッシュしていました）。")
if (handleResponse('{"users":[{"name":1,"active":true}]}') !== null) throw new Error("name が文字列でないデータは null を返すはずです。")
if (handleResponse('{"users":"abc"}') !== null) throw new Error("users が配列でないデータは null を返すはずです。")
`,
    },
    {
      description: '壊れた JSON もクラッシュせず null を返す',
      assertion: `
if (handleResponse('{users:') !== null) throw new Error("壊れた JSON は null を返すはずです。")
`,
    },
    {
      description: '既存機能: 有効会員の抽出ロジックが変わっていない',
      assertion: `
const r = pickActiveNames({ users: [{ name: "A", active: true }, { name: "B", active: false }] })
if (JSON.stringify(r) !== JSON.stringify(["A"])) throw new Error("既存の pickActiveNames の挙動が変わっています。")
`,
    },
  ],
}
