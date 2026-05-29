---
date: "2026-05-26"
type: decisions
---

# 意思決定ログ 2026-05-26

## 認証方式（Phase 3-3 / B1）

- **決定**: Supabase Auth + **GitHub OAuth + Google OAuth**。最初の3レッスンはゲスト試用（ログイン不要・進捗保存なし）、4レッスン目以降と進捗保存はログイン必須。
- **背景**: ペルソナA（初学者）はGitHubアカウント未保有の可能性が高く、GitHub限定だとコア価値「環境構築ゼロ・URLを開くだけで書ける」に反する。Google OAuthの並列提供とゲスト試用で参入障壁を下げる。
- **反映先**: Notion🔌外部連携仕様 / サイトマップ / ユーザーフロー図。

---

## 技術選定（Phase 4-1）

> 詳細は `engineering/docs/tech-stack.md`、調査は `research/topics/editor-and-execution-engine.md`。

| 領域 | 決定 | 理由（要点） |
|------|------|-------------|
| フレームワーク | Next.js（App Router） | サイトマップ・design-tokensが前提。TS第一・Vercel親和・学習リソース最大 |
| スタイリング | Tailwind CSS + shadcn/ui | design-tokens流用・WCAG AAをshadcn/uiで担保（オーナーが明示確認） |
| エディタ | Monaco Editor | TS言語サービス内蔵＝赤波線/診断/補完がコア機能に直結 |
| TS実行・判定 | 完全クライアントサイド（Monaco TSワーカー + 自作Web Worker） | 無料・環境構築ゼロ・即時の3制約に構造的に最適 |
| DB・認証 | Supabase（既決） | 認証と進捗DBを単一基盤に統合 |
| ホスティング | Vercel | Next.jsネイティブ・無料枠・低移行リスク |

### 重要な設計判断

1. **判定エンジンは完全クライアントサイド**: Step1型チェックはMonacoのTSワーカー再利用、Step2テスト実行は自作Web Worker（`transpileModule`→隔離実行→タイムアウトで`terminate`）。サーバーで他人のコードを動かさないので未信頼コードのsandbox問題が発生しない。
2. **日本語エラー解説は自前パイプライン**: MonacoのTS診断は英語デフォルト。「TSエラーコード→キュレーション済み日本語解説」辞書を第一級モジュールとして設計（公式jaロケールはフォールバック）。直訳より初学者向け＝差別化の核。

### 見送り（やめる理由を記録）

- CodeMirror 6（TS診断の別配線コスト）/ Sandpack・WebContainers（重い・過剰、Safari不可）/ サーバー実行（コスト・sandbox困難）/ Astro・Remix（用途不一致・エコシステム）

### スコープ境界

- 本決定は Phase 4-1（技術選定）まで。Phase 4-2（ERD/RLS）・4-3（ディレクトリ/コンポーネント/API/状態管理）は後続。
- Phase 5冒頭に技術検証スパイク（Monaco描画 / 日本語診断1件 / Worker実行1件）を推奨。中核アーキテクチャの不確実性を先に潰す。
