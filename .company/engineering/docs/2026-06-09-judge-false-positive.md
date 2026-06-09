# 判定エンジンの偽陽性脆弱性（中級016-031レビューで判明）

状態: **②/③層は修正済み（検証済み）／①strict化は要ブラウザ実機検証**／優先度: 高（中級リリースのブロッカー）
発見日: 2026-06-09／修正日: 2026-06-10（ブランチ feature/intermediate-016-031）

## 問題
ユーザーが**型を一切書かず**、②正規表現に一致する文字列をコメントに置き関数を素実装するだけで
**16本中14本が `correct`（偽陽性）**。対象: 016-026, 028, 029, 031。
弾けたのは2本のみ:
- 030: ③で `typeof p.then` を実値検査しているため堅い
- 027: ②が initialCode の `never` に依存し、チートがそれを消すと偶然②不一致になっただけ

### 個別の欠陥
- **027の②** `/:[ \t]*never/` は initialCode の `const _exhaustive: never` に既に一致＝**no-op（死んだ検査）**
- **024** で `Record` 不使用の正当なインライン型別解が②で `incorrect`＝**③偽陰性**（型構文の強制と値検査の方針不一致）

## 根本原因
1. **②正規表現が型文脈に未アンカー**（単なるキーワード存在チェック→コメントで突破可能）
2. **①型ゲートが判定経路に未接続**
   - `LessonWorkspace.tsx` の `handleJudge` は `judgeCode(code)` のみ呼び、`diagnostics` を判定に未使用
   - `JudgeButton` は `disabled={false}` 固定
   - `CodeEditor.tsx` は `setCompilerOptions` 未呼び出し（Monaco既定 `noImplicitAny:false`）

## 修正方針
1. ②正規表現を型宣言位置にアンカー化、または③実値検査主体へ切替
2. Monaco を strict 化（`setCompilerOptions({ strict:true })`）し、診断を判定にゲート接続
3. 027 の②を実効ある検査へ差し替え or 削除
4. `verify-lessons.cjs` の WRONG 集合にコメントバイパス誤答を追加（現状015/018のみ＝不足）

## 残レビュー次元（未了）
- `src/lib/judge/index.ts`（judgeCode実体）を読んで Step1ゲート有無・5秒タイムアウト・worker.terminate・await漏れ偽陽性を最終確定
- 非同期エンジン精査 / 教育設計 / 型正確性 / セキュリティ / 設計書↔実装整合

## 関連
- 実装: src/lib/lessons/data/016〜031.ts, src/lib/lessons/catalog.ts
- 判定: src/lib/judge/index.ts, src/workers/judge.worker.ts
- UI: src/components/lesson/LessonWorkspace.tsx, CodeEditor.tsx
- 検証: `cd typescript-learning-app && node scripts/verify-lessons.cjs`

---

## 修正（2026-06-10）

### 発見の訂正（根本原因の再特定）
当初ドキュメントは「`handleJudge` が診断未使用・`JudgeButton` が `disabled={false}` 固定」と記したが、
実コードを確認すると **UI 型ゲートは既に接続済み**だった（2026-06-07 "harden judge guard" で導入。
`LessonWorkspace.tsx:84` の `hasErrors` 判定・`JudgeButton disabled={hasErrors}`）。
真の穴は次の2点:
1. **②正規表現が `__originalCode__`（生ソース全文）に対して実行**されていた → コメントや文字列に
   キーワードを置くだけで一致（コメントバイパス＝実証済みの偽陽性）。
2. **Monaco が非 strict**（`CodeEditor.tsx` が `setCompilerOptions` 未呼び出し）→ 型を書かなくても
   診断が出ず、接続済みの型ゲートが**無毒化**されていた。

### 対応
- **②/③層（検証済み）**: `judge.worker.ts` に `sanitizeForChecks()` を新設（TS 字句スキャナ使用）。
  - `__originalCode__` = **コメント除去＋文字列中身ブランク**（型キーワード系②向け。コメント・文字列の両バイパスを封鎖）
  - `__rawCode__` = **コメント除去のみ・文字列保持**（リテラル値を検査する 009/012/013/017 の4本だけ切替）
  - これによりレッスン本体はほぼ無改修で全31本の②がバイパス不能に。
- **①層（要ブラウザ実機検証）**: `CodeEditor.tsx` で `monaco.typescript.typescriptDefaults.setCompilerOptions({ strict:true, noImplicitAny:true })`。
  型未記述コードを型エラー化し型ゲートでブロックする二重防御。**strict の効きは Monaco TS ワーカー依存のため静的確認では確定不可** → dev 起動＋実機操作での確認を別途行うまで「完了」としない。
- **回帰ガード**: `verify-lessons.cjs` の WRONG をコメント/文字列バイパス答案で拡充（016/020/022/023/024/009）。

### 検証結果（`node scripts/verify-lessons.cjs`・tsc・lint）
- 回帰ミスマッチ **0件** / 模範解答 **19件すべて correct** / 誤り版（バイパス10件含む）**すべて incorrect**。
- `tsc --noEmit` PASS / `npm run lint` PASS。

### 残作業
- **① strict 化のブラウザ実機検証**: dev 起動 → 016 等で「型なし初期コードが型エラー表示＆判定ブロック」「模範解答で型エラー消え判定通過」を目視。初級001-015の初期コードが strict で意図せぬブロックを起こさないかも確認。
- 027 の②は `: never`（コードトークン）なのでサニタイズ後はコメント偽装不能。③（triangle=6）が本質ゲートのため現状維持。

### 再発防止 / TypeScript で防ぐ
- ②は必ず**サニタイズ済み構造**（`__originalCode__`）に対して書く。生ソース＝コメント/文字列を含む、を前提にしない。
- 新レッスン追加時は verify-lessons の WRONG に「コメントバイパス答案」を必ず1件入れる（偽陽性の常設回帰テスト）。
- Monaco など**ブラウザワーカー依存の挙動は静的レビューで確定しない**（CSP・非同期に続く3度目の同種教訓）。
