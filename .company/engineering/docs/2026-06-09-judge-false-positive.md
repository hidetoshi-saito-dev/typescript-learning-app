# 判定エンジンの偽陽性脆弱性（中級016-031レビューで判明）

状態: **修正済み・実機検証完了（2026-06-11）／ブロッカー解除** ✅
発見日: 2026-06-09／修正日: 2026-06-10／実機検証: 2026-06-11（ブランチ feature/intermediate-016-031）

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

### 検証結果（`verify-lessons.cjs`・`verify-strict.cjs`・tsc・lint）
- ②/③: 回帰ミスマッチ **0件** / 模範解答 **19件すべて correct** / 誤り版（バイパス10件含む）**すべて incorrect**。
- ① strict（`node scripts/verify-strict.cjs`・本物の typescript で strict コンパイル）:
  - **模範解答19件すべて strict clean**＝「正答が型エラーで判定ブロックされる」回帰なし。
  - initialCode の strict エラーは型必須レッスン（001/002/004/005/006/012/013/015/016/021/027/028/029）のみで、内容が学習目標と一致。**spurious（無関係）エラーなし**＝strict が正当な完了を阻害しない。
- `tsc --noEmit` PASS / `npm run lint` PASS。
- ゲート配線（lessons/* で 005+ は `/login?redirect=` へ 307・001-004 はゲスト200）も dev で確認。

### ブラウザ実機検証（2026-06-11・完了）✅
dev (`npm run dev`) で目視確認、全項目パス:
- **lesson 001（①strictゲート）**: 初期コードで `name` に implicit any（TS7006）が表示され「答え合わせ」が無効化 → `name: string` 追加でエラー消滅・有効化 → 正解。Monaco が strict 診断を画面へ surface し型ゲートがブロックすることを確認。
- **lesson 003（②コメントバイパス封鎖）**: `// :string` とコメントだけ書いた答案が **不正解**（②がコメントを無視）→ `):string` を実コードで付けると正解。サニタイザがブラウザ実機でも機能。
- 「N Issues」バッジは `ECONNREFUSED 127.0.0.1:54321`＝ローカル Supabase 未起動による auth/progress fetch 失敗。判定はクライアント完結のため影響なし・本修正と無関係。

→ ②/③/① すべて実機確認済み。**中級リリースのブロッカー解除**。残るはブランチの PR 化→マージのみ。
- 027 の②は `: never`（コードトークン）なのでサニタイズ後はコメント偽装不能。③（triangle=6）が本質ゲートのため現状維持。

### 再発防止 / TypeScript で防ぐ
- ②は必ず**サニタイズ済み構造**（`__originalCode__`）に対して書く。生ソース＝コメント/文字列を含む、を前提にしない。
- 新レッスン追加時は verify-lessons の WRONG に「コメントバイパス答案」を必ず1件入れる（偽陽性の常設回帰テスト）。
- Monaco など**ブラウザワーカー依存の挙動は静的レビューで確定しない**（CSP・非同期に続く3度目の同種教訓）。
