---
created: "2026-05-27"
status: approved
phase: "横断（全Phase適用）"
sources:
  - "Notion: AI駆動開発：セキュリティ 配下4ページ"
  - "Phase 4-1/4-2/4-3 設計判断"
---

# セキュリティ設計書

> 本書は「開発プロセスのセキュリティ」と「Webアプリ自体のセキュリティ」の両軸を記録する。
> 参照元: Notion「AI駆動開発：セキュリティ」配下4ページ（2026-05-27 取り込み）

---

## 概要：2軸のセキュリティ

| 軸 | 対象 | 主な脅威 |
|----|------|---------|
| ① 開発プロセス | Claude Code で開発する環境 | 機密情報漏洩・破壊的操作・ログ不在 |
| ② Webアプリ自体 | エンドユーザーが使うアプリ | XSS・Supabase RLS 突破・ユーザーコード悪用 |

---

## なぜこの設計か

### 参照元の原則（Notion セキュリティページより）

**「分ける・残す・防ぐ」（バイブコーディングのリスク）**
- **分ける**: AI が操作する環境を普段使いの端末/本番環境から分離する
- **残す**: 事故対応で一番困るのはログが無いこと。変更の痕跡を追える状態にする
- **防ぐ**: 機密を渡さない・サンドボックスで隔離・CLAUDE.md でガードレール

**Claude Code セキュリティ対策6選（隠す・分ける・縛る・確かめる・リセットする）**
1. 機密ファイルを隠す（`.env.local` は Git 除外）
2. 履歴ファイルを管理する
3. APIキーをハードコードしない（環境変数で管理）
4. サンドボックス有効化
5. CLAUDE.md でガードレールを設定
6. TDD + コンテキスト定期クリア

---

## ① 開発プロセスのセキュリティ

### 1-1. 機密情報の管理（対策①③）

```
# 管理方針
.env.local        → .gitignore で除外済み（create-next-app デフォルト）
.env.local.example → コミット可（値なしのテンプレート）
Supabase keys     → .env.local にのみ記載
service_role key  → MVP では使わない（必要になったらサーバーサイド専用）
```

**なぜ `NEXT_PUBLIC_` プレフィックスに気をつけるか**: Next.js は `NEXT_PUBLIC_` 付きの変数をクライアントバンドルに含める。`service_role` キーに付けると即漏洩。`anon` キーだけが `NEXT_PUBLIC_` 許容。

### 1-2. CLAUDE.md ガードレール（対策⑤）

`typescript-learning-app/CLAUDE.md` に以下を明記済み:
- `.env.local` を読まない/生成しない/ハードコードしない
- 破壊的コマンド（`rm -rf` 等）を実行しない
- 本番 Supabase に直接接続しない
- RLS を無効化するマイグレーションを書かない
- `git push --force` を main に実行しない

### 1-3. 変更の追跡（対策②「残す」）

- コミット単位を小さく保ち、`git log` で変更経緯を追えるようにする
- `supabase/migrations/` でDB変更をSQLファイルとして版管理する
- `.company/secretary/notes/` に意思決定ログを残す（自動記録ルール）

### 1-4. TDD（対策⑥）

- テストを先に書くことで「壊している」を早期に検知する
- Phase 5-2 以降のコア実装では `judge.worker.ts` のテストを先行させる

---

## ② Webアプリ自体のセキュリティ

### 2-1. ユーザーコード実行の隔離（最重要）

本アプリの最大の特徴は「ブラウザでユーザーが書いた TypeScript を実行する」こと。

```
┌─────────────────────────────────────────────┐
│  ブラウザ (Main Thread)                      │
│  ┌──────────────────────────────────────┐   │
│  │  LessonWorkspace（UI・状態管理）      │   │
│  └────────────┬─────────────────────────┘   │
│               │ postMessage                  │
│  ┌────────────▼─────────────────────────┐   │
│  │  judge.worker.ts（隔離実行）          │   │
│  │  ts.transpileModule → Function()      │   │
│  │  5秒でタイムアウト → terminate()      │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ※ サーバーサイドでユーザーコードを実行しない │
└─────────────────────────────────────────────┘
```

**なぜ Worker か**: Main thread で `eval()` / `Function()` を使うと UI がブロックされ、無限ループで応答不能になる。Worker は `terminate()` で強制終了できる。

**なぜサーバーで実行しないか**: 未信頼コードのサーバーサイド sandbox 化は困難 + コスト増大。各ユーザーが自分のブラウザで実行するだけなので他者への攻撃面がそもそも存在しない。

### 2-2. Supabase RLS（行レベルセキュリティ）

```sql
-- 両テーブルでRLS有効化必須
alter table public.profiles        enable row level security;
alter table public.lesson_progress enable row level security;

-- 「自分の行だけ」に絞る（auth.uid() と一致する行のみ）
```

**なぜ anon キーで全行が読めないか**: RLS を有効化した状態では、`anon` キーで接続しても WHERE 相当のフィルタが自動適用される。RLS 未有効だと全行公開になるため、**テーブル作成直後に必ず有効化する**。

**`using` vs `with check` の使い分け（必ず守る）**:
- SELECT/UPDATE/DELETE → `using`（既存行への操作フィルタ）
- INSERT → `with check`（新規書き込み行の検証）
- 取り違えると「他人の user_id を詐称した INSERT が通る」穴になる

### 2-3. Server Action による lesson_id 検証

`lesson_progress` テーブルの `lesson_id` は DB FK なし（MDX が正本）。存在しない lesson_id を弾く責任はアプリ層が持つ。

