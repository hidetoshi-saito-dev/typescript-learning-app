/**
 * copy-monaco.cjs — Monaco Editor のアセットを self-host 用に public/ へコピー。
 *
 * 【なぜ】@monaco-editor/react は既定で Monaco 本体を CDN(jsdelivr) から読み込む。
 * これを self-host 化すると CSP から jsdelivr を外せ（サプライチェーン面の縮小）、
 * 版ズレ（CDN既定版 ≠ 型定義の版）も解消できる。
 *
 * 【方法】node_modules/monaco-editor/min/vs（AMD/min ビルド）を public/monaco/vs へ複製し、
 * CodeEditor で loader.config({ paths: { vs: '/monaco/vs' } }) を指す。
 * public/monaco は gitignore（15MB・生成物）。dev/build 前と install 後に実行（package.json）。
 *
 * 版を marker に記録し、版一致かつ loader.js 存在ならスキップ（冪等・高速）。
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const srcVs = path.join(root, 'node_modules/monaco-editor/min/vs')
const destDir = path.join(root, 'public/monaco')
const destVs = path.join(destDir, 'vs')
const marker = path.join(destDir, '.monaco-version')

if (!fs.existsSync(srcVs)) {
  console.error('[copy-monaco] monaco-editor の min/vs が見つかりません:', srcVs)
  console.error('[copy-monaco] 依存 "monaco-editor" がインストールされているか確認してください。')
  process.exit(1)
}

const version = require(path.join(root, 'node_modules/monaco-editor/package.json')).version

const upToDate =
  fs.existsSync(marker) &&
  fs.readFileSync(marker, 'utf8').trim() === version &&
  fs.existsSync(path.join(destVs, 'loader.js'))

if (upToDate) {
  console.log(`[copy-monaco] 最新コピー済み (v${version})。スキップ。`)
  process.exit(0)
}

fs.rmSync(destDir, { recursive: true, force: true })
fs.mkdirSync(destVs, { recursive: true })
fs.cpSync(srcVs, destVs, { recursive: true })
fs.writeFileSync(marker, version + '\n')
console.log(`[copy-monaco] コピー完了 v${version}: ${srcVs} -> ${destVs}`)
