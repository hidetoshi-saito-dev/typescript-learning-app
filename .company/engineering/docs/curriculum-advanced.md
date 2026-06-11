# 上級カリキュラム設計（032-039・8本）

作成: 2026-06-12 ／ 正本。実装 PR とセット。

## 概要

中級設計（curriculum-intermediate.md）で**意図的に上級へ送った範囲**を実装する:
**条件型・infer・テンプレートリテラル型**、＋中級候補のまま見送っていた **satisfies**。

| # | id | テーマ | 主ゲート |
| --- | --- | --- | --- |
| 032 | 032-conditional-type | 条件型の基礎（`T extends U ? X : Y`） | ② |
| 033 | 033-distributive-conditional | 分配条件型（`MyExclude` 自作） | ② |
| 034 | 034-infer-return | infer の基礎（`MyReturnType` 自作） | ② |
| 035 | 035-infer-element | infer 応用（配列要素型 `ElementType`） | ② |
| 036 | 036-template-literal-type | テンプレートリテラル型の基礎（`` `user-${number}` ``） | ②(raw)＋①＋③ |
| 037 | 037-template-literal-union | テンプレートリテラル型×Union（`` `btn-${Size}` ``） | ②(raw)＋①＋③ |
| 038 | 038-satisfies | satisfies（注釈の widening を避ける） | ②＋③ |
| 039 | 039-event-name | 総合: infer×テンプレートリテラル（`EventName<T>`） | ②(raw)＋③ |

到達: 初級15＋中級16＋**上級8＝39レッスン**。

## なぜこの設計か

- **順序**: 条件型 → 分配 → infer → テンプレートリテラル型 → satisfies → 総合。前のレッスンの構文を次が前提にする一本道。総合(039)は「`on${infer E}` からイベント名を抜く」で3テーマを束ねる。
- **型レベルレッスンの判定**: 条件型/infer は実行時に痕跡を残さないため、**②（型構文チェック）が主ゲート**。中級の規約を踏襲し、キーワード単体マッチを避け**型文脈にアンカー**（例: `T extends ... ? never : T` の並びまで見る）。③は値レベルの動作（関数の戻り値・const の値）で補助する。
- **仮実装パターン**: initialCode は `type X<T> = unknown` 等の「広すぎる仮実装」から始める。仮実装のままだと②で不正解になり、置き換えると①strict が周辺コードとの整合（036/037 では文字列連結→テンプレートリテラル式への修正）まで誘導する。
- **satisfies**: 中級ドキュメントの候補記載どおり「値が動く＋②`satisfies`」で現行エンジンのまま判定可能。`Record<string, string>` 注釈との対比（widening・キー存在チェック）を学びの核にする。

## 詳細（判定設計の要点）

### ②regex の置き場所 — structure と raw の使い分け（最重要）
2026-06-11 のサニタイザ追補により、**置換付きテンプレートリテラルの中身は `__originalCode__`（structure）では空白化される**。
したがってテンプレートリテラル型を検査する 036/037/039 の②は、**リテラル内容を保持する `__rawCode__` に対して**書く（リテラル値レッスン 009 と同じ規約）。
- `__rawCode__` はコメント除去済みなので**コメントバイパスは引き続き封鎖される**
- 文字列リテラルへの偽装（`const s = "type UserId = ..."`）は raw に残るが、036/037/039 の regex は `` type X = ` `` という**型エイリアス宣言の構文形**にアンカーしており、文字列内に置いても regex の `` = ` `` 部分が引用符と一致しないため成立しにくい。さらに③（実行時の値検査）と①（strict 型整合）が重なるため、単独バイパスでは合格できない
- 032-035/038 は通常どおり structure（`__originalCode__`）を使う

### 各レッスンのゲート
- **032**: ② `IsString<T> = T extends string ? true : false` の形 ／ ③ `IsString<string>` 型の const に true が入る
- **033**: ② `T extends U ? never : T` ／ ③ `MyExclude<Status,"archived">` の配列値
- **034**: ② `T extends (...) => infer R ? R` ／ ③ 取り出した型の変数値
- **035**: ② `T extends (infer E)[] ?` ／ ③ 要素値
- **036**: ②raw `` type UserId = `user-${number}` `` ／ ① 連結 `"user-" + n` は型エラー化→テンプレートリテラル式へ誘導 ／ ③ `makeUserId(7) === "user-7"`
- **037**: ②raw `` type SizeClass = `btn-${Size}` `` ／ ①③ 036 と同型
- **038**: ② `} satisfies Record<` ／ ③ `palette.primary` の値・`main` の値
- **039**: ②raw `` extends `on${infer E}` `` ／ ③ `EventName<"onClick">` の const 値

### initialCode の strict 方針
全レッスンの initialCode は**型エラーなしで動く仮実装**（②が唯一の入口ゲート）。
これは「strict エラーの修正」ではなく「型設計の置き換え」を課題にする上級の性格に合わせた選択。
verify-strict には「initialCode strict エラー 0 件＝正常」として現れる（既存の型必須レッスンとは逆パターン）。

### verify-lessons への登録
- SOLUTIONS: 8本すべて
- WRONG: **全レッスンにコメントバイパス答案**（必須規約）＋ 036 に文字列偽装、039 にテンプレート偽装を追加

## 学びポイント（オーナー向け）

- 条件型は「型の if」。`extends` は「左が右に代入可能か」の判定
- Union を条件型に渡すと**1要素ずつ分配**される（`MyExclude` が成り立つ理由）
- `infer` は「extends パターンの中に変数を置いて捕まえる」
- テンプレートリテラル型は**文字列の形を型で約束する**（`${number}` は穴）
- `satisfies` は「チェックはするが型は狭いまま」— 注釈 `:` との使い分けが実務の鍵

## 関連
- 中級設計: `curriculum-intermediate.md`（上級送りの判断記録）
- 判定エンジン: `2026-06-09-judge-false-positive.md`（②regex 規約・サニタイザ仕様）
