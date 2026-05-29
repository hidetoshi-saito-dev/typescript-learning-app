@AGENTS.md

# TypeScript学習Webアプリ — 開発ガイド

## プロジェクト概要

日本語でTypeScriptをインタラクティブに学べるWebアプリ。
ブラウザ内でコードを書いて即フィードバックが得られる。

**技術スタック:** Next.js 16（App Router / Turbopack）/ Tailwind CSS / Monaco Editor / Supabase / TypeScript strict mode

**設計ドキュメント（正本）:**

- アーキテクチャ: `.company/engineering/docs/architecture.md`
- DB設計: `.company/engineering/docs/database-design.md`

---

## セキュリティガードレール（必ず守ること）

### 機密情報

- `.env.local` を読まない・生成しない・コードにハードコードしない
- Supabase `service_role` キーをクライアントサイドのコードに書かない
- APIキーをコメント・ログ・console.log に出力しない
- シークレットを含むコードを `git commit` しない（.gitignore で `.env*` は除外済み）

### ファイル・コマンド操作

- `rm -rf` 等の破壊的コマンドは実行しない（ユーザーが明示した場合のみ）
- `node_modules/` を直接編集しない
- `git push --force` を main/master には実行しない

### Supabase / DB 操作

- 開発は `supabase start`（ローカル）のみ。本番Supabaseに直接接続しない
- RLSを無効化するマイグレーションを書かない
- `supabase_admin` ロールを使うコードをアプリ層に書かない

### ユーザーコード実行（アプリ固有）

- ユーザーの TypeScript コードは必ず Web Worker 内で実行する（main thread 汚染禁止）
- Worker は 5 秒でタイムアウト → `worker.terminate()`（無限ループ対策）
- ユーザーコードをサーバーサイドで実行するエンドポイントを作らない

---

## アーキテクチャの重要ルール

- ページ（`page.tsx`）は Server Component デフォルト。`'use client'` は最小限にとどめる
- `dynamic(..., { ssr: false })` は必ず Client Component（`'use client'`）の中で使う（Next.js 16 制約）
- Monaco 診断取得は `monaco.typescript.getTypeScriptWorker()`（`monaco.languages.typescript` は deprecated）
- **判定HTTP APIを作らない**。`judge()` はブラウザ内ローカル関数のみ
- 進捗書き込みは Server Action `markLessonComplete()` のみ経由する（lesson_id のサーバー検証あり）
