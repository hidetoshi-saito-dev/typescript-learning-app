// judge.worker.ts — ブラウザ内隔離実行ワーカー（Phase 4-1 完全クライアントサイド判定 Step2）
// TypeScript を transpileModule でトランスパイル → AsyncFunction コンストラクタで実行
// タイムアウト制御は呼び出し元（main thread）が worker.terminate() で担当
//
// 【なぜ AsyncFunction か（中級 030/031 非同期レッスン対応）】
// 中級の Promise/async レッスンでは assertion 内で `await delay(...)` のように await を使う。
// transpileModule({ module: None }) はトップレベル await を変換せず出力にそのまま残すため、
// 従来の `new Function(out)()` で実行すると `await is not defined` で必ず throw していた。
// AsyncFunction（= async 関数のコンストラクタ）で実行すると本体内なので await が合法になり、
// 同期コード（001-029）も async 関数内で等価に動く（同期 throw は reject 化され await で捕捉）。
// 【重要】各ケースを必ず `await` すること。await し損ねると、失敗すべき assertion の reject が
// try/catch をすり抜けて誤って「正解」判定になる（偽陽性）。
//
// 【なぜ __originalCode__ を字句サニタイズするか（2026-06-09 偽陽性修正・2026-06-11 追補）】
// レッスンの②型構文チェックは __originalCode__（ユーザーソース）に対する正規表現で
// 「型キーワードを書いたか」を判定する。生ソースをそのまま渡すと、学習者が型を一切書かず
// コメント・文字列・置換付きテンプレート・正規表現リテラルへキーワードを置くだけで一致し、
// 偽陽性（チート合格）になる。そこで「コードとしての構造」だけを検査対象にする:
//   - __originalCode__ : コメント除去＋文字列/テンプレート/正規表現の中身ブランク（型キーワード系②向け）
//   - __rawCode__      : コメント除去のみ・リテラルは保持（リテラル値を検査するレッスン向け）
// サニタイズ実装は src/lib/judge/sanitize.ts（ユニットテストで境界を固定）。

import ts from 'typescript'
import { sanitizeForChecks } from '@/lib/judge/sanitize'
import type { TestCase, WorkerResult } from '@/types'

type WorkerInput = {
  code: string
  testCases: TestCase[]
}

// async 関数のコンストラクタ。`AsyncFunction(body)` は実行時に async 関数を生成する。
// グローバルには公開されていないため async 関数のプロトタイプ経由で取得する。
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as FunctionConstructor

self.addEventListener('message', async (event: MessageEvent<WorkerInput>) => {
  const { code, testCases } = event.data
  const failedTests: string[] = []

  // サニタイズはコードごとに1回でよい（テストケース間で不変）
  const { structure, noComments } = sanitizeForChecks(code)

  for (const tc of testCases) {
    try {
      // __originalCode__ / __rawCode__ を注入してからユーザーコード + アサーションを結合。
      // ②型構文チェックは __originalCode__（構造）を、リテラル値チェックは __rawCode__ を参照する。
      const fullCode =
        `const __originalCode__ = ${JSON.stringify(structure)}\n` +
        `const __rawCode__ = ${JSON.stringify(noComments)}\n` +
        `${code}\n${tc.assertion}`
      const transpiled = ts.transpileModule(fullCode, {
        compilerOptions: {
          module: ts.ModuleKind.None, // import/export なしの単一スクリプト
          target: ts.ScriptTarget.ES2017,
          strict: false, // 型チェックなし（速度優先・型チェックはStep1で済み）
        },
      }).outputText

      // AsyncFunction で隔離実行し、Promise の解決まで await する。
      // Worker コンテキスト内なので main thread には影響しない。
      // await 必須: 非同期 assertion の失敗（reject）をここで確実に捕捉するため。
      await new AsyncFunction(transpiled)()
    } catch (e) {
      // throw new Error("...") のメッセージがあればそれを表示、なければテスト名にフォールバック
      const msg = e instanceof Error && e.message ? e.message : tc.description
      failedTests.push(msg)
    }
  }

  const result: WorkerResult =
    failedTests.length === 0 ? { status: 'correct' } : { status: 'incorrect', failedTests }

  self.postMessage(result)
})
