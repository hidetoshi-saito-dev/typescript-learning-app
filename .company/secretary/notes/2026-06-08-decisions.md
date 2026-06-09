# 意思決定ログ 2026-06-08

## 中級カリキュラム設計（レッスン 016-030）

### 決定
中級15レッスン（016-030）の設計を確定し、設計書を作成。
正本: `.company/engineering/docs/curriculum-intermediate.md`

### スコープ方針（ユーザー確認済み）
- **到達点**: 実務頻出の型操作まで（keyof・ユーティリティ型・判別可能Union・型述語・Promise）。条件型/infer/テンプレートリテラル型は**上級へ送る**。
- **今回のアウトプット**: 設計ドキュメント作成まで。実装（.ts ファイル）は次セッション以降。

### レッスン構成（4群・15レッスン）
- 第1群 型を取り出す演算子: 016 keyof / 017 インデックスアクセス T[K] / 018 typeof型演算子 / 019 as const
- 第2群 ユーティリティ型: 020 Readonly / 021 Partial・Required / 022 Pick / 023 Omit / 024 Record
- 第3群 安全なUnion: 025 判別可能Union / 026 never網羅性 / 027 型述語 is
- 第4群 関数と非同期: 028 関数型 / 029 Promise / 030 async・Awaited

### 設計上の核心判断
1. **「型を消費する値とセットで出題」原則**: judge.worker は `transpileModule({strict:false})` で型を消して実行するため、型定義単体はテスト不可。導出した型を必ず「動く関数・値」で使わせ、実行値（③）＋正規表現（②）＋型チェック（①）で判定する。016-028 は現状エンジンで判定可能を全件検証済み。
2. **★029/030 は judge.worker の非同期対応拡張が前提**: 現状エンジンは同期実行のみで Promise 解決を待たない。実装時はまず assertion を `await` 可能化（案1: 各testCaseを `await (async()=>{...})()` で包み message ハンドラを async 化）→ 既存001-028 の回帰確認 → 029/030 追加、の順で進める。
3. **粒度は初級と対称**（1概念1レッスン×15）。026 は 025 の題材（Shape）を継続使用して学習負荷を下げる。

### 次セッションの実装フロー（申し送り）
1. judge.worker 非同期対応拡張＋回帰確認
2. data/016〜030.ts 作成
3. catalog.ts へ登録
4. 「初期コード=不正解／模範解答=正解」をローカル実機確認
5. 進捗UIの初級/中級区切り表示は別途UI設計タスク

### 関連
- 設計書: `.company/engineering/docs/curriculum-intermediate.md`
- 判定エンジン: `typescript-learning-app/src/workers/judge.worker.ts`
- 初級実装: `typescript-learning-app/src/lib/lessons/data/001-015`

## 中級カリキュラム設計レビュー → 設計書v2改訂

### 経緯
中級設計書（v1）に対し、5次元×敵対的検証のワークフローでレビュー実施。指摘27件中、確定8件／棄却1件（残18件はセッションのレート上限で検証エージェント未実行）。多くは実機検証付き（`ts.transpileModule` で実挙動を確認）。

### 確定した重大欠陥（実機検証済み）
- **[High] 030/031 非同期実装が破綻**: v1の「案1」（`await (async()=>{})()` を `new Function` で実行）は `module:None` がトップレベル await を変換せず、実機で `await is not defined` で全件 throw（模範解答すら不正解）。→ **AsyncFunction コンストラクタ方式**（`await new AsyncFunction(transpiled)()`）に修正。これは前ターンで私が「推奨」と書いた箇所の設計ミス。CSP強制適用時と同じ「静的レビューだけで確定してはいけない」教訓の再来。
- **[High] never網羅性(旧026)の判定不能**: ③実行値が空振り（defaultに到達しない）・①ネガティブで自動判定不可。→ triangle追加で実行可能な形に変更、「①漏れで型エラー」を判定列から削除。
- **[Medium] 018/019/027 の幻の③**: 型がtranspileで消え正解/不正解が同値。→ ③を外し②型文脈アンカー＋①ゲートへ。
- **[Medium] 028型述語が型述語なしでも合格** / **[Medium] unknown未掲載（028の前提）** / **[Low] 019/020「①再代入不可」のネガティブ矛盾** / **[Low] 018正規表現が緩い** / **[Low] satisfies欠落**。

### 決定（ユーザー確認済み）
1. **030/031 は AsyncFunction 方式で直して中級に残す**（非同期は実務必須）。
2. **確定全件を設計書v2に今反映**。
3. **unknown を独立レッスン(025)として新設** → 中級は **16レッスン(016-031)** に拡張（採番繰り下げ）。satisfiesは候補注記（必須化せず）。

### 設計書v2の要点
- 判定の「凡例」を新設: ①Step1ゲートはポジティブ構成のみ・ネガティブ専用エラーは判定列に載せない／②は型文脈アンカー必須／③は型効果が実行時に残る場合のみ有効。
- 「③が効く/効かないレッスン」を明示（018/019/027は③無効）。
- 実装フロー手順1に**回帰ゲート**追加: judge.worker を AsyncFunction 化 → 001-029回帰＋030/031模範解答が correct を返すことを実機確認、を設計確定の条件にする。

### 棄却・未検証
- 棄却1件: 「Promise の①戻り値型が strict:false 依存で不安定」→ ③実行値が捕捉するため誤読と判定。
- 未検証18件: judge-testability/async-engine 次元はレート上限で未検証。ただし中核論点は他次元が実機検証付きで確定済みのため実質カバー。余力あれば次セッションで再検証。

### 学び
- ワークフローの**敵対的検証＋実機確認**が、静的設計では見抜けなかった非同期破綻（案1）を捕捉した。設計レビューに実機検証を組み込む価値が大きい。
- レート上限で検証が一部落ちても、次元を分散させていたため最重要欠陥は別次元で確定できた（多次元レビューの頑健性）。

## 中級レッスン016-031 実装完了（判定エンジン拡張＋全件検証）

### 完了事項
- **judge.worker.ts を AsyncFunction 方式へ拡張**（messageハンドラ async化・`await new AsyncFunction(transpiled)()`）。`module:None` のトップレベル await を実行可能化。
- **中級16レッスン（016-031）実装完了**。`src/lib/lessons/data/` に配置、`catalog.ts` に import/配列登録（計31本・import31/配列31/dataファイル31で一致確認）。
- **回帰・前進検証スクリプト** `scripts/verify-lessons.cjs` で実機検証（ブラウザ不要、new Function版 vs AsyncFunction版を Node で再現）。

### 検証結果（`node scripts/verify-lessons.cjs`）
- 回帰ミスマッチ **0件**（全31本 initialCode の判定が新旧エンジンで一致＝既存挙動非破壊）。
- 前進失敗 **0件**（模範解答19件すべて correct／誤り版2件すべて incorrect）。
- 核心: **030/031 非同期が AsyncFunction 版で solution=correct**（`await delay()`/`await greet()` が解決され判定通過＝設計v2の確定条件クリア）。

### 品質ゲート
- `tsc --noEmit`: PASS（exit 0）
- `npm run lint`: PASS（exit 0）。検証スクリプト `scripts/**` は Node ツール（require 必須）のため eslint.config.mjs の globalIgnores に追加。

### 補足
- ツール呼び出しタグ誤り（壊れた `court`/名前空間なしタグ）が断片表示される事象をユーザーに説明済み。原因は私の出力ミスで内容影響なし。対策＝1応答1ツール・正しい名前空間タグ。
