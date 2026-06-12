/**
 * verify-lessons.cjs — レッスン判定の回帰・前進検証（ブラウザ不要）
 *
 * judge.worker.ts のコアロジックを Node で再現し、2つの観点で検証する:
 *  1. 回帰: new Function 版（旧）と AsyncFunction 版（新）で、各レッスンの initialCode の
 *     判定結果が一致すること（AsyncFunction 化で既存挙動が壊れていないこと）。
 *  2. 前進: SOLUTIONS に登録した模範解答が AsyncFunction 版で correct を返し、
 *     WRONG に登録した誤り版が incorrect を返すこと。
 *
 * 使い方: node scripts/verify-lessons.cjs
 * 終了コード: 全て期待通りなら 0、1件でも外れたら 1。
 */
const ts = require('typescript')
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '../src/lib/lessons/data')

function transpile(src, moduleKind) {
  return ts.transpileModule(src, {
    compilerOptions: {
      module: moduleKind,
      target: ts.ScriptTarget.ES2017,
      strict: false,
    },
  }).outputText
}

/** レッスン .ts を読み込んで lesson オブジェクトを返す（import type は transpile で消える） */
function loadLesson(file) {
  const src = fs.readFileSync(file, 'utf8')
  const js = transpile(src, ts.ModuleKind.CommonJS)
  const m = { exports: {} }
  // '@/types' は type-only import なので require されない
  new Function('module', 'exports', 'require', js)(m, m.exports, require)
  return m.exports.lesson
}

/**
 * src/lib/judge/sanitize.ts の sanitizeForChecks をミラー（変更時は必ず両方を同期すること）。
 * コメント除去（structure/noComments 共通）＋文字列/テンプレート/正規表現の中身ブランク（structure のみ）。
 * テンプレート置換・正規表現リテラルのバイパス封鎖は 2026-06-11 追補（正本ドキュメント参照）。
 */
const DIVISION_PRECEDING_TOKENS = new Set([
  ts.SyntaxKind.Identifier,
  ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.BigIntLiteral,
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.RegularExpressionLiteral,
  ts.SyntaxKind.ThisKeyword,
  ts.SyntaxKind.TrueKeyword,
  ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.NullKeyword,
  ts.SyntaxKind.SuperKeyword,
  ts.SyntaxKind.CloseParenToken,
  ts.SyntaxKind.CloseBracketToken,
  ts.SyntaxKind.PlusPlusToken,
  ts.SyntaxKind.MinusMinusToken,
])

function sanitizeForChecks(source) {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    source,
  )
  const blank = (s) => s.replace(/[^\r\n]/g, ' ')
  const blankInside = (text, startLen, endLen) =>
    text.length < startLen + endLen
      ? text
      : text.slice(0, startLen) +
        blank(text.slice(startLen, text.length - endLen)) +
        text.slice(text.length - endLen)
  let structure = ''
  let noComments = ''
  let lastSignificant = ts.SyntaxKind.Unknown
  // 置換付きテンプレートの文脈スタック（各要素＝置換式内の { } ネスト深さ）。
  // 置換を閉じる } は reScanTemplateToken で TemplateMiddle/Tail に再解釈する必要がある。
  const templateBraceDepth = []
  let token = scanner.scan()
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (
      (token === ts.SyntaxKind.SlashToken || token === ts.SyntaxKind.SlashEqualsToken) &&
      !DIVISION_PRECEDING_TOKENS.has(lastSignificant)
    ) {
      token = scanner.reScanSlashToken()
    }
    if (token === ts.SyntaxKind.CloseBraceToken && templateBraceDepth.length > 0) {
      const last = templateBraceDepth.length - 1
      if (templateBraceDepth[last] === 0) {
        token = scanner.reScanTemplateToken(false)
        if (token === ts.SyntaxKind.TemplateTail) {
          templateBraceDepth.pop()
        }
      } else {
        templateBraceDepth[last]--
      }
    } else if (token === ts.SyntaxKind.OpenBraceToken && templateBraceDepth.length > 0) {
      templateBraceDepth[templateBraceDepth.length - 1]++
    } else if (token === ts.SyntaxKind.TemplateHead) {
      templateBraceDepth.push(0)
    }
    const text = scanner.getTokenText()
    if (
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      const b = blank(text)
      structure += b
      noComments += b
    } else if (
      token === ts.SyntaxKind.StringLiteral ||
      token === ts.SyntaxKind.NoSubstitutionTemplateLiteral
    ) {
      structure += blankInside(text, 1, 1)
      noComments += text
    } else if (token === ts.SyntaxKind.RegularExpressionLiteral) {
      structure += blankInside(text, 1, 1)
      noComments += text
    } else if (
      token === ts.SyntaxKind.TemplateHead ||
      token === ts.SyntaxKind.TemplateMiddle ||
      token === ts.SyntaxKind.TemplateTail
    ) {
      structure += blankInside(text, 1, token === ts.SyntaxKind.TemplateTail ? 1 : 2)
      noComments += text
    } else {
      structure += text
      noComments += text
    }
    if (
      token !== ts.SyntaxKind.WhitespaceTrivia &&
      token !== ts.SyntaxKind.NewLineTrivia &&
      token !== ts.SyntaxKind.SingleLineCommentTrivia &&
      token !== ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      lastSignificant = token
    }
    token = scanner.scan()
  }
  return { structure, noComments }
}

function buildFullCode(code, assertion) {
  const { structure, noComments } = sanitizeForChecks(code)
  return (
    `const __originalCode__ = ${JSON.stringify(structure)}\n` +
    `const __rawCode__ = ${JSON.stringify(noComments)}\n` +
    `${code}\n${assertion}`
  )
}

/** 旧: new Function（同期） */
function judgeSync(code, testCases) {
  const failed = []
  for (const tc of testCases) {
    try {
      const out = transpile(buildFullCode(code, tc.assertion), ts.ModuleKind.None)
      // eslint-disable-next-line no-new-func
      new Function(out)()
    } catch (e) {
      failed.push((e && e.message) || tc.description)
    }
  }
  return failed.length === 0 ? 'correct' : 'incorrect'
}

/** 新: AsyncFunction（await でPromise解決を待つ） */
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
async function judgeAsync(code, testCases) {
  const failed = []
  for (const tc of testCases) {
    try {
      const out = transpile(buildFullCode(code, tc.assertion), ts.ModuleKind.None)
      await new AsyncFunction(out)()
    } catch (e) {
      failed.push((e && e.message) || tc.description)
    }
  }
  return failed.length === 0 ? 'correct' : 'incorrect'
}

