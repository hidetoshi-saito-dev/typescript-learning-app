/**
 * verify-strict.cjs — Monaco strict 化(① 層)のヘッドレス相当検証
 *
 * Monaco の strict 診断は TS ワーカー依存で完全な再現はブラウザでしかできないが、
 * 本物の `typescript` で各レッスンを strict コンパイルすれば、最大の回帰リスク
 * 「模範解答が strict でエラー → 正答なのに型ゲートで判定ブロックされる」を確実に検出できる。
 *
 * - 模範解答(SOLUTIONS): strict でエラー 0 でなければ *** FAIL ***（赤なら strict 化はそのままでは不可）。
 * - initialCode: strict での診断件数を表示（型必須レッスンはエラーが出るのが正常＝型を書かせる狙い）。
 *
 * 使い方: node scripts/verify-strict.cjs
 */
const ts = require('typescript')
const fs = require('fs')
const path = require('path')
const { SOLUTIONS, loadLesson } = require('./verify-lessons.cjs')

const DATA_DIR = path.join(__dirname, '../src/lib/lessons/data')

// CodeEditor.tsx の setCompilerOptions と対応（ブラウザ context なので dom lib を含める）
const options = {
  strict: true,
  noImplicitAny: true,
  target: ts.ScriptTarget.ES2017,
  lib: ['lib.es2017.d.ts', 'lib.dom.d.ts'],
  noEmit: true,
  skipLibCheck: true,
}

function strictDiagnostics(code) {
  const fileName = 'lesson.ts'
  const sf = ts.createSourceFile(fileName, code, ts.ScriptTarget.ES2017, true)
  const host = ts.createCompilerHost(options)
  const orig = host.getSourceFile.bind(host)
  host.getSourceFile = (name, langVersion, onErr) =>
    name === fileName ? sf : orig(name, langVersion, onErr)
  host.writeFile = () => {}
  const program = ts.createProgram([fileName], options, host)
  return ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file && d.file.fileName === fileName)
    .map((d) => `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`)
}

const files = fs
  .readdirSync(DATA_DIR)
  .filter((f) => f.endsWith('.ts'))
  .sort()
const initial = {}
for (const f of files) {
  const lesson = loadLesson(path.join(DATA_DIR, f))
  initial[lesson.id] = lesson.initialCode
}

let solErrors = 0
console.log('=== strict: 模範解答がクリーンか（最重要・赤ければ正答が判定ブロックされる回帰）===')
for (const [id, code] of Object.entries(SOLUTIONS)) {
  if (!initial[id]) {
    console.log(`  ${id}: SKIP (未実装)`)
    continue
  }
  const d = strictDiagnostics(code)
  if (d.length) {
    solErrors++
    console.log(`  ${id}: *** ${d.length} 件 FAIL ***`)
    d.forEach((m) => console.log(`      ${m}`))
  } else {
    console.log(`  ${id}: clean OK`)
  }
}

console.log(
  '\n=== strict: initialCode の診断（型必須レッスンはエラーが正常＝判定ブロックで型を促す）===',
)
for (const id of Object.keys(initial).sort()) {
  const d = strictDiagnostics(initial[id])
  console.log(`  ${id}: ${d.length === 0 ? 'エラーなし' : d.length + ' 件 → ' + d.join(' | ')}`)
}

console.log(`\n結果: 模範解答の strict エラー ${solErrors} 件（0であるべき）`)
process.exit(solErrors === 0 ? 0 : 1)
