---
date: "2026-05-27"
type: decisions
---

# 意思決定ログ 2026-05-27

## DB設計（Phase 4-2）

> 正本: `engineering/docs/database-design.md`。Notion: 🗄️ Phase 4-2: DB設計（Phase 4配下）。

### 決定1: テーブルは3つだけ（profiles / lesson_progress / auth.users）

- **決定**: DBに保存するのは「誰が・どのレッスンを・いつ完了したか」のみ。`auth.users`（Supabase管理）+ `public.profiles`（公開プロフィール・1:1）+ `public.lesson_progress`（完了記録・user×lesson）。
- **背景**: 進捗は正解時のみ保存（Phase 3-3契約）。保存対象は「完了イベント」だけで足りる。

### 決定2: `lessons` / `courses` テーブルを作らない（最重要）

- **決定**: レッスンの存在・順序・所属コースはMDXカタログ（`content/lessons/*.mdx`）から導出。`lesson_progress` は `lesson_id` / `course_id` をTEXTで論理参照（FKなし）。
- **背景**: レッスンの正本はMDX（Git、Phase 2 ブロッカー#3）。同じ情報をDBにも持つと正本が二重化し同期問題が発生する。単一正本の維持が整合性の根本。総レッスン数もMDXカタログ件数から得られDBに聞かない。
- **トレードオフ**: `lesson_id` にDB-FKがない → アプリ層でMDXカタログとの一致を保存前に検証して補う。
- **分岐条件**: サーバー側レッスン横断クエリ（不正解率分析・DB編集型CMS化）が必要になったら、そのとき初めて `lessons` テーブルを追加。

### 決定3: `course_id` を今から持つ

- **決定**: MVPは1コース（`beginner`）だが `lesson_progress.course_id` を最初から持つ。
- **背景**: 進捗は本質的にコース単位。v1.0/v2.0のコース追加時にマイグレーション不要にする。TEXT1列のコストはほぼゼロで後付けより安い。

### 決定4: RLSは「自分の行だけ」+ profiles自動生成トリガ

- **決定**: 両テーブルでRLS有効化。全操作を `auth.uid() = user_id`（profilesは`= id`）に限定。サインアップ時に `handle_new_user()`（`security definer`）でprofilesを自動生成し、OAuthメタデータ（GitHub:`user_name` / Google:`full_name`、アバターは`avatar_url`/`picture`）から表示名を拾う。
- **背景**: SupabaseはRLS未有効だとanonキーで全行が読める。INSERTは `with check`、既存行操作は `using` で書き分ける（取り違えると他人IDの詐称穴になる）。

### 補足: ゲスト進捗のマージ

- ゲストがlocalStorageに貯めた1〜3レッスンの完了を、ログイン直後に複合PK衝突キーの upsert でDBへ移す。学習継続を切らさない。

---

## アーキテクチャ設計（Phase 4-3）

> 正本: `engineering/docs/architecture.md`。Notion: 🏗️ Phase 4-3: アーキテクチャ設計（Phase 4配下）。

### 決定1: サーバー/クライアント境界が設計の背骨

- **決定**: ページ（`page.tsx`）はServer Componentでデータ取得（MDX読み・進捗読み）と認可を担い、対話部分だけをClient Container `LessonWorkspace` に閉じ込める。MDXはサーバー描画し `children` でClientに差し込む。Monacoのみ `dynamic(..., {ssr:false})`。
- **背景**: App Routerでは「どこがServer/どこがClient か」がバンドル・認可・データ取得を全て決める。秘匿情報（Supabaseサーバーキー）をブラウザに漏らさない型の壁でもある。

### 決定2: 判定APIは作らない（最重要）

- **決定**: 判定は `judge(req: JudgeRequest): Promise<JudgeResponse>` というブラウザ内ローカル関数。HTTPエンドポイントは存在しない。サーバー越境は Server Actions（進捗書き）と OAuthコールバック（Route Handler）の2種だけ。
- **背景**: 完全クライアントサイド判定（4-1）の必然の帰結。サーバーで他人のコードを動かさない＝判定APIが要らない。

### 決定3: 進捗書きは Server Action（lesson_idのサーバー検証）

- **決定**: `markLessonComplete(lessonId)` を Server Action にし、`getCatalog().has(lessonId)` でMDXカタログ存在チェック→Supabase upsert。読みはRSCで直接select（RLS適用）。
- **背景**: 4-2で「lesson_idにDB-FKなし」と決めたトレードオフを、サーバー側カタログ検証で回収する。呼び出し側は型付き関数をawaitするだけ（fetch/URL不要）。

### 決定4: 状態管理は判別ユニオンのreducer・Zustand不採用

- **決定**: ワークスペースUI状態は `useReducer`。判定フローを `idle | judging | done` の判別ユニオンで表し不正状態を型で禁止。サーバー状態（進捗・セッション）はRSC直読みで、client cacheライブラリもグローバルstoreもMVPでは入れない。
- **分岐条件**: ルートを跨いで共有したいクライアント状態が出現したらZustand導入を検討。

---

## Phase 5 スパイク実装（技術発見・2026-05-27）

> 実装: `typescript-learning-app/src/` 以下のスパイクコード。`localhost:3000/spike` で確認可。

### 発見1: Monaco 0.55 で `languages.typescript` が deprecated（最重要）

- **発見**: Monaco Editor 0.55.1 から `monaco.languages.typescript` が `{ deprecated: true }` に型変更。`getTypeScriptWorker()` へのアクセスパスが変わった。
- **新 API**: `monaco.typescript.getTypeScriptWorker()`（トップレベルの `typescript` namespace）。`monaco.d.ts` 10142行目参照。
- **影響**: 設計書（4-3）の記述 `monaco.languages.typescript.getTypeScriptWorker()` は古い。本実装時に差し替えが必要。
- **TypeScript Diagnostic 取得パス**（確定）:
  ```typescript
  const getWorker = await monaco.typescript.getTypeScriptWorker()
  const client = await getWorker(model.uri)
  const diagnostics = await client.getSemanticDiagnostics(model.uri.toString())
  ```

### 発見2: Next.js 16 + Turbopack での `ssr: false` の制約

- **制約**: `dynamic(..., { ssr: false })` は Server Component で使用不可。**Client Component 内でのみ動作**。
- **対処**: `LessonWorkspace`（`'use client'`）の中で `dynamic` を呼ぶ構造で問題なし。page.tsx（Server）で `ssr: false` を呼ばない設計を守ること。

### 発見3: スパイク実装のファイル構造（確定）

- `src/types/index.ts` — 共有型（TypeScriptDiagnostic / TestCase / JudgeRequest / JudgeResponse / WorkerResult）
- `src/lib/diagnostics/jp-messages.ts` — TS error code → JP 辞書（toJpMessage関数）
- `src/workers/judge.worker.ts` — Web Worker（typescript.transpileModule + Function constructor）
- `src/components/spike/SpikeWorkspace.tsx` — Client Container（monaco.typescript.getTypeScriptWorker + Worker生成）
- `src/app/spike/page.tsx` — Server Component シェル

### 型の使い分けメモ

- `judge()` は3状態 `JudgeResponse`（correct/incorrect/**type_error**）を返すが、`JudgeResult` コンポーネントは2状態 `JudgeResultType`（correct/incorrect）を受ける。`type_error` はErrorPanel側で処理し結果パネルに来ない（型エラー中はJudgeButton disabled）。workspace内で判別ユニオンにより安全に振り分ける。
