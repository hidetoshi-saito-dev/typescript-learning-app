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

### 関連
- 正本: `.company/engineering/docs/2026-06-09-judge-false-positive.md`
- 前日の意思決定: `.company/secretary/notes/2026-06-10-decisions.md`
