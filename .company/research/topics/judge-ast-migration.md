# 判定エンジン②の AST 移行評価（将来トピック）

記録: 2026-06-12（実践クラス設計レビュー R-3 より）／ステータス: **Hold（今回は見送り・再評価条件つき）**

## 背景

②型構文チェックは `__originalCode__`（サニタイズ済み structure）への regex で実装している。
実践クラス設計の敵対レビューで、regex 固有の弱点が体系化された:

- ダミー構文バイパス（→識別子アンカー規約で緩和）
- 引用符スタイル等の表記ゆれによる偽陰性（→ `["']` クラス等で個別緩和）
- raw 存在チェックはテンプレートデコイで原理的に破られる（→新設禁止規約）

## AST 案の評価

- **技術的には可能**: `typescript` モジュールは judge.worker に既在（`transpileModule` 使用中）。
  `ts.createSourceFile` で AST を得れば「`type OrderStatus =` が Union 型で文字列リテラル4要素」を
  構文木として正確に検査でき、上記の弱点クラスが原理的に消える。
- **コスト**: ②規約・verify-lessons のミラー・assertion への注入方式（`__originalCode__` 文字列）を
  全面改訂する必要がある。検査 DSL（セレクタ）の設計も必要。バンドルへの影響は小
  （ts は既にバンドル済み。AST 生成の実行時間は要計測）。
- **実用主義の判定**: 敵対レビュー済み regex ＋ WRONG カナリア＋多層防御（①③）で
  実害（自己申告進捗のみ）に対して十分。今回の9本は regex 続行が正。

## 再評価のトリガー

- 実践クラスの増補（4ステップ化・シナリオ追加）で②本数がさらに増えるとき
- 次に②起因の偽陽性/偽陰性が本番で発生したとき
- type-challenges 式の「型レベル assert（`Expect<Equal<X, Y>>`）を②でアンカーする」構想を検討するとき

## 関連

- `engineering/docs/curriculum-practical.md`（②追補規約）
- `engineering/docs/curriculum-practical-review.md`（R-3）
- `engineering/docs/2026-06-09-judge-false-positive.md`（regex 規約の正本）
