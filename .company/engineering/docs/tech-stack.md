---
created: "2026-05-26"
status: approved
phase: "Phase 4-1 技術選定"
owner_confirmed: true
---

# 技術スタック決定書

> Phase 4-1（技術選定）の正本。フレームワーク〜ホスティングの6領域を根拠付きで確定する。
> ステータス: **確定**（2026-05-26 オーナー承認。スタイリングはTailwindで明示確認）

---

## 概要

TypeScript学習Webアプリ（MVP）の技術スタックを確定する。
核となる判断は **「判定エンジンを完全クライアントサイドで動かす」** こと。これにより `無料`・`環境構築ゼロ`・`即時フィードバック` という3つのコア制約を、サーバーコストゼロで同時に満たす。

| 領域 | 採用技術 | 優先度 |
|------|---------|--------|
| フレームワーク | **Next.js（App Router）** | 高 |
| スタイリング | **Tailwind CSS + shadcn/ui** | 通常 |
| コードエディタ | **Monaco Editor**（`@monaco-editor/react`） | 高 |
| TS実行・判定 | **完全クライアントサイド**（Monaco TSワーカー + 自作Web Worker） | 高 |
| DB・認証 | **Supabase**（GitHub/Google OAuth + Postgres）※Phase 3-3で既決 | 高 |
| ホスティング | **Vercel** | 通常 |
| コンテンツ | **MDX**（Git管理）+ `next-mdx-remote` ※既決 | 高 |
| 状態管理 | React state + `localStorage`（ゲスト進捗）。Zustandは必要時のみ | 通常 |

---

## なぜこの設計か

### 判断の制約条件（企画・要件・基本設計から継承）

- **無料**: サーバーで重い処理を常時動かせない → 実行はクライアントに寄せる
- **環境構築ゼロ**: ユーザーはURLを開くだけ。ローカルにNode/tscを入れさせない → ブラウザで型チェック・実行が完結する必要がある
- **即時フィードバック**: ネットワーク往復を挟まない方が速い → クライアント実行が有利
- **日本語**: 型エラーを日本語で説明する（差別化の核）
- **個人開発**: 運用コスト・学習コストの低さを最優先（research部門の評価軸）

この制約群は **「クライアントサイドで完結させる」** という設計に構造的に収束する。サーバー実行はこの3制約すべてと衝突する。

### 各選定の理由

- **Next.js（App Router）**: 基本設計のサイトマップが既に `app/courses/[courseId]/page.tsx` 形式のApp Routerパスを前提にしている。design-tokensも `src/styles/tokens.ts` 配置を前提。TypeScript第一・Vercel親和・学習リソース最大で、個人開発の「詰まったとき情報がある」価値が高い。
- **Tailwind CSS + shadcn/ui**: `design-tokens.md` の `as const` 定数をTailwindテーマに流用できる。shadcn/ui（Radix UIベース）は**フォーカストラップ・ARIA・キーボード操作が組み込み済み**で、Phase 3で定義したWCAG 2.1 AA要件（HintDrawerのフォーカストラップ等）を自前実装せず満たせる。
- **Monaco Editor**: VS Code・TypeScript Playgroundと同じエンジン。**TS言語サービスを内蔵**しているため、「赤波線・型診断・補完」がほぼ標準で動く。これはコア機能そのもの。
- **完全クライアントサイド判定**: 下記「詳細」参照。
- **Supabase**: Phase 3-3で確定済み。認証（GitHub/Google OAuth）と進捗DBを単一基盤に統合でき、個人開発の運用負荷が最小。
- **Vercel**: Next.jsネイティブ。無料枠・プレビューデプロイ。仮に移行が必要でも低リスク。

---

## 詳細

### 重要設計①: 完全クライアントサイド判定エンジン

ハイブリッド判定（`JudgeRequest/JudgeResponse` はNotion🔌外部連携仕様で契約確定済み）をサーバーレスで実現する。

**Step 1 — 型チェック（Monacoの資産を再利用）**

Monacoはエディタ内部で既にTSワーカーを動かして赤波線を出している。判定でもこのワーカーを再利用すれば、別途コンパイラを積む必要がない。

```typescript
// なぜ: 診断は editor が既に持っている。再計算せず取り出すだけが最小コスト。
const worker = await monaco.languages.typescript.getTypeScriptWorker()
const client = await worker(model.uri)
const diagnostics = [
  ...(await client.getSemanticDiagnostics(model.uri.toString())),  // 型エラー
  ...(await client.getSyntacticDiagnostics(model.uri.toString())), // 構文エラー
]
// → TypeScriptDiagnostic[] に整形して ErrorPanel へ（コンポーネント契約と一致）
```

**Step 2 — テスト実行（自作Web Worker）**

型エラーが無いコードを、隔離したWeb Workerで実行してテストケースの合否を見る。