```typescript
// lib/progress/actions.ts
'use server'
export async function markLessonComplete(lessonId: string) {
  // ★ FKがない分、ここで MDXカタログ存在確認を必ず行う
  if (!getCatalog().has(lessonId)) throw new Error(`unknown lesson: ${lessonId}`)
  // ...
}
```

### 2-4. 環境変数の扱い方（Next.js 固有）

| 変数名 | バンドル先 | 用途 |
|--------|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | クライアント含む | Supabase URL（公開OK） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | クライアント含む | RLS適用のanon key（公開OK） |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバーのみ | RLS bypass（MVP では使わない） |

`NEXT_PUBLIC_` プレフィックスを付けた変数はクライアントに露出する。`service_role` には**絶対に付けない**。

### 2-5. 認証（Supabase Auth）

- OAuth のみ（GitHub / Google）。パスワード認証は導入しない（管理コスト > リスク）
- `auth.users` はSupabase管理領域。アプリから直接JOINしない
- `handle_new_user()` トリガーは `security definer` で実行（RLS bypass が必要なため）。`search_path = public` を固定して権限昇格経路を塞ぐ

### 2-6. ゲスト用 localStorage の取り扱い

- ゲスト進捗は `localStorage` に保存（`lib/progress/guest.ts`）
- 保存するのは `lesson_id`（文字列）のみ。センシティブ情報を localStorage に保存しない
- ログイン時に upsert でDBへマージ後、localStorage のゲスト進捗は削除する

### 2-7. 依存パッケージの脆弱性管理（npm audit・2026-06-11 対応）

npm audit moderate 4件（postcss ×2エントリ・dompurify ×2エントリ）への対応。
`npm audit fix --force` は next@9 / monaco@0.53 への破壊的ダウングレードを提案するため不採用とし、
`package.json` の `overrides` で修正版へ差し替えた。

**postcss <8.5.10（next 同梱）→ override で 8.5.15**
- なぜ危険か: CSS stringify 出力中の `</style>` 未エスケープで XSS の可能性（GHSA-qx2v-qp2m-jg93）
- 実リスク評価: 本アプリはユーザー制御の CSS を stringify しない（Tailwind ビルドのみ）ため実害なし
- なぜ override か: next は最新 16.2.9 でも postcss 8.4.31 を固定ピンしており、本体更新では解消不可
- 注意: スコープ付き override（`"next": {"postcss": ...}`）は既存 lockfile の nested エントリに適用されず、
  グローバル override（`"postcss": "8.5.15"`）で解消した（root 側 tailwind チェーンは元々 8.5.15）

**dompurify <=3.3.3（monaco-editor 0.55.1 依存）→ override で 3.4.9（※残存リスクあり）**
- なぜ危険か: sanitize バイパス・prototype pollution 等の複数 advisory（mXSS 系）
- **残存リスク: 配信される Monaco min バンドル（`public/monaco/vs/editor.api-*.js`）には dompurify が
  バンドル済みで、npm override はバンドル内のコピーには届かない**
- 実リスク評価: Monaco の dompurify はホバー等の markdown sanitize に使用される。本アプリは
  他ユーザー由来のコードを表示しない（コード共有機能なし・進捗は lesson_id のみ）ため、
  攻撃面は自己 XSS に限定され低リスクと判断
- 恒久対応: 修正済み dompurify を同梱する monaco-editor **安定版**（0.56 系）リリース時にアップグレード
  （2026-06-11 時点の安定版最新は 0.55.1、0.56 は dev ビルドのみ）
- 検証: `npm audit` 0件 / tsc / eslint / verify-lessons / verify-strict / `next build` すべて PASS

運用: CI の常設ゲートに `npm audit --audit-level=high` を組み込み、新規 high 以上の混入を防ぐ
（moderate はバンドル同梱等で即修正できないケースがあるため、high 以上をブロック基準とする）。

---

## セキュリティチェックリスト（実装前確認用）

### 機能追加のたびに確認
- [ ] 新しい環境変数を追加した場合、`NEXT_PUBLIC_` の付け忘れ/付けすぎがないか
- [ ] 新しい Supabase テーブルに RLS を有効化したか
- [ ] INSERT ポリシーは `using` でなく `with check` を使っているか
- [ ] ユーザーコードを実行する新しいコードパスは Worker 経由か
- [ ] Server Action に「誰でも呼べる」穴がないか（`getUser()` で認証確認）

### リリース前
- [ ] `.env.local` がコミットされていないか（`git status` で確認）
- [ ] SupabaseダッシュボードでRLSが全テーブルに有効化されているか
- [ ] `service_role` キーがクライアントバンドルに含まれていないか

---

## 学びポイント（TypeScript学習との相乗効果）

- **型による情報秘匿の設計**: サーバーだけが知る型（`service_role` 使用箇所の型）とクライアントが知る型を分けることは、TypeScriptの「型の境界」設計そのもの
- **discriminated union でエラーを型化**: RLSポリシー違反は Supabase のエラーレスポンスで返る。これを `PostgrestError | null` 型で受け取り、`if (error)` で安全に処理する訓練になる
- **`'use server'` = 型付きセキュリティ境界**: Server Action の関数シグネチャが「ネットワーク越しに呼べる型付きRPC」として機能する。入力型を狭く定義することがサーバーサイドバリデーションの第一歩になる

---

## 参考（Notion セキュリティページ）

- Docker SandboxでAIコーディングを安全に全自動化
- 非エンジニアでも必須のセキュリティ常識（バイブコーディングのリスク）
- ハーネスエンジニアリング（Claude Code/自律開発の設計）
- Claude Code：初心者向けセキュリティ対策6選
