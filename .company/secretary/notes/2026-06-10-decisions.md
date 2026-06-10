# 意思決定ログ 2026-06-10

## 判定エンジンの偽陽性修正（中級リリースのブロッカー解除）

### 経緯
2026-06-09 に発見した偽陽性（型を書かずコメントにキーワードを置くだけで16本中14本が合格）を修正。
作業前に中級016-031の未コミット実装を `feature/intermediate-016-031` へ退避（消失リスク除去・修正前状態の保全）。

### 退避コミット
- アプリ実装: `e64c359`（中級16本＋judge.worker AsyncFunction化＋verify-lessons）
- 組織ドキュメント: `cd360cf`（中級設計v2・偽陽性課題・意思決定ログ06-07〜09）

### 根本原因の再特定（重要：当初ドキュメントの訂正）
当初課題ドキュメントは「UI 型ゲート未接続・JudgeButton disabled={false} 固定」としていたが、
実コード確認で **型ゲートは06-07の "harden judge guard" で既に接続済み**と判明。真因は:
1. **②正規表現が生ソース `__originalCode__` 全文に対して実行** → コメント/文字列でバイパス可能。
2. **Monaco が非 strict** → 型を書かなくても診断ゼロ＝接続済みゲートが無毒化。

### 決定した修正方針
- **②/③層（ヘッドレス検証可能なので即修正・検証）**: `judge.worker.ts` に TS 字句スキャナで
  `sanitizeForChecks()` を新設。`__originalCode__`=コメント除去＋文字列中身ブランク、
  `__rawCode__`=コメント除去のみ。文字列リテラル値を検査する4本（009/012/013/017）だけ `__rawCode__` に切替。
  → レッスン本体ほぼ無改修で全31本の②がコメント・文字列バイパス不能に。
- **①層（strict化）は実装するが要ブラウザ実機検証**: `CodeEditor.tsx` で `setCompilerOptions({strict,noImplicitAny})`。
  strict の効きは Monaco ワーカー依存のため静的確認で確定せず、別コミットに分離（独立revert可能に）。
- **回帰ガード**: verify-lessons の WRONG にコメント/文字列バイパス答案を常設。

### 検証結果
- `node scripts/verify-lessons.cjs`: 回帰0 / 模範解答19件 correct / 誤り版10件（バイパス含む）すべて incorrect。
- `tsc --noEmit` PASS / `npm run lint` PASS。

### ステータス
- ②/③偽陽性（実証済みのブロッカー）= **解除（検証済み）**。
- ① strict = 実装済み・**ブラウザ実機検証待ち**（dev起動→016等で目視確認するまで「完了」としない）。
- 中級リリース可否は ① 実機検証クリア後に判断。

### 学び
- 「緑＝健全ではない」の具体化: verify が緑でも WRONG にバイパス答案が無ければ穴は見えない。
  → 偽陽性の常設回帰テスト（コメントバイパス答案）を新レッスン追加の必須項目に。
- **ブラウザワーカー依存挙動は静的レビューで確定しない**（CSP・非同期に続く3度目）。strict もこの類型として実機検証を分離。
- 課題ドキュメントの記述（型ゲート未接続）が実コードと食い違っていた。**ドキュメントも仮説として実コードで検証する**。

### 関連
- 課題＋修正の正本: `.company/engineering/docs/2026-06-09-judge-false-positive.md`
- 変更: `src/workers/judge.worker.ts` / `src/components/lesson/CodeEditor.tsx` / data/009・012・013・017 / `scripts/verify-lessons.cjs`
