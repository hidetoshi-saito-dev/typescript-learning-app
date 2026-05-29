// 共有型定義（アーキテクチャ設計書 Phase 4-3 準拠）

export type TypeScriptDiagnostic = {
  code: number
  message: string // JP訳済みメッセージ
  severity: 'error' | 'warning'
}

export type TestCase = {
  description: string
  assertion: string // ユーザーコード実行後に評価するJS。失敗時は throw する
}

export type JudgeRequest = {
  code: string
  testCases: TestCase[]
}

export type JudgeResponse =
  | { status: 'type_error'; diagnostics: TypeScriptDiagnostic[] }
  | { status: 'correct' }
  | { status: 'incorrect'; failedTests: string[] }

export type Lesson = {
  id: string
  title: string
  description: string // TypeScript概念の説明（学びセクション）
  challenge: string // 課題の説明（課題セクション）
  hint?: string
  initialCode: string
  testCases: TestCase[]
}

// Worker 内部用（Worker → main thread のメッセージ型）
export type WorkerResult = { status: 'correct' } | { status: 'incorrect'; failedTests: string[] }