```typescript
// なぜ transpileModule か: 判定は「実行」が目的。型チェックはStep1で済んでいるので、
// ここでは型解析をしない高速な単純トランスパイルで十分（速い）。
import ts from 'typescript'
const js = ts.transpileModule(userCode, {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText
// → Worker内で js を実行し、TestCase の input/expected と突き合わせる
```

- **無限ループ対策**: メインスレッドからタイムアウトを張り、超過したら `worker.terminate()` でWorkerごと強制終了する（メインスレッドは固まらない）
- **安全性**: ユーザーは「自分のコードを自分のブラウザで」動かすだけ。サーバーで他人のコードを動かす構成ではないので、サーバーサイド実行で最大の難所になる**未信頼コードのサンドボックス問題が、そもそも発生しない**
- **バンドル対策**: Monaco + TSコンパイラは数MB級。レッスンページでのみ `next/dynamic` の `ssr: false` で遅延ロードし、トップ・コース詳細の初期表示には載せない

```typescript
// なぜ ssr:false か: Monaco は document/window 前提でSSRでは動かない。
// かつ初期バンドルを軽くするため、レッスン画面に来て初めて読み込む。
const CodeEditor = dynamic(() => import('@/components/CodeEditor'), { ssr: false })
```

### 重要設計②: 日本語エラー解説パイプライン（差別化の核）

**重要発見**: MonacoのTS診断メッセージは **英語がデフォルト**。「日本語エラー解説」は標準機能では実現できない。これはコア価値に直結する論点。

採用方式: **TSエラーコード（数値）→ キュレーション済み日本語解説の自前辞書**（公式 `ja` ロケールをフォールバック）。

```typescript
// 診断オブジェクトは安定した数値 code を持つ（例: 2322 = 型の代入不可）。
// なぜ自前辞書か: 公式 ja は「直訳」。学習アプリでは初学者向けに噛み砕いた
// 説明＋次の一手のヒントを返す方が価値が高い（ここが競合との差）。
const JP_DIAGNOSTICS: Record<number, (d: Diag) => string> = {
  2322: () => 'この値は、変数に指定された型と合っていません。型注釈か代入する値を見直しましょう。',
  // ... カリキュラムが触る頻出コードから優先整備
}
```

- 単なる翻訳ではなく **第一級モジュール** として設計する（`src/lib/diagnostics/` 想定、詳細は4-3）
- 初級カリキュラムが実際に発生させる型エラーコードを洗い出し、その分だけ整備すればMVPは成立する（全コード網羅は不要）

### 見送った選択肢と理由（research部門ルール: やめる理由を残す）

| 見送り | 理由 |
|--------|------|
| CodeMirror 6 | 軽量だがTS診断に言語サービスの別配線が必要。コア機能の実装コストが増す |
| Sandpack / WebContainers | バンドラ/Node-in-browserで重い（MB級）。フルアプリプレビュー向けで単一ファイル課題に過剰。WebContainersはSharedArrayBuffer必須でSafari不可 |
| サーバーサイド実行 | 無料制約に反する・レイテンシ・未信頼コードのsandbox化が困難 |
| Astro | 静的コンテンツ向き。本アプリの核はステートフルなエディタ体験 |
| Remix / React Router 7 | 有力だがVercel連携・学習リソースでNext.jsが優位（個人開発の詰まり対策） |

---

## 学びポイント（TypeScript学習との相乗効果）

- **判別可能ユニオン（Discriminated Union）**: `JudgeResponse` は `status` をタグにした判別ユニオン。`switch (res.status)` で各ケースが型安全に絞り込まれる体験は、TSの最重要パターンの実践教材になる
- **`as const` とリテラル型**: design-tokens の `as const` がなぜ型を広げない（`string` でなく `'#3178C6'`）のか、Tailwindテーマ連携を通じて体感できる
- **Web Workerの型**: Worker境界をまたぐメッセージは `postMessage` でシリアライズされる。ここに型を付ける設計は「境界の型付け」の良い練習
- **`any` は使わない**: 診断オブジェクトもWorkerメッセージも、型を定義してから実装する（開発部門スタンス）

### 参考リンク（一次情報）

- TypeScript Playground: https://www.typescriptlang.org/play （Monacoが動いている実例）
- Monaco Editor TypeScript worker: https://microsoft.github.io/monaco-editor/
- `@monaco-editor/react`: https://www.npmjs.com/package/@monaco-editor/react
- TypeScript Compiler API（transpileModule）: https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
- shadcn/ui（アクセシブルなコンポーネント）: https://ui.shadcn.com

---

## 次ステップ（このドキュメントの範囲外）

- **Phase 4-2**: ERD・テーブル定義・SupabaseのRLS設計
- **Phase 4-3**: ディレクトリ構成・コンポーネント設計・API設計・状態管理方針
- **Phase 5冒頭（推奨）**: 技術検証スパイク（Monaco描画 / 日本語診断1件 / Worker実行1件）で中核アーキテクチャの不確実性を先に潰す