// 前進検証用の模範解答／誤り版（id -> code）。レッスン実装に合わせて追記していく。
const SOLUTIONS = {
  '001-type-annotation': `function greet(name: string) {\n  return "こんにちは、" + name\n}`,
  '012-typeof-guard': `function format(value: string | number) {\n  if (typeof value === "string") {\n    return value.toUpperCase()\n  }\n  return value.toFixed(2)\n}`,
  '015-generics-constraint': `function getLength<T extends { length: number }>(value: T): number {\n  return value.length\n}`,
  // 第1群（016-019）
  '016-keyof': `function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {\n  return obj[key]\n}`,
  '017-indexed-access': `type Article = { title: string; views: number }\n\nfunction getTitle(article: Article): Article["title"] {\n  return article.title\n}`,
  '018-typeof-type': `const defaultConfig = { theme: "dark", fontSize: 14 }\ntype Config = typeof defaultConfig\n\nfunction applyConfig(config: Config): string {\n  return config.theme + ":" + config.fontSize\n}`,
  '019-as-const': `const palette = ["primary", "secondary", "accent"] as const\n\nfunction firstColor(): string {\n  return palette[0]\n}`,
  // 第2群（020-024）
  '020-readonly': `type Point = { x: number; y: number }\n\nfunction describe(point: Readonly<Point>): string {\n  return point.x + "," + point.y\n}`,
  '021-partial-required': `type User = { name: string; age: number }\n\nfunction updateUser(user: User, patch: Partial<User>): User {\n  return { ...user, ...patch }\n}`,
  '022-pick': `type User = { id: number; name: string; email: string; password: string }\n\nfunction toSummary(user: User): Pick<User, "id" | "name"> {\n  return { id: user.id, name: user.name }\n}`,
  '023-omit': `type User = { id: number; name: string; password: string }\n\nfunction toPublic(user: User): Omit<User, "password"> {\n  const { password, ...rest } = user\n  return rest\n}`,
  '024-record': `const rates: Record<"yen" | "usd", number> = { yen: 150, usd: 1 }\n\nfunction getRate(currency: "yen" | "usd"): number {\n  return rates[currency]\n}`,
  // 第3群（025-028）
  '025-unknown': `function describe(value: unknown): string {\n  if (typeof value === "string") {\n    return "文字列: " + value\n  }\n  if (typeof value === "number") {\n    return "数値: " + value\n  }\n  return "不明"\n}`,
  '026-discriminated-union': `type Shape =\n  | { kind: "circle"; radius: number }\n  | { kind: "square"; size: number }\n\nfunction area(shape: Shape): number {\n  if (shape.kind === "circle") {\n    return Math.PI * shape.radius * shape.radius\n  }\n  return shape.size * shape.size\n}`,
  '027-never-exhaustiveness': `type Shape =\n  | { kind: "circle"; radius: number }\n  | { kind: "square"; size: number }\n  | { kind: "triangle"; base: number; height: number }\n\nfunction area(shape: Shape): number {\n  switch (shape.kind) {\n    case "circle":\n      return Math.PI * shape.radius * shape.radius\n    case "square":\n      return shape.size * shape.size\n    case "triangle":\n      return (shape.base * shape.height) / 2\n    default: {\n      const _exhaustive: never = shape\n      return _exhaustive\n    }\n  }\n}`,
  '028-type-predicate': `function isString(value: unknown): value is string {\n  return typeof value === "string"\n}\n\nfunction shout(values: unknown[]): string[] {\n  return values.filter(isString).map((s) => s.toUpperCase())\n}`,
  // 第4群（029-031）
  '029-function-type': `type Mapper = (n: number) => number\n\nfunction mapNumbers(numbers: number[], fn: Mapper): number[] {\n  return numbers.map(fn)\n}`,
  '030-promise': `function delay(ms: number, value: string): Promise<string> {\n  return new Promise((resolve) => setTimeout(() => resolve(value), ms))\n}`,
  '031-awaited-async': `async function fetchName(): Promise<string> {\n  return "Alice"\n}\n\nasync function greet(): Promise<string> {\n  const name = await fetchName()\n  return "こんにちは、" + name\n}`,
  // 上級（032-039）
  '032-conditional-type': `type IsString<T> = T extends string ? true : false\n\nconst a: IsString<string> = true\nconst b: IsString<number> = false\nconst c: IsString<"hello"> = true\n\nconsole.log(a, b, c)`,
  '033-distributive-conditional': `type MyExclude<T, U> = T extends U ? never : T\n\ntype Status = "draft" | "published" | "archived"\ntype ActiveStatus = MyExclude<Status, "archived">\n\nconst actives: ActiveStatus[] = ["draft", "published"]\nconsole.log(actives)`,
  '034-infer-return': `type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never\n\nfunction getMessage() {\n  return "こんにちは、TypeScript"\n}\n\nconst msg: MyReturnType<typeof getMessage> = getMessage()\nconsole.log(msg)`,
  '035-infer-element': `type ElementType<T> = T extends (infer E)[] ? E : never\n\nconst scores = [70, 85, 90]\n\nconst first: ElementType<typeof scores> = scores[0]\nconsole.log(first)`,
  '036-template-literal-type':
    'type UserId = `user-${number}`\n\nfunction makeUserId(n: number): UserId {\n  return `user-${n}`\n}\n\nconst id = makeUserId(7)\nconsole.log(id)',
  '037-template-literal-union':
    'type Size = "sm" | "md" | "lg"\n\ntype SizeClass = `btn-${Size}`\n\nfunction sizeClass(size: Size): SizeClass {\n  return `btn-${size}`\n}\n\nconst medium = sizeClass("md")\nconsole.log(medium)',
  '038-satisfies': `const palette = {\n  primary: "#2563eb",\n  danger: "#dc2626",\n} satisfies Record<string, string>\n\nconst main = palette.primary\nconsole.log(main)`,
  '039-event-name':
    'type EventName<T> = T extends `on${infer E}` ? E : never\n\nconst clickName: EventName<"onClick"> = "Click"\nconst changeName: EventName<"onChange"> = "Change"\n\nconsole.log(clickName, changeName)',
  // 実践シナリオA: TonariCafe（040-042）。連作のため後続レッスンの initialCode が
  // ここの SOLUTION のアンカーを含むこと（CONTINUITY で機械検証）
  '040-order-status-model': `type OrderStatus = "pending" | "paid" | "served" | "cancelled"

type Order = {
  id: number
  items: string[]
  status: OrderStatus
}

const ALL_STATUSES: OrderStatus[] = ["pending", "paid", "served", "cancelled"]

function canCancel(order: Order): boolean {
  return order.status === "pending" || order.status === "paid"
}

const order: Order = { id: 1, items: ["latte"], status: "pending" }
console.log(canCancel(order), ALL_STATUSES.length)`,
  '041-menu-master-satisfies': `type OrderStatus = "pending" | "paid" | "served" | "cancelled"

type Order = {
  id: number
  items: string[]
  status: OrderStatus
}

function canCancel(order: Order): boolean {
  return order.status === "pending" || order.status === "paid"
}

const MENU = {
  latte: 480,
  tea: 420,
  mocha: 520,
} satisfies Record<string, number>

type MenuId = keyof typeof MENU

function totalOf(items: MenuId[]): number {
  return items.reduce((sum, item) => sum + MENU[item], 0)
}

console.log(totalOf(["latte", "tea"]), canCancel({ id: 1, items: ["latte"], status: "paid" }))`,
  '042-order-input-guard': `type OrderStatus = "pending" | "paid" | "served" | "cancelled"

type Order = {
  id: number
  items: string[]
  status: OrderStatus
}

const ALL_STATUSES: OrderStatus[] = ["pending", "paid", "served", "cancelled"]

function canCancel(order: Order): boolean {
  return order.status === "pending" || order.status === "paid"
}

function isOrder(value: unknown): value is Order {
  if (typeof value !== "object" || value === null) return false
  if (!("id" in value) || !("items" in value) || !("status" in value)) return false
  if (typeof value.id !== "number") return false
  if (!Array.isArray(value.items)) return false
  if (!value.items.every((item: unknown) => typeof item === "string")) return false
  return ALL_STATUSES.some((s) => s === value.status)
}

function registerOrder(value: unknown): string {
  if (!isOrder(value)) {
    return "不正な注文です"
  }
  return "注文 " + value.id + " を受け付けました（" + value.items.length + "品）"
}

console.log(registerOrder({ id: 1, items: ["latte"], status: "pending" }))`,
  // 実践シナリオB: Notifier（043-045）
  '043-notify-settings-patch': `type Notice =
  | { kind: "email"; to: string; subject: string; body: string }
  | { kind: "sms"; to: string; body: string }

function format(n: Notice): string {
  switch (n.kind) {
    case "email":
      return "[EMAIL] " + n.subject + " → " + n.to
    case "sms":
      return "[SMS] " + n.body.slice(0, 20) + " → " + n.to
    default: {
      const _exhaustive: never = n
      return _exhaustive
    }
  }
}

type Settings = {
  theme: "light" | "dark"
  emailEnabled: boolean
  smsEnabled: boolean
}

const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  emailEnabled: true,
  smsEnabled: false,
}

function mergeSettings(base: Settings, patch: Partial<Settings>): Settings {
  return { ...base, ...patch }
}

console.log(format({ kind: "email", to: "a@example.com", subject: "hi", body: "" }))
console.log(mergeSettings(DEFAULT_SETTINGS, { theme: "dark" }).theme)`,
  '044-notify-new-channel': `type Notice =
  | { kind: "email"; to: string; subject: string; body: string }
  | { kind: "sms"; to: string; body: string }
  | { kind: "push"; deviceId: string; title: string }

type Settings = {
  theme: "light" | "dark"
  emailEnabled: boolean
  smsEnabled: boolean
}

function mergeSettings(base: Settings, patch: Partial<Settings>): Settings {
  return { ...base, ...patch }
}

function format(n: Notice): string {
  switch (n.kind) {
    case "email":
      return "[EMAIL] " + n.subject + " → " + n.to
    case "sms":
      return "[SMS] " + n.body.slice(0, 20) + " → " + n.to
    case "push":
      return "[PUSH] " + n.title
    default: {
      const _exhaustive: never = n
      return _exhaustive
    }
  }
}

function destinationOf(n: Notice): string {
  switch (n.kind) {
    case "email":
      return n.to
    case "sms":
      return n.to
    case "push":
      return n.deviceId
    default: {
      const _exhaustive: never = n
      return _exhaustive
    }
  }
}

function charLimitOf(n: Notice): number {
  switch (n.kind) {
    case "email":
      return 5000
    case "sms":
      return 70
    case "push":
      return 100
    default: {
      const _exhaustive: never = n
      return _exhaustive
    }
  }
}

console.log(format({ kind: "push", deviceId: "dev-1", title: "hi" }), destinationOf({ kind: "push", deviceId: "dev-1", title: "hi" }), charLimitOf({ kind: "push", deviceId: "dev-1", title: "hi" }))`,
  '045-notify-retry-async': `type Notice =
  | { kind: "email"; to: string; subject: string; body: string }
  | { kind: "sms"; to: string; body: string }
  | { kind: "push"; deviceId: string; title: string }

function format(n: Notice): string {
  switch (n.kind) {
    case "email":
      return "[EMAIL] " + n.subject + " → " + n.to
    case "sms":
      return "[SMS] " + n.body.slice(0, 20) + " → " + n.to
    case "push":
      return "[PUSH] " + n.title
    default: {
      const _exhaustive: never = n
      return _exhaustive
    }
  }
}

async function retry<T>(fn: () => Promise<T>, times: number): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < times; i++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}

async function demo(): Promise<void> {
  const sent = await retry(() => Promise.resolve(format({ kind: "push", deviceId: "d", title: "hi" })), 3)
  console.log(sent)
}

demo()`,
  // 実践シナリオC: レガシー会員APIクライアント（046-048）
  '046-api-any-removal': `type ApiUser = { name: string; active: boolean }

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

const response: ApiResponse = {
  users: [
    { name: "佐藤", active: true },
    { name: "鈴木", active: false },
    { name: "高橋", active: true },
  ],
}

console.log(pickActiveNames(response))`,
  '047-api-unknown-guard': `type ApiUser = { name: string; active: boolean }

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

function isApiResponse(value: unknown): value is ApiResponse {
  if (typeof value !== "object" || value === null) return false
  if (!("users" in value)) return false
  if (!Array.isArray(value.users)) return false
  return value.users.every(
    (u: unknown) =>
      typeof u === "object" &&
      u !== null &&
      "name" in u &&
      "active" in u &&
      typeof u.name === "string" &&
      typeof u.active === "boolean",
  )
}

function handleResponse(json: string): string[] | null {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return null
  }
  if (!isApiResponse(data)) return null
  return pickActiveNames(data)
}

console.log(handleResponse('{"users":[{"name":"佐藤","active":true}]}'))`,
  '048-roles-single-source': `const ROLES = ["admin", "editor", "viewer"] as const

type Role = (typeof ROLES)[number]

function isRole(value: string): boolean {
  return ROLES.some((r) => r === value)
}

function describeRole(role: Role): string {
  if (role === "admin") return "管理者"
  if (role === "editor") return "編集者"
  return "閲覧者"
}

console.log(isRole("admin"), describeRole("viewer"))`,
}
// 誤り版（id 重複可なので配列）。label は失敗理由の説明。
// 「コメント/文字列バイパス」= 型を書かずキーワードをコメントや文字列に置くチート答案。
// これらは sanitizeForChecks 導入後は②で incorrect になる（偽陽性修正の回帰ガード）。
const WRONG = [
  // 015: 制約を外すと②構文ゲートで落ちる
  {
    id: '015-generics-constraint',
    label: '制約なし',
    code: `function getLength<T>(value: T): number {\n  return (value as any).length\n}`,
  },
  // 018: typeof 型を使わず手書き型のままだと②で不正解
  {
    id: '018-typeof-type',
    label: '手書き型',
    code: `const defaultConfig = { theme: "dark", fontSize: 14 }\n\nfunction applyConfig(config: { theme: string; fontSize: number }): string {\n  return config.theme + ":" + config.fontSize\n}`,
  },
  // 016: keyof をコメント/文字列に置いただけのチート → ②不一致で incorrect
  {
    id: '016-keyof',
    label: 'コメントバイパス',
    code: `// extends keyof T\nfunction getProperty(obj, key) {\n  return obj[key]\n}`,
  },
  {
    id: '016-keyof',
    label: '文字列バイパス',
    code: `const _hint = "extends keyof T"\nfunction getProperty(obj, key) {\n  return obj[key]\n}`,
  },
  // 024: Record をコメント/文字列に置いただけのチート
  {
    id: '024-record',
    label: 'コメントバイパス',
    code: `// Record<"yen" | "usd", number>\nconst rates = { yen: 150, usd: 1 }\n\nfunction getRate(currency) {\n  return rates[currency]\n}`,
  },
  {
    id: '024-record',
    label: '文字列バイパス',
    code: `const _hint = "Record<"\nconst rates = { yen: 150, usd: 1 }\n\nfunction getRate(currency) {\n  return rates[currency]\n}`,
  },
  // 020: Readonly をコメントに置いただけ（実装は素の Point）
  {
    id: '020-readonly',
    label: 'コメントバイパス',
    code: `type Point = { x: number; y: number }\n\n// Readonly<Point>\nfunction describe(point: Point): string {\n  return point.x + "," + point.y\n}`,
  },
  // 022: Pick をコメントに置いただけ
  {
    id: '022-pick',
    label: 'コメントバイパス',
    code: `type User = { id: number; name: string; email: string; password: string }\n\n// Pick<User, "id" | "name">\nfunction toSummary(user: User) {\n  return { id: user.id, name: user.name }\n}`,
  },
  // 023: Omit をコメントに置いただけ
  {
    id: '023-omit',
    label: 'コメントバイパス',
    code: `type User = { id: number; name: string; password: string }\n\n// Omit<User, "password">\nfunction toPublic(user: User) {\n  const { password, ...rest } = user\n  return rest\n}`,
  },
  // 009: リテラル値レッスンも、"left" 等をコメントに置くチートは __rawCode__ のコメント除去で incorrect
  {
    id: '009-literal-type',
    label: 'コメントバイパス',
    code: `function setAlignment(direction: "a" | "b") {\n  // "left" | "right" | "center"\n  return "align: " + direction\n}`,
  },
  // 016: 置換付きテンプレートにキーワードを置くチート（2026-06-11 封鎖）。
  // TemplateHead/Middle/Tail は NoSubstitutionTemplateLiteral と別トークンのため、
  // 旧実装では中身が structure に残り②を偽陽性で通過していた。
  {
    id: '016-keyof',
    label: 'テンプレートバイパス',
    // キーワードを中間チャンク（${}と${}の間）に置く: 素の scan() では TemplateMiddle が
    // 出現せずコードトークンとして漏れるため、reScanTemplateToken 対応の回帰カナリアになる
    code: 'const _hint = `${""}extends keyof T${""}`\nfunction getProperty(obj, key) {\n  return obj[key]\n}',
  },
  // 021: 正規表現リテラルにキーワードを置くチート（2026-06-11 封鎖）。
  // 旧実装では / が SlashToken のまま正規表現として再スキャンされず、
  // Partial が識別子トークンとして structure に残り②を偽陽性で通過していた。
  {
    id: '021-partial-required',
    label: '正規表現バイパス',
    code: `type User = { name: string; age: number }\n\nconst _re = /Partial<User/g\n\nfunction updateUser(user, patch) {\n  return { ...user, ...patch }\n}`,
  },
  // 上級（032-039）: 各レッスンにコメントバイパス答案（必須規約）
  {
    id: '032-conditional-type',
    label: 'コメントバイパス',
    code: `// type IsString<T> = T extends string ? true : false\ntype IsString<T> = boolean\nconst a: IsString<string> = true\nconst b: IsString<number> = false\nconst c: IsString<"hello"> = true\nconsole.log(a, b, c)`,
  },
  {
    id: '033-distributive-conditional',
    label: 'コメントバイパス',
    code: `// T extends U ? never : T\ntype MyExclude<T, U> = T\ntype Status = "draft" | "published" | "archived"\ntype ActiveStatus = MyExclude<Status, "archived">\nconst actives: ActiveStatus[] = ["draft", "published"]\nconsole.log(actives)`,
  },
  {
    id: '034-infer-return',
    label: 'コメントバイパス',
    code: `/* type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never */\ntype MyReturnType<T> = unknown\nfunction getMessage() {\n  return "こんにちは、TypeScript"\n}\nconst msg: MyReturnType<typeof getMessage> = getMessage()\nconsole.log(msg)`,
  },
  {
    id: '035-infer-element',
    label: 'コメントバイパス',
    code: `// T extends (infer E)[] ? E : never\ntype ElementType<T> = unknown\nconst scores = [70, 85, 90]\nconst first: ElementType<typeof scores> = scores[0]\nconsole.log(first)`,
  },
  {
    id: '036-template-literal-type',
    label: 'コメントバイパス',
    code: '// type UserId = `user-${number}`\ntype UserId = string\nfunction makeUserId(n: number): UserId {\n  return "user-" + n\n}\nconst id = makeUserId(7)\nconsole.log(id)',
  },
  {
    // 文字列の中に正解の型宣言を書くチート: structure 側 regex（引用符が \` と不一致）で封鎖
    id: '036-template-literal-type',
    label: '文字列偽装バイパス',
    code: 'const _hint = "type UserId = `user-${number}`"\ntype UserId = string\nfunction makeUserId(n: number): UserId {\n  return "user-" + n\n}\nconst id = makeUserId(7)\nconsole.log(id)',
  },
  {
    id: '037-template-literal-union',
    label: 'コメントバイパス',
    code: '// type SizeClass = `btn-${Size}`\ntype Size = "sm" | "md" | "lg"\ntype SizeClass = string\nfunction sizeClass(size: Size): SizeClass {\n  return "btn-" + size\n}\nconst medium = sizeClass("md")\nconsole.log(medium)',
  },
  {
    id: '038-satisfies',
    label: 'コメントバイパス',
    code: `// } satisfies Record<string, string>\nconst palette: Record<string, string> = {\n  primary: "#2563eb",\n  danger: "#dc2626",\n}\nconst main = palette.primary\nconsole.log(main)`,
  },
  {
    id: '038-satisfies',
    label: '注釈残しバイパス',
    code: `const palette: Record<string, string> = {\n  primary: "#2563eb",\n  danger: "#dc2626",\n} satisfies Record<string, string>\n\nconst main = palette.primary\nconsole.log(main)`,
  },
  {
    id: '039-event-name',
    label: 'コメントバイパス',
    code: '// type EventName<T> = T extends `on${infer E}` ? E : never\ntype EventName<T> = string\nconst clickName: EventName<"onClick"> = "Click"\nconst changeName: EventName<"onChange"> = "Change"\nconsole.log(clickName, changeName)',
  },
  {
    // 正解の型宣言を文字列に隠すチート: raw には残るが structure 側 regex で封鎖されることの回帰
    id: '039-event-name',
    label: '文字列偽装バイパス',
    code: 'const _cheat = "type EventName<T> = T extends `on${infer E}` ? E : never"\ntype EventName<T> = string\nconst clickName: EventName<"onClick"> = "Click"\nconst changeName: EventName<"onChange"> = "Change"\nconsole.log(clickName, changeName)',
  },
  // 実践クラス（040+）: コメントバイパス＋ダミー構文バイパスを各レッスン必須（正本 3章）
  {
    id: '040-order-status-model',
    label: 'コメントバイパス',
    code: `// type OrderStatus = "pending" | "paid" | "served" | "cancelled"
type OrderStatus = string
type Order = { id: number; items: string[]; status: OrderStatus }
const ALL_STATUSES: OrderStatus[] = ["pending", "paid", "served", "cancelled"]
function canCancel(order: Order): boolean {
  return order.status === "pending" || order.status === "paid"
}
console.log(canCancel({ id: 1, items: [], status: "pending" }), ALL_STATUSES.length)`,
  },
  {
    // ダミーUnion（"x"×4）で②Union形を満たし、①を避けるため ALL_STATUSES の注釈を剥がすチート
    // → ALL_STATUSES アンカー②で不合格（ブラウザでは注釈を残しても①が落とす）
    id: '040-order-status-model',
    label: 'ダミーUnion＋注釈剥がし',
    code: `type OrderStatus = "x" | "x" | "x" | "x"
type Order = { id: number; items: string[]; status: string }
const ALL_STATUSES = ["pending", "paid", "served", "cancelled"]
function canCancel(order: Order): boolean {
  return order.status === "pending" || order.status === "paid"
}
console.log(canCancel({ id: 1, items: [], status: "pending" }), ALL_STATUSES.length)`,
  },
  {
    // 正解の宣言を置換付きテンプレートに隠すチート: structure では中身が空白化され②Union形に一致しない
    id: '040-order-status-model',
    label: 'テンプレート偽装バイパス',
    code: 'const _memo = `${""}type OrderStatus = "pending" | "paid" | "served" | "cancelled"${""}`\ntype OrderStatus = string\ntype Order = { id: number; items: string[]; status: OrderStatus }\nconst ALL_STATUSES: OrderStatus[] = ["pending", "paid", "served", "cancelled"]\nfunction canCancel(order: Order): boolean {\n  return order.status === "pending" || order.status === "paid"\n}\nconsole.log(canCancel({ id: 1, items: [], status: "pending" }), ALL_STATUSES.length)',
  },
  {
    id: '041-menu-master-satisfies',
    label: 'コメントバイパス',
    code: `type OrderStatus = "pending" | "paid" | "served" | "cancelled"
type Order = { id: number; items: string[]; status: OrderStatus }
function canCancel(order: Order): boolean {
  return order.status === "pending" || order.status === "paid"
}
// const MENU = {...} satisfies Record<string, number>
// type MenuId = keyof typeof MENU
const MENU = { latte: 480, tea: 420, mocha: 520 }
type MenuId = string
function totalOf(items: MenuId[]): number {
  return items.reduce((sum, item) => sum + MENU[item as keyof typeof MENU], 0)
}
console.log(totalOf(["latte", "tea"]))`,
  },
  {
    // 課題対象と無関係なダミー宣言で satisfies の存在チェックを満たそうとするチート
    // → MENU 名アンカー②で不合格（識別子アンカー規約の回帰カナリア）
    id: '041-menu-master-satisfies',
    label: 'ダミーsatisfies',
    code: `type OrderStatus = "pending" | "paid" | "served" | "cancelled"
type Order = { id: number; items: string[]; status: OrderStatus }
function canCancel(order: Order): boolean {
  return order.status === "pending" || order.status === "paid"
}
const _dummy = {} satisfies Record<string, number>
const MENU = { latte: 480, tea: 420, mocha: 520 }
type MenuId = keyof typeof MENU
function totalOf(items: MenuId[]): number {
  return items.reduce((sum, item) => sum + MENU[item], 0)
}
console.log(totalOf(["latte", "tea"]))`,
  },
  {
    // satisfies でなく型注釈のまま → MenuId が string に広がる（038 と同じ widening の罠）
    id: '041-menu-master-satisfies',
    label: '注釈残し',
    code: `type OrderStatus = "pending" | "paid" | "served" | "cancelled"
type Order = { id: number; items: string[]; status: OrderStatus }
function canCancel(order: Order): boolean {
  return order.status === "pending" || order.status === "paid"
}
const MENU: Record<string, number> = { latte: 480, tea: 420, mocha: 520 }
type MenuId = keyof typeof MENU
function totalOf(items: MenuId[]): number {
  return items.reduce((sum, item) => sum + MENU[item], 0)
}
console.log(totalOf(["latte", "tea"]))`,
  },
  {
    id: '042-order-input-guard',
    label: 'コメントバイパス',
    code: `type OrderStatus = "pending" | "paid" | "served" | "cancelled"
type Order = { id: number; items: string[]; status: OrderStatus }
const ALL_STATUSES: OrderStatus[] = ["pending", "paid", "served", "cancelled"]
function canCancel(order: Order): boolean {
  return order.status === "pending" || order.status === "paid"
}
// function isOrder(value: unknown): value is Order
function isOrder(value) {
  return typeof value === "object" && value !== null
}
function registerOrder(value) {
  if (!isOrder(value)) {
    return "不正な注文です"
  }
  return "注文 " + value.id + " を受け付けました（" + value.items.length + "品）"
}
console.log(registerOrder({ id: 1, items: ["latte"], status: "pending" }))`,
  },
  {
    // 型述語は書くが検証しない（常に true）→ ③の不正データ・null ケースで不合格
    id: '042-order-input-guard',
    label: '検証しない型述語',
    code: `type OrderStatus = "pending" | "paid" | "served" | "cancelled"
type Order = { id: number; items: string[]; status: OrderStatus }
const ALL_STATUSES: OrderStatus[] = ["pending", "paid", "served", "cancelled"]
function canCancel(order: Order): boolean {
  return order.status === "pending" || order.status === "paid"
}
function isOrder(value: unknown): value is Order {
  return true
}
function registerOrder(value: unknown): string {
  if (!isOrder(value)) {
    return "不正な注文です"
  }
  return "注文 " + value.id + " を受け付けました（" + value.items.length + "品）"
}
console.log(registerOrder({ id: 1, items: ["latte"], status: "pending" }))`,
  },
  {
    // 型述語を書かず as Order で断定するチート → ②不存在チェックで不合格
    id: '042-order-input-guard',
    label: 'as 断定',
    code: `type OrderStatus = "pending" | "paid" | "served" | "cancelled"
type Order = { id: number; items: string[]; status: OrderStatus }
const ALL_STATUSES: OrderStatus[] = ["pending", "paid", "served", "cancelled"]
function canCancel(order: Order): boolean {
  return order.status === "pending" || order.status === "paid"
}
function isOrder(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false
  if (!("id" in value) || !("items" in value) || !("status" in value)) return false
  if (typeof value.id !== "number") return false
  if (!Array.isArray(value.items)) return false
  if (!value.items.every((item: unknown) => typeof item === "string")) return false
  return ALL_STATUSES.some((s) => s === value.status)
}
function registerOrder(value: unknown): string {
  if (!isOrder(value)) {
    return "不正な注文です"
  }
  const order = value as Order
  return "注文 " + order.id + " を受け付けました（" + order.items.length + "品）"
}
console.log(registerOrder({ id: 1, items: ["latte"], status: "pending" }))`,
  },
  {
    id: '043-notify-settings-patch',
    label: 'コメントバイパス',
    code: `type Settings = { theme: "light" | "dark"; emailEnabled: boolean; smsEnabled: boolean }
type Notice =
  | { kind: "email"; to: string; subject: string; body: string }
  | { kind: "sms"; to: string; body: string }
function format(n: Notice): string {
  switch (n.kind) {
    case "email":
      return "[EMAIL] " + n.subject + " → " + n.to
    case "sms":
      return "[SMS] " + n.body.slice(0, 20) + " → " + n.to
    default: {
      const _exhaustive: never = n
      return _exhaustive
    }
  }
}
// function mergeSettings(base: Settings, patch: Partial<Settings>): Settings
function mergeSettings(base: Settings, patch: Settings): Settings {
  return { ...base, ...patch }
}
console.log(mergeSettings({ theme: "light", emailEnabled: true, smsEnabled: false }, { theme: "dark", emailEnabled: true, smsEnabled: false }).theme)`,
  },
  {
    // mergeSettings とは別のダミー関数の引数で②を満たそうとするチート
    // → mergeSettings シグネチャへのアンカーで不合格（識別子アンカー規約の回帰カナリア）
    id: '043-notify-settings-patch',
    label: 'ダミーPartial',
    code: `type Settings = { theme: "light" | "dark"; emailEnabled: boolean; smsEnabled: boolean }
type Notice =
  | { kind: "email"; to: string; subject: string; body: string }
  | { kind: "sms"; to: string; body: string }
function format(n: Notice): string {
  switch (n.kind) {
    case "email":
      return "[EMAIL] " + n.subject + " → " + n.to
    case "sms":
      return "[SMS] " + n.body.slice(0, 20) + " → " + n.to
    default: {
      const _exhaustive: never = n
      return _exhaustive
    }
  }
}
function _applyLater(patch: Partial<Settings>): void {}
function mergeSettings(base: Settings, patch: Settings): Settings {
  return { ...base, ...patch }
}
console.log(mergeSettings({ theme: "light", emailEnabled: true, smsEnabled: false }, { theme: "dark", emailEnabled: true, smsEnabled: false }).theme)`,
  },
  {
    // Partial にはするが base を直接書き換える → ③非破壊テストで不合格
    id: '043-notify-settings-patch',
    label: '破壊的マージ',
    code: `type Settings = { theme: "light" | "dark"; emailEnabled: boolean; smsEnabled: boolean }
type Notice =
  | { kind: "email"; to: string; subject: string; body: string }
  | { kind: "sms"; to: string; body: string }
function format(n: Notice): string {
  switch (n.kind) {
    case "email":
      return "[EMAIL] " + n.subject + " → " + n.to
    case "sms":
      return "[SMS] " + n.body.slice(0, 20) + " → " + n.to
    default: {
      const _exhaustive: never = n
      return _exhaustive
    }
  }
}
function mergeSettings(base: Settings, patch: Partial<Settings>): Settings {
  return Object.assign(base, patch)
}
console.log(mergeSettings({ theme: "light", emailEnabled: true, smsEnabled: false }, { theme: "dark" }).theme)`,
  },
  {
    // never チェックを全部消してコメントへ移すチート → ②カウントで不合格（push 動作は正しくても落ちる）
    id: '044-notify-new-channel',
    label: 'コメントバイパス',
    code: `type Notice =
  | { kind: "email"; to: string; subject: string; body: string }
  | { kind: "sms"; to: string; body: string }
  | { kind: "push"; deviceId: string; title: string }
type Settings = { theme: "light" | "dark"; emailEnabled: boolean; smsEnabled: boolean }
function mergeSettings(base: Settings, patch: Partial<Settings>): Settings {
  return { ...base, ...patch }
}
// default: { const _exhaustive: never = n; return _exhaustive }
function format(n: Notice): string {
  switch (n.kind) {
    case "email":
      return "[EMAIL] " + n.subject + " → " + n.to
    case "sms":
      return "[SMS] " + n.body.slice(0, 20) + " → " + n.to
    case "push":
      return "[PUSH] " + n.title
  }
}
function destinationOf(n: Notice): string {
  switch (n.kind) {
    case "email":
      return n.to
    case "sms":
      return n.to
    case "push":
      return n.deviceId
  }
}
function charLimitOf(n: Notice): number {
  switch (n.kind) {
    case "email":
      return 5000
    case "sms":
      return 70
    case "push":
      return 100
  }
}
console.log(format({ kind: "push", deviceId: "d", title: "t" }))`,
  },
  {
    // default を消し、無関係な never[] ダミー宣言でカウントを満たそうとするチート
    // → default: アンカー＋代入形（: never =）で不合格
    id: '044-notify-new-channel',
    label: 'ダミーnever配列',
    code: `type Notice =
  | { kind: "email"; to: string; subject: string; body: string }
  | { kind: "sms"; to: string; body: string }
  | { kind: "push"; deviceId: string; title: string }
type Settings = { theme: "light" | "dark"; emailEnabled: boolean; smsEnabled: boolean }
function mergeSettings(base: Settings, patch: Partial<Settings>): Settings {
  return { ...base, ...patch }
}
const _a: never[] = []
const _b: never[] = []
const _c: never[] = []
function format(n: Notice): string {
  switch (n.kind) {
    case "email":
      return "[EMAIL] " + n.subject + " → " + n.to
    case "sms":
      return "[SMS] " + n.body.slice(0, 20) + " → " + n.to
    case "push":
      return "[PUSH] " + n.title
  }
}
function destinationOf(n: Notice): string {
  switch (n.kind) {
    case "email":
      return n.to
    case "sms":
      return n.to
    case "push":
      return n.deviceId
  }
}
function charLimitOf(n: Notice): number {
  switch (n.kind) {
    case "email":
      return 5000
    case "sms":
      return 70
    case "push":
      return 100
  }
}
console.log(format({ kind: "push", deviceId: "d", title: "t" }))`,
  },
  {
    // 網羅性チェックを放棄して default で空文字を返す＋push 未対応 → ②と③の両方で不合格
    id: '044-notify-new-channel',
    label: '網羅性チェックの放棄',
    code: `type Notice =
  | { kind: "email"; to: string; subject: string; body: string }
  | { kind: "sms"; to: string; body: string }
  | { kind: "push"; deviceId: string; title: string }
type Settings = { theme: "light" | "dark"; emailEnabled: boolean; smsEnabled: boolean }
function mergeSettings(base: Settings, patch: Partial<Settings>): Settings {
  return { ...base, ...patch }
}
function format(n: Notice): string {
  switch (n.kind) {
    case "email":
      return "[EMAIL] " + n.subject + " → " + n.to
    case "sms":
      return "[SMS] " + n.body.slice(0, 20) + " → " + n.to
    default:
      return ""
  }
}
function destinationOf(n: Notice): string {
  switch (n.kind) {
    case "email":
      return n.to
    case "sms":
      return n.to
    default:
      return ""
  }
}
function charLimitOf(n: Notice): number {
  switch (n.kind) {
    case "email":
      return 5000
    case "sms":
      return 70
    default:
      return 0
  }
}
console.log(format({ kind: "push", deviceId: "d", title: "t" }))`,
  },
  {
    id: '045-notify-retry-async',
    label: 'コメントバイパス',
    code: `type Notice =
  | { kind: "email"; to: string; subject: string; body: string }
  | { kind: "sms"; to: string; body: string }
  | { kind: "push"; deviceId: string; title: string }
function format(n: Notice): string {
  switch (n.kind) {
    case "email":
      return "[EMAIL] " + n.subject + " → " + n.to
    case "sms":
      return "[SMS] " + n.body.slice(0, 20) + " → " + n.to
    case "push":
      return "[PUSH] " + n.title
    default: {
      const _exhaustive: never = n
      return _exhaustive
    }
  }
}
// async function retry<T>(fn: () => Promise<T>, times: number): Promise<T>
async function retry(fn, times) {
  let lastError
  for (let i = 0; i < times; i++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}
console.log(typeof retry)`,
  },
  {
    // ジェネリクスの代わりに any で逃げる → ②署名チェックで不合格
    id: '045-notify-retry-async',
    label: 'any 署名',
    code: `type Notice =
  | { kind: "email"; to: string; subject: string; body: string }
  | { kind: "sms"; to: string; body: string }
  | { kind: "push"; deviceId: string; title: string }
function format(n: Notice): string {
  switch (n.kind) {
    case "email":
      return "[EMAIL] " + n.subject + " → " + n.to
    case "sms":
      return "[SMS] " + n.body.slice(0, 20) + " → " + n.to
    case "push":
      return "[PUSH] " + n.title
    default: {
      const _exhaustive: never = n
      return _exhaustive
    }
  }
}
async function retry(fn: () => Promise<any>, times: number): Promise<any> {
  let lastError: unknown
  for (let i = 0; i < times; i++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}
console.log(typeof retry)`,
  },
  {
    // 署名は正しいが再試行しない（仮実装のまま）→ ③呼び出し回数で不合格
    id: '045-notify-retry-async',
    label: '再試行なし',
    code: `type Notice =
  | { kind: "email"; to: string; subject: string; body: string }
  | { kind: "sms"; to: string; body: string }
  | { kind: "push"; deviceId: string; title: string }
function format(n: Notice): string {
  switch (n.kind) {
    case "email":
      return "[EMAIL] " + n.subject + " → " + n.to
    case "sms":
      return "[SMS] " + n.body.slice(0, 20) + " → " + n.to
    case "push":
      return "[PUSH] " + n.title
    default: {
      const _exhaustive: never = n
      return _exhaustive
    }
  }
}
function retry<T>(fn: () => Promise<T>, times: number): Promise<T> {
  return fn()
}
console.log(typeof retry)`,
  },
  {
    // retry とは別のダミージェネリック関数で②を満たそうとするチート → retry 名アンカーで不合格
    id: '045-notify-retry-async',
    label: 'ダミージェネリック',
    code: `type Notice =
  | { kind: "email"; to: string; subject: string; body: string }
  | { kind: "sms"; to: string; body: string }
  | { kind: "push"; deviceId: string; title: string }
function format(n: Notice): string {
  switch (n.kind) {
    case "email":
      return "[EMAIL] " + n.subject + " → " + n.to
    case "sms":
      return "[SMS] " + n.body.slice(0, 20) + " → " + n.to
    case "push":
      return "[PUSH] " + n.title
    default: {
      const _exhaustive: never = n
      return _exhaustive
    }
  }
}
function _once<T>(fn: () => Promise<T>, times: number): Promise<T> {
  return fn()
}
async function retry(fn: () => Promise<string>, times: number): Promise<string> {
  let lastError: unknown
  for (let i = 0; i < times; i++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}
console.log(typeof retry)`,
  },
  {
    id: '046-api-any-removal',
    label: 'コメントバイパス',
    code: `// type ApiUser = { name: string; active: boolean }
// type ApiResponse = { users: ApiUser[] }
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
  users: [{ name: "佐藤", active: true }],
}
console.log(pickActiveNames(response))`,
  },
  {
    // 型は定義するがシグネチャの any を残すチート → 不存在チェック（\\bany\\b）で不合格
    id: '046-api-any-removal',
    label: 'any温存',
    code: `type ApiUser = { name: string; active: boolean }
type ApiResponse = { users: ApiUser[] }
function pickActiveNames(res: any): any {
  const names: any = []
  for (const u of res.users) {
    if (u.active) {
      names.push(u.name)
    }
  }
  return names
}
const response: ApiResponse = {
  users: [{ name: "佐藤", active: true }],
}
console.log(pickActiveNames(response))`,
  },
  {
    // as unknown as の二段キャスト逃げ → ブランケット as 不存在チェックで不合格
    id: '046-api-any-removal',
    label: '二段キャスト',
    code: `type ApiUser = { name: string; active: boolean }
type ApiResponse = { users: ApiUser[] }
function pickActiveNames(res: ApiResponse): string[] {
  const names = []
  for (const u of res.users) {
    if (u.active) {
      names.push(u.name)
    }
  }
  return names as unknown as string[]
}
const response: ApiResponse = {
  users: [{ name: "佐藤", active: true }],
}
console.log(pickActiveNames(response))`,
  },
  {
    id: '047-api-unknown-guard',
    label: 'コメントバイパス',
    code: `type ApiUser = { name: string; active: boolean }
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
// let data: unknown / data = JSON.parse(json) / value is ApiResponse
function handleResponse(json: string): string[] | null {
  const data = JSON.parse(json) as ApiResponse
  return pickActiveNames(data)
}
console.log(handleResponse('{"users":[{"name":"佐藤","active":true}]}'))`,
  },
  {
    // 型述語は書くが検証しない（常に true）→ try の範囲を絞った構成では
    // 不正データがクラッシュとして表面化し③で不合格（catch で null に化けない）
    id: '047-api-unknown-guard',
    label: '検証しない型述語',
    code: `type ApiUser = { name: string; active: boolean }
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
function isApiResponse(value: unknown): value is ApiResponse {
  return true
}
function handleResponse(json: string): string[] | null {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return null
  }
  if (!isApiResponse(data)) return null
  return pickActiveNames(data)
}
console.log(handleResponse('{"users":[{"name":"佐藤","active":true}]}'))`,
  },
  {
    // 課題と無関係なダミー unknown 宣言＋型なし parse → JSON.parse アンカーの②で不合格
    id: '047-api-unknown-guard',
    label: 'ダミーunknown',
    code: `type ApiUser = { name: string; active: boolean }
type ApiResponse = { users: ApiUser[] }
const _placeholder: unknown = 0
function pickActiveNames(res: ApiResponse): string[] {
  const names: string[] = []
  for (const u of res.users) {
    if (u.active) {
      names.push(u.name)
    }
  }
  return names
}
function isApiResponse(value: unknown): value is ApiResponse {
  if (typeof value !== "object" || value === null) return false
  if (!("users" in value)) return false
  return Array.isArray(value.users)
}
function handleResponse(json: string): string[] | null {
  let data
  try {
    data = JSON.parse(json)
  } catch {
    return null
  }
  if (!isApiResponse(data)) return null
  return pickActiveNames(data)
}
console.log(handleResponse('{"users":[{"name":"佐藤","active":true}]}'))`,
  },
  {
    id: '048-roles-single-source',
    label: 'コメントバイパス',
    code: `// const ROLES = ["admin", "editor", "viewer"] as const
// type Role = (typeof ROLES)[number]
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
  },
  {
    // 課題と無関係な空配列に as const を付けるダミー → ROLES 名アンカーの②で不合格
    id: '048-roles-single-source',
    label: 'ダミーas const',
    code: `const _empty = [] as const
type Role = (typeof ROLES)[number]
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
  },
  {
    // as const は付けるが手書き Union を温存（導出しない）→ ②導出チェックと手書き不存在チェックで不合格
    id: '048-roles-single-source',
    label: '導出なし',
    code: `type Role = "admin" | "editor" | "viewer"
const ROLES = ["admin", "editor", "viewer"] as const
function isRole(value: string): boolean {
  return ROLES.some((r) => r === value)
}
function describeRole(role: Role): string {
  if (role === "admin") return "管理者"
  if (role === "editor") return "編集者"
  return "閲覧者"
}
console.log(isRole("admin"), describeRole("viewer"))`,
  },
]

