# 意思決定ログ 2026-06-11

## strict 化(① 層)の実機検証 — ヘッドレス確定＋ブラウザ目視へ

### 経緯
2026-06-10 に偽陽性②/③層を修正・検証済み。残る ① Monaco strict 化の実機検証を実施。
Monaco の strict 診断はブラウザ依存で完全再現できないため、まず**最大の回帰リスクをヘッドレスで潰した**。

### ヘッドレス検証（`scripts/verify-strict.cjs` 新設）
本物の `typescript` で各レッスンを strict コンパイル:
- **模範解答19件すべて strict clean** → 「正答なのに型エラーで判定ブロックされる」回帰は無い（最重要）。
- initialCode の strict エラーは型必須レッスン（001/002/004/005/006/012/013/015/016/021/027/028/029）のみで、
  内容が学習目標と一致。**spurious（無関係）エラーなし** → strict が正当な完了を阻害しない。
- dev 配信も確認: lessons/* は 005+ が `/login?redirect=` へ 307、001-004 はゲスト 200。

### 判断
- strict 化の**論理面はヘッドレスで確定**。残るは Monaco TS ワーカーが strict 診断を画面へ surface するかの**目視のみ**（診断→型ゲートの配線は 2026-06-07 に本番実証済み）。
- 目視はゲスト lesson 001 で完結可能（implicit any エラー → 判定ブロック → `: string` 追加で通過）。
- 目視 NG 時は commit `4c0b3ba`（strict層）のみ revert で安全に戻せる。

### コミット（feature/intermediate-016-031）
- `0b35ff6` ②/③ sanitizer / `4c0b3ba` ① strict / `f6dfbda` docs / `27c7cc9` strict検証ツール

### 学び
- 「ブラウザ依存だから検証不可」で止めない。**回帰リスクの大半（模範解答の strict 妥当性）は本物の tsc でヘッドレス検証できる**。残った真にブラウザ固有の部分だけを目視に回すことで、目視の確認項目を最小化できた。

### 追記：ブラウザ実機目視 完了（ブロッカー解除）✅
dev で目視、全項目パス:
- lesson 001: 初期コードで implicit any（TS7006）表示・「答え合わせ」無効 → `name: string` で解消・正解。**①strictゲートが実機で作動**。
- lesson 003: `// :string` コメントだけの答案は **不正解** → `):string` 実コードで正解。**②コメントバイパス封鎖が実機で実証**。
- 「N Issues」バッジ＝ローカル Supabase（:54321）未起動による fetch 失敗。判定はクライアント完結で影響なし・本修正と無関係。

→ 偽陽性②/③/①すべて実機確認済み。中級リリースのブロッカー解除。次は feature/intermediate-016-031 の PR化→マージ。

### 追記：PR #3 マージ・本番反映（同日 2026-06-11）✅
- `feature/intermediate-016-031` を **PR #3** として作成 → ユーザーがマージ（merge commit `5ef5788`・2 checks passed）。
- 本番デプロイ確認: merge commit の GitHub commit status が **`Vercel: success`** → 中級16本が **ts-tonari.app に本番反映**。
- 確認時の学び: `/lessons/*` は middleware が存在チェック前に一律 `/login?redirect=` へ 307 ゲートするため、**curl の 307 はレッスン実在の証明にならない**。デプロイ可否は Vercel の commit status（または要ログインで目視）で確認するのが正。
- ローカル: master へ checkout・pull 済み、マージ済みブランチ削除、dev サーバ停止。

### 関連
- 正本: `.company/engineering/docs/2026-06-09-judge-false-positive.md`
- 前日の意思決定: `.company/secretary/notes/2026-06-10-decisions.md`
