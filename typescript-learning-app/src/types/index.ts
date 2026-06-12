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
  // 実践クラス（040+）専用。040+ は両方必須・039 以前は禁止という不正状態は
  // 型では表現せず verify-lessons の形式整合チェックで固定する（設計正本 curriculum-practical.md）
  scenario?: string // 依頼の文脈。チケットカードに「。」分割の段落で表示
  requirements?: string[] // 仕様。チケットカードに1要素=1箇条書きで表示
}

// Worker 内部用（Worker → main thread のメッセージ型）
export type WorkerResult = { status: 'correct' } | { status: 'incorrect'; failedTests: string[] }