// 連作整合: initialCode(N+1) が前レッスン模範解答のアンカー文字列を含むこと。
// 模範解答を変更したのに後続レッスンの initialCode へ同期し忘れる事故を CI で検出する
// （設計正本 curriculum-practical.md 4-4。anchors は前レッスンで完成する中核宣言を1〜3個）。
// シナリオ実装 PR ごとに追記していく。
const CONTINUITY = [
  {
    id: '041-menu-master-satisfies',
    prev: '040-order-status-model',
    anchors: [
      'type OrderStatus = "pending" | "paid" | "served" | "cancelled"',
      'function canCancel(order: Order): boolean {',
    ],
  },
  {
    id: '042-order-input-guard',
    prev: '041-menu-master-satisfies',
    anchors: [
      'type OrderStatus = "pending" | "paid" | "served" | "cancelled"',
      'function canCancel(order: Order): boolean {',
    ],
  },
  {
    id: '044-notify-new-channel',
    prev: '043-notify-settings-patch',
    anchors: [
      '| { kind: "email"; to: string; subject: string; body: string }',
      'function mergeSettings(base: Settings, patch: Partial<Settings>): Settings {',
    ],
  },
  {
    id: '045-notify-retry-async',
    prev: '044-notify-new-channel',
    anchors: ['| { kind: "push"; deviceId: string; title: string }', 'return "[PUSH] " + n.title'],
  },
  // 048 は同コードベースの別ファイル想定でコードを引き継がないため、連作アンカーは 047 のみ
  {
    id: '047-api-unknown-guard',
    prev: '046-api-any-removal',
    anchors: [
      'type ApiUser = { name: string; active: boolean }',
      'function pickActiveNames(res: ApiResponse): string[] {',
    ],
  },
]

