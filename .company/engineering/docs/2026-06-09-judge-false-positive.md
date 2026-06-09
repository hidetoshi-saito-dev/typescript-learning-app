# 判定エンジンの偽陽性脆弱性（中級016-031レビューで判明）

状態: **未修正**／優先度: **高**（中級リリースのブロッカー）
発見日: 2026-06-09／実機確認: /tmp/probe-all.cjs（揮発済み・要再作成）

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
