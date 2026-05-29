// judge.worker.ts — ブラウザ内隔離実行ワーカー（Phase 4-1 完全クライアントサイド判定 Step2）
// TypeScript を transpileModule でトランスパイル → Function コンストラクタで実行
// タイムアウト制御は呼び出し元（main thread）が worker.terminate() で担当

import ts from 'typescript'
import type { TestCase, WorkerResult } from '@/types'

type WorkerInput = {
  code: string
  testCases: TestCase[]
}

self.addEventListener('message', (event: MessageEvent<WorkerInput>) => {
  const { code, testCases } = event.data
  const failedTests: string[] = []

  for (const tc of testCases) {
    try {
      // __originalCode__ を注入してからユーザーコード + アサーションを結合。
      // アサーション内で __originalCode__ を参照するとオリジナルの TypeScript ソースを検証できる
      // （例: 型注釈が正しく書かれているかのチェック）
      const fullCode = `const __originalCode__ = ${JSON.stringify(code)}\n${code}\n${tc.assertion}`
      const transpiled = ts.transpileModule(fullCode, {
        compilerOptions: {
          module: ts.ModuleKind.None, // import/export なしの単一スクリプト
          target: ts.ScriptTarget.ES2017,
          strict: false, // 型チェックなし（速度優先・型チェックはStep1で済み）
        },
      }).outputText

      // Function コンストラクタで隔離実行
      // Worker コンテキスト内なので main thread には影響しない
      new Function(transpiled)()
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