// ProblemPane の splitAtPeriod は `〜` / **〜** の内側の「。」でも文分割してしまうため、
// インライン記法の内側に「。」を書くことは執筆禁止（正本 4-5。表示崩れの静的検査）。
// 判定は ProblemPane.renderInlineMarkdown と同じトークナイズをミラーする
// （素朴な /`.*。.*`/ では「`a` 。 `b`」のようにスパンの外にある「。」を
//   閉じ backtick〜開き backtick の区間として誤検出する）
function hasPeriodInsideInline(text) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/)
  return parts.some(
    (p) =>
      ((p.startsWith('`') && p.endsWith('`') && p.length > 2) ||
        (p.startsWith('**') && p.endsWith('**') && p.length > 4)) &&
      p.includes('。'),
  )
}

/** 形式整合＋連作整合＋インライン記法の静的検査。失敗件数を返す */
function verifyShape(lessons) {
  let fails = 0

  console.log(
    '\n=== 形式整合: 実践クラスのフィールド規約（040+ は scenario/requirements 必須・039 以前は禁止）===',
  )
  for (const id of Object.keys(lessons).sort()) {
    const lesson = lessons[id]
    const isPractical = parseInt(id, 10) >= 40
    const hasScenario = typeof lesson.scenario === 'string' && lesson.scenario.length > 0
    const hasRequirements = Array.isArray(lesson.requirements) && lesson.requirements.length > 0
    const ok = isPractical
      ? hasScenario && hasRequirements
      : lesson.scenario === undefined && lesson.requirements === undefined
    if (!ok) {
      fails++
      console.log(
        `  ${id}: *** FAIL *** (practical=${isPractical} scenario=${hasScenario} requirements=${hasRequirements})`,
      )
    }
    // splitAtPeriod を通るフィールドのみ検査（requirements は li 表示で分割されない）
    for (const [field, text] of [
      ['description', lesson.description],
      ['challenge', lesson.challenge],
      ['scenario', lesson.scenario],
    ]) {
      if (typeof text === 'string' && hasPeriodInsideInline(text)) {
        fails++
        console.log(
          `  ${id}: *** FAIL *** ${field} のインライン記法（\`〜\`/**〜**）内に「。」がある`,
        )
      }
    }
  }
  if (fails === 0) console.log('  全レッスン OK')

  console.log('\n=== 連作整合: initialCode が前レッスン模範解答のアンカーを含むか ===')
  for (const { id, prev, anchors } of CONTINUITY) {
    const lesson = lessons[id]
    if (!lesson) {
      console.log(`  ${id}: SKIP (レッスン未実装)`)
      continue
    }
    if (!SOLUTIONS[prev]) {
      fails++
      console.log(`  ${id}: *** FAIL *** 前レッスン ${prev} の SOLUTION が未登録`)
      continue
    }
    for (const anchor of anchors) {
      const inInitial = lesson.initialCode.includes(anchor)
      const inPrevSolution = SOLUTIONS[prev].includes(anchor)
      if (!inInitial || !inPrevSolution) {
        fails++
        console.log(
          `  ${id}: *** FAIL *** anchor "${anchor}" (initialCode=${inInitial} / ${prev} SOLUTION=${inPrevSolution})`,
        )
      }
    }
  }
  if (CONTINUITY.length === 0) console.log('  （連作アンカー未登録）')

  return fails
}

