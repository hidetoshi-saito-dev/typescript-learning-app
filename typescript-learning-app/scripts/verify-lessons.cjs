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

function buildFullCode(code, assertion) {
  return `const __originalCode__ = ${JSON.stringify(code)}\n${code}\n${assertion}`
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
}
const WRONG = {
  // 015 の誤り: 制約を外すと正規表現チェックで落ちる（実行値は通るが①相当の構文ゲートで不正解）
  '015-generics-constraint': `function getLength<T>(value: T): number {\n  return (value as any).length\n}`,
  // 018 の誤り: typeof 型を使わず手書き型のままだと②で不正解になるべき
  '018-typeof-type': `const defaultConfig = { theme: "dark", fontSize: 14 }\n\nfunction applyConfig(config: { theme: string; fontSize: number }): string {\n  return config.theme + ":" + config.fontSize\n}`,
}

;(async () => {
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
  for (const [id, code] of Object.entries(WRONG)) {
    const lesson = lessons[id]
    if (!lesson) {
      console.log(`  ${id}: SKIP (レッスン未実装)`)
      continue
    }
    const r = await judgeAsync(code, lesson.testCases)
    const ok = r === 'incorrect'
    if (!ok) solFails++
    console.log(`  ${id}: wrong=${r} ${ok ? 'OK' : '*** FAIL ***'}`)
  }

  console.log(
    `\n結果: 回帰ミスマッチ ${mismatches} 件 / 前進失敗 ${solFails} 件 / 検証レッスン ${Object.keys(lessons).length} 本`,
  )
  process.exit(mismatches + solFails === 0 ? 0 : 1)
})()
