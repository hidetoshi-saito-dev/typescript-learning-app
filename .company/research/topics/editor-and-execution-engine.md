---
created: "2026-05-26"
status: completed
topic: "ブラウザ内コードエディタ & TS実行環境の選定"
---

# 調査: ブラウザ内コードエディタ & TypeScript実行環境

> Phase 4-1の争点2件（優先度:高）を、research部門の評価フレームワークで採点する。
> 他4領域（フレームワーク/スタイリング/DB/ホスティング）は既決または明確なため本調査の対象外。

## 調査の問い

1. ブラウザ内コードエディタは **Monaco Editor** と **CodeMirror 6** のどちらが本アプリに適するか
2. 「答え合わせ」のコード実行（ハイブリッド判定 Step 2）を **どこで・何で** 動かすか

---

## 争点1: コードエディタ（Monaco vs CodeMirror 6）

### 評価（5段階 ◎○△）

| 評価軸 | Monaco Editor | CodeMirror 6 |
|--------|--------------|--------------|
| TypeScript親和性 | ◎ TS言語サービス内蔵（診断・補完が標準） | △ TS診断は別途配線が必要 |
| 学習リソース | ◎ VS Code/TS Playgroundと同系、情報豊富 | ○ 公式ドキュメントは良質 |
| コミュニティ規模 | ◎ 大 | ○ 中〜大 |
| 個人開発適性 | △ バンドルが重い（数MB） | ◎ 軽量・モバイル良好 |
| メンテナンス状況 | ◎ Microsoft継続 | ◎ 活発 |

### 結論 → **Monaco Editor 採用**

決め手は **TS言語サービス内蔵**。本アプリのコア要件「型エラーの赤波線・日本語診断・補完」が、Monacoでは事実上標準で動く。CodeMirrorは軽量だが、まさにこのコア機能のためにTS言語サービスを自前配線する必要があり、最重要機能の実装コストが上がる。

### Monacoの弱点と緩和策

- **弱点**: 初期バンドルが重い（Persona Aがモバイルの可能性）
- **緩和**: `next/dynamic` + `ssr: false` でレッスンページのみ遅延ロード。トップ/コース詳細には載せない

### 見送り: CodeMirror 6

軽量さは魅力だが、TS診断配線のコストがMonacoの「内蔵」優位を覆さない。将来モバイル最適化が最優先要件に昇格した場合のみ再検討（分岐条件）。

---

## 争点2: TS実行環境（どこでコードを動かすか）

### 候補と評価

| 評価軸 | 自作Web Worker | Sandpack | WebContainers | サーバー実行 |
|--------|---------------|----------|---------------|-------------|
| 個人開発適性（コスト） | ◎ $0 | ○ 重い | △ 重い | ✕ サーバー費 |
| 環境構築ゼロ | ◎ | ◎ | ○ | ◎ |
| 即時性 | ◎ ネット往復なし | ○ | ○ | △ 往復あり |
| ブラウザ互換 | ◎ | ◎ 全ブラウザ | ✕ Safari不可 | ◎ |
| 単一ファイル課題への適合 | ◎ ちょうど良い | △ 過剰 | △ 過剰 | ○ |
| 安全性（未信頼コード） | ◎ 自分のコードのみ | ◎ | ◎ | △ sandbox困難 |

### 結論 → **完全クライアントサイド（Monaco TSワーカー + 自作Web Worker）採用**

- **Step 1 型チェック**: Monacoが既に動かしているTSワーカーを再利用（`getSemanticDiagnostics` / `getSyntacticDiagnostics`）
- **Step 2 テスト実行**: 自作Web Workerで `ts.transpileModule()` → 隔離実行 → タイムアウトで `terminate()`

本アプリは「単一ファイルの小さな課題」を判定するだけで、フルアプリのバンドルやNode APIは不要。Sandpack/WebContainersはフルアプリプレビュー向けで過剰かつ重い。サーバー実行は無料制約に反する。**制約（無料・環境構築ゼロ・即時）が自作Workerに構造的に収束**する。

### 見送り理由

- **Sandpack**: バンドラ込みで重い。単一ファイル課題には機能過剰
- **WebContainers**: SharedArrayBuffer必須でSafari不可・COOP/COEPヘッダ要・重い
- **サーバー実行**: サーバーコスト（無料に反する）・レイテンシ・未信頼コードのsandbox化が困難。※将来「他人のコードを共有実行」する機能が出たら再検討（分岐条件）

---

## 全体結論

| 争点 | 採用 |
|------|------|
| エディタ | Monaco Editor（`@monaco-editor/react`、レッスンページで遅延ロード） |
| 実行環境 | 完全クライアントサイド（Monaco TSワーカー + 自作Web Worker） |

補足: MonacoのTS診断は**英語デフォルト**。日本語化は別途「エラーコード→日本語辞書」モジュールで対応する（詳細は `engineering/docs/tech-stack.md` 重要設計②）。

---

## 学習リソースリスト

- TypeScript Playground（Monaco実例）: https://www.typescriptlang.org/play
- Monaco Editor 公式: https://microsoft.github.io/monaco-editor/
- `@monaco-editor/react`: https://www.npmjs.com/package/@monaco-editor/react
- CodeMirror 6 公式: https://codemirror.net/
- Sandpack 公式: https://sandpack.codesandbox.io/
- WebContainers（StackBlitz）: https://webcontainers.io/
- TypeScript Compiler API: https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API

## 情報源

- Monaco TypeScript Language Services（DeepWiki, 2026参照）: https://deepwiki.com/microsoft/monaco-editor/3.2-typescript-language-services
- Monaco診断の多言語化Issue #4125: https://github.com/microsoft/monaco-editor/issues/4125
- `@monaco-editor/react`（Next.js統合）: https://www.npmjs.com/package/@monaco-editor/react
- Sandpack 2.0 / Nodebox: https://codesandbox.io/blog/announcing-sandpack-2
- Sandpack vs WebContainers（互換性差）: https://github.com/codesandbox/sandpack/discussions/54
- ブラウザ内サンドボックス比較（Better Stack, 2026）: https://betterstack.com/community/comparisons/best-sandbox-runners/