async function main() {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.ts'))
    .sort()

  const lessons = {}
  for (const f of files) {
    const lesson = loadLesson(path.join(DATA_DIR, f))
    lessons[lesson.id] = lesson
  }

  let mismatches = 0
  let solFails = 0
  const shapeFails = verifyShape(lessons)

  console.log('=== 回帰: initialCode の判定が new Function 版と AsyncFunction 版で一致するか ===')
  for (const id of Object.keys(lessons).sort()) {
    const lesson = lessons[id]
    const sync = judgeSync(lesson.initialCode, lesson.testCases)
    const asyncR = await judgeAsync(lesson.initialCode, lesson.testCases)
    const ok = sync === asyncR
    if (!ok) mismatches++
    console.log(`  ${id}: sync=${sync} async=${asyncR} ${ok ? 'OK' : '*** MISMATCH ***'}`)
  }

  console.log('\n=== 前進: 模範解答が correct を返すか（AsyncFunction 版） ===')
  for (const [id, code] of Object.entries(SOLUTIONS)) {
    const lesson = lessons[id]
    if (!lesson) {
      console.log(`  ${id}: SKIP (レッスン未実装)`)
      continue
    }
    const r = await judgeAsync(code, lesson.testCases)
    const ok = r === 'correct'
    if (!ok) solFails++
    console.log(`  ${id}: solution=${r} ${ok ? 'OK' : '*** FAIL ***'}`)
  }

  console.log('\n=== 前進: 誤り版が incorrect を返すか（AsyncFunction 版） ===')
  for (const { id, label, code } of WRONG) {
    const lesson = lessons[id]
    if (!lesson) {
      console.log(`  ${id} [${label}]: SKIP (レッスン未実装)`)
      continue
    }
    const r = await judgeAsync(code, lesson.testCases)
    const ok = r === 'incorrect'
    if (!ok) solFails++
    console.log(`  ${id} [${label}]: wrong=${r} ${ok ? 'OK' : '*** FAIL ***'}`)
  }

  console.log(
    `\n結果: 回帰ミスマッチ ${mismatches} 件 / 前進失敗 ${solFails} 件 / 形式・連作 ${shapeFails} 件 / 検証レッスン ${Object.keys(lessons).length} 本`,
  )
  process.exit(mismatches + solFails + shapeFails === 0 ? 0 : 1)
}

// 他スクリプト（verify-strict.cjs 等）から SOLUTIONS 等を再利用できるようエクスポート。
// 直接実行されたときだけ検証を走らせる。
module.exports = { SOLUTIONS, WRONG, sanitizeForChecks, loadLesson, transpile }
if (require.main === module) main()
