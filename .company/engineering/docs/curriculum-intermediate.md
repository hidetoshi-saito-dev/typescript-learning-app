---
created: "2026-06-08"
updated: "2026-06-08"
version: 2
status: approved
phase: "Phase 6 コンテンツ拡充 / 中級カリキュラム設計"
depends_on: "初級カリキュラム（001-015 実装済み）/ judge.worker.ts 判定エンジン / Lesson 型（src/types/index.ts）"
---

# 中級カリキュラム設計書（レッスン 016-031）

> 初級15レッスン（001-015）の続きとして、中級16レッスンを設計する。Phase 6 のコンテンツ拡充の正本。
> 本書は「どのトピックを・どの順で・どう判定するか」を確定し、実装（`src/lib/lessons/data/*.ts`）で迷わないための地図とする。
> **本書はレッスンの仕様であり、実装（.ts ファイル）は次セッション以降。**
>
> **v2（2026-06-08）**: 5次元の敵対的設計レビュー（実機検証付き）で確定した8件を反映。主な変更は ①029/030 の非同期実装を `AsyncFunction` 方式へ修正（旧案1は実機で破綻） ②判定列の正直化（型が実行時に消えるレッスンの「幻の③実行値」とネガティブ専用の「①」を整理） ③`unknown` レッスン新設（027 の前提充足）で15→16レッスンへ拡張。詳細は末尾「変更履歴」。

---

## 概要

中級カリキュラムは **「型を読む・取り出す・組み替える」力** を到達点に置く。初級が「値に型をつける」段階だったのに対し、中級は **型そのものを操作の対象にする** 段階。実務で毎日使う `keyof` / インデックスアクセス / ユーティリティ型 / 判別可能 Union / 型述語 / 非同期の型を扱う。

本書で確定する4点:

| # | 項目 | 結論（要点） |
|---|------|-------------|
| A | 到達点 | 実務頻出の型操作（keyof・ユーティリティ型・判別可能Union・型述語・Promise）。条件型・infer・テンプレートリテラル型は**上級へ送る** |
| B | レッスン数・採番 | **16レッスン（016-031）**。初級15と対称の予定だったが、027 型述語が前提とする `unknown` を独立レッスン（025）として補うため1枠拡張。1概念1レッスンで粒度を揃える |
| C | 構成 | 4群に分割：①型を取り出す演算子 → ②ユーティリティ型 → ③安全なUnion設計とunknown → ④関数と非同期の型 |
| D | 判定戦略 | 既存エンジンの3手段（型チェック/正規表現/実行値）で判定。**型レベル操作は必ず「その型を消費して動く値」とセットで出題**する。ただし型が実行時に完全に消えるレッスンでは③実行値が効かないため、判定列で正直に手段を区別する（下記「判定の凡例」） |

---

## なぜこの設計か

### なぜ「実務頻出の型操作」を到達点にしたか
初級で `Union` / `interface` / `型ガード` / `ジェネリクス基本・制約` まで到達済み。次の自然なステップは、**既存の型から新しい型を導出する**こと（`keyof`・`Pick`・`Omit` 等）。これらは React の Props 設計・API レスポンス型・フォーム状態など、実務のあらゆる場面で現れる。一方 `条件型`/`infer`/`テンプレートリテラル型` は型パズル色が強く、初心者の離脱リスクが高いため上級へ分離した（「やらないことを決める」）。

### なぜ「型を消費する値」とセットで出題するか（判定エンジンの制約）
判定エンジン（`judge.worker.ts`）は2段階で動く:
- **Step1（型チェック）**: Monaco の TS ワーカーが型エラーを検出 → `type_error`
- **Step2（実行判定）**: judge.worker が `ts.transpileModule({ strict: false })` で**型を消してから**実行し、テストの assertion を評価

つまり Step2 では型は完全に消える。`type Keys = keyof Point` のような**型定義は実行時に何も残らない**ため、それ単体ではテストできない。したがって中級の出題は必ず——

> **「導出した型を、実際に動く関数・値で使わせる」**

——形にする。例: `keyof` を教えるなら `getProperty<T, K extends keyof T>(obj, key): T[K]` を書かせ、`getProperty({name:"a"}, "name") === "a"` を**実行値**で確認する。型の正しさは Step1（誤ったキーは型エラー）＋ 構文の正規表現で担保する。この原則が中級全レッスンの設計を貫く。

### 判定の凡例（各レッスンの「判定」列で使う記号）
| 記号 | 手段 | 注意 |
|------|------|------|
| ① | **Step1 型チェック（ポジティブ・ゲート）** | 「正しく書かないと Step1 で型エラーになり弾かれる」課題設計のときのみ有効。**誤キー・再代入・網羅漏れ等のネガティブ専用エラーは判定列に載せない**（学習者は正解経路でそれを書かないため発火しない＝判定に使えない。解説文で補う） |
| ② | **正規表現マッチ（`__originalCode__`）** | 必ず**型文脈にアンカー**する（例 `type\s+\w+\s*=\s*typeof` / `\]\s*as\s+const`）。単なるキーワード存在チェックはコメントや別文脈の同名トークンですり抜ける |
| ③ | **実行値（Step2）** | **型効果が実行時に残る場合のみ有効**。`as const`・`typeof 型`・`never 代入`・`型述語注釈` は transpile で消え、正解/不正解が同じ値を返すため③では区別できない（=幻）。そのレッスンでは③を判定根拠にしない |

> **重要原則（レビュー反映）**: ③は「型を書いたか」ではなく「値が正しく動くか」しか見られない。型構文の有無が実行値に現れないレッスン（018/019/027）は、③を主判定にせず ②＋①ゲート で組む。①ゲートを立てるには「型を正しく書かないと Step1 で落ちる」よう initialCode/課題を設計する。

---

## 詳細：レッスン一覧（016-031）

各レッスンは初級と同じ `Lesson` 型（id / title / description / challenge / hint / initialCode / testCases）で実装する。

### 第1群：型から情報を取り出す演算子（016-019）
初級のジェネリクス制約（015 `extends`）を受けて、「型の中身にアクセスする」演算子を学ぶ。第2群ユーティリティ型の土台。

| id | title | 学習の狙い | 課題概要 | 判定 |
|----|-------|-----------|---------|------|
| 016-keyof | keyof 演算子 | オブジェクト型のキー全体を文字列リテラルの Union として取り出せる | `getProperty<T, K extends keyof T>(obj: T, key: K): T[K]` を完成。`K extends keyof T` が load-bearing で、外すと Step1 型エラー | ②`keyof` ③実行値（`getProperty` の戻り値） ①ゲート |
| 017-indexed-access | インデックスアクセス型 `T[K]` | 型からプロパティの型をピンポイントで取り出せる | 型 `Article` から `Article["title"]` で型を取り出し、その型を返す関数を書く | ②`\["` ③実行値 |
| 018-typeof-type | typeof 型演算子（値→型） | **値**から型を生成できる（初級012の「typeof 型ガード」＝値の文脈とは別物。こちらは型の文脈） | `const config = {...}` から `type Config = typeof config` を作り、`Config` を引数に取り **config のプロパティにアクセスする**関数を書く。引数型を緩めると Step1 エラーになる構成にする | ②`type\s+\w+\s*=\s*typeof`（型文脈に限定） ①ゲート ／ ※③は型が消えるため無効 |
| 019-as-const | const アサーション | `as const` でリテラルを最も狭い型に固定し、配列を readonly tuple にできる | 設定配列に `as const` を付け、その要素を**リテラル型を要求する関数**に渡す。`as const` が無いと Step1 型エラー | ②`\]\s*as\s+const`（型文脈に限定） ①ゲート ／ ※③は型が消えるため無効 |

> **satisfies（候補・任意）**: `as const` と対で実務頻出（TS4.9+）。`const palette = {...} satisfies Record<string,string>` 形で 019 直後 or 第2群 024 付近に1枠追加できる。判定は現行エンジンで可能（値が動く＋②`satisfies`）。低優先・15枠美学とのトレードのため v2 では必須化せず候補として記載。採用するなら 016-032 へ。

### 第2群：組み込みユーティリティ型（020-024）
第1群の `keyof`/インデックスアクセスを土台に、TypeScript 標準の「型変換ヘルパー」を学ぶ。実務で最頻出。

| id | title | 学習の狙い | 課題概要 | 判定 |
|----|-------|-----------|---------|------|
| 020-readonly | Readonly\<T\> と readonly | プロパティ／配列を不変にして、意図しない再代入を型で防ぐ | `Readonly<Point>` 型の引数を受け、読み取り経路で値を使う関数を書く | ②`Readonly<`/`readonly` ③実行値（読み取り経路） ／ ※「再代入不可」はネガティブ専用のため判定列から除外・解説で補う |
| 021-partial-required | Partial\<T\> / Required\<T\> | 全プロパティを任意化／必須化して、更新パッチ型などを表現できる | `updateUser(user: User, patch: Partial<User>): User`（`{...user, ...patch}`）を完成。patch を部分指定で呼ぶ → `Partial` が無いと Step1 エラー | ②`Partial<` ③実行値 ①ゲート |
| 022-pick | Pick\<T, K\> | 既存型から必要なキーだけ抜き出した新しい型を作れる | `type UserSummary = Pick<User, "id" \| "name">` を作り、要約を返す関数を書く | ②`Pick<` ③実行値 |
| 023-omit | Omit\<T, K\> | 既存型から不要なキーを除いた型を作れる（Pick の補集合） | `User` から `password` を除いた `PublicUser = Omit<User, "password">` を返す関数 | ②`Omit<` ③実行値 |
| 024-record | Record\<K, V\> | キー集合から値型を持つオブジェクト型を構築できる | `Record<"yen" \| "usd", number>` の為替テーブルを作り、通貨で引く関数 | ②`Record<` ③実行値 |

### 第3群：安全な Union 設計と unknown（025-028）
初級の Union（006）＋型ガード（012/013）を発展させ、「Union を安全に網羅的に扱う」実務パターンを学ぶ。**先頭に `unknown` を置く**（027 型述語の前提）。

| id | title | 学習の狙い | 課題概要 | 判定 |
|----|-------|-----------|---------|------|
| 025-unknown | unknown 型 | `any` の安全な代替。**絞り込まないと使えない**型として「まず検査してから使う」を体得（027 型述語の前提） | `describe(v: unknown): string` を受け、`typeof`／プロパティ存在チェックで絞り込んでから使う。絞り込まず使うと Step1 エラー（`any` との対比を解説） | ②`:\s*unknown` ③実行値 ①ゲート |
| 026-discriminated-union | 判別可能な Union 型 | 共通の判別タグ（`kind` 等）で Union を安全に分岐できる | `Shape = {kind:"circle";radius} \| {kind:"square";size}` の `area(shape)` を `kind` で分岐実装 | ③実行値 ①ゲート（絞り込まないと Step1 エラー） |
| 027-never-exhaustiveness | never 型と網羅性チェック | `never` への代入で「全ケース処理済み」をコンパイラに保証させる | 026 の `area` の `default` に `const _: never = shape` を置く。**さらに新しい `kind:"triangle"` を追加 → 既存 area が型エラー → triangle ケースを実装させる**ことで網羅性の効用を実行可能な形に落とす | ②`never` ③実行値（triangle ケースの面積） ／ ※「網羅漏れ→型エラー」自体はネガティブ専用で自動判定不可・解説で補う |
| 028-type-predicate | ユーザー定義型ガード（型述語 `is`） | `value is T` を返す関数で、独自の絞り込みロジックを型に反映できる | `isString(v: unknown): v is string` を書き、**絞り込んだ要素に `String` 固有メソッド（例 `.toUpperCase()`）を呼ぶ**処理を含める。戻り値を `boolean` にすると Step1 で型エラー（型述語の必然性を作る） | ②`is\s+string` ③実行値 ①ゲート |

### 第4群：関数と非同期の型（029-031）
コールバックの型から始め、非同期（Promise / async）の型へ。**030/031 は判定エンジンの非同期対応拡張（AsyncFunction 方式）が前提**（後述）。

| id | title | 学習の狙い | 課題概要 | 判定 |
|----|-------|-----------|---------|------|
| 029-function-type | 関数型（コールシグネチャ） | 関数そのものを型として表現し、高階関数の引数に型をつけられる | `type Mapper = (n: number) => number` を受け取る `mapNumbers(arr, fn)` を完成 | ②`=>` ③実行値 |
| 030-promise | Promise\<T\> 型 | 非同期処理の戻り値型 `Promise<T>` を読み書きできる | `delay(ms, value): Promise<string>` を実装し、`await` で値を取り出す | ②`Promise<` ③**実行値（要 AsyncFunction 対応）** ①ゲート |
| 031-awaited-async | async/await と Awaited\<T\> | `async` 関数の戻り値が `Promise` でラップされること、`Awaited<T>` で中身を取り出せることを理解 | `async function fetchName(): Promise<string>` を書き、`await` で受けて処理 | ②`async`/`await` ③**実行値（要 AsyncFunction 対応）** ／ ※`Awaited<T>` 自体は型のみで②確認 |

---

## 学習順序と依存関係

```
015 ジェネリクス制約(extends)  ← 初級の到達点
      │
   ┌──┴─ 第1群：型を取り出す ─────────────┐
   016 keyof → 017 T[K] → 018 typeof型 → 019 as const   （+ satisfies 候補）
      │（keyof / T[K] が土台）
   ┌──┴─ 第2群：ユーティリティ型 ─────────┐
   020 Readonly → 021 Partial/Required → 022 Pick → 023 Omit → 024 Record
      │
   ┌──┴─ 第3群：安全なUnionとunknown ─────┐
   025 unknown → 026 判別可能Union → 027 never網羅性 → 028 型述語is
      │
   ┌──┴─ 第4群：関数と非同期 ─────────────┐
   029 関数型 → 030 Promise → 031 async/Awaited
```

- **022 Pick / 023 Omit / 024 Record は 016 keyof に依存**するため、必ず第1群の後に置く。
- **025 unknown は 028 型述語の前提**。`unknown` を「絞り込んで使う」体験を先に積ませてから、その絞り込みを自前関数（型述語）に切り出す 028 へつなぐ。`unknown` は初級001-015・中級他レッスンのどこにも無い初出概念なので、独立レッスンで必ず導入する。
- **027 は 026 を直接拡張**（同じ `Shape` 題材を使い回し、never と triangle 追加で網羅性を体験）。題材を継続させて学習負荷を下げる。
- **031 は 030 を前提**（Promise を理解してから async/await へ）。

---

## 判定戦略と実装上の留意点（次セッションへの申し送り）

### ★最重要：030/031 には judge.worker の非同期対応拡張が必要（AsyncFunction 方式）
現状の `judge.worker.ts` は **同期実行のみ**。`new Function(transpiled)()` を同期で呼び、即 `postMessage` するため、**Promise の解決を待たない**。このままでは Promise/async レッスンの「実行値」テスト（③）ができない。

**【レビューで判明した重要事実】** assertion を `await (async()=>{...})()` で包む“旧案1”は **そのままでは動かない**。`ts.transpileModule({ module: ts.ModuleKind.None })` は**トップレベル await を変換せず**、出力に裸の `await (async()=>{...})()` が残る。これを現行の `new Function(transpiled)()` で実行すると **`ReferenceError: await is not defined` で全件 throw → 模範解答すら不正解**になる（TS 5.9.3 / target ES2017 / strict:false で実機確認済み）。

**【採用方針：AsyncFunction で実行する】**
`new Function` ではなく **AsyncFunction コンストラクタ**で実行すれば、関数本体内なので `await` が合法になり、トップレベル await が残ったコードでも動く（実機で成功確認済み）。

```ts
// judge.worker.ts（非同期対応の骨子）
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

self.addEventListener('message', async (event) => {   // ← ハンドラを async 化
  const { code, testCases } = event.data
  const failedTests: string[] = []
  for (const tc of testCases) {
    try {
      const fullCode = `const __originalCode__ = ${JSON.stringify(code)}\n${code}\n${tc.assertion}`
      const transpiled = ts.transpileModule(fullCode, {
        compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2017, strict: false },
      }).outputText
      await new AsyncFunction(transpiled)()   // ← await で Promise の解決まで待つ
    } catch (e) {
      failedTests.push(e instanceof Error && e.message ? e.message : tc.description)
    }
  }
  self.postMessage(failedTests.length === 0 ? { status: 'correct' } : { status: 'incorrect', failedTests })
})
```

**実装上の必須注意（偽陽性・回帰の防止）:**
- **必ず `await` する**: 内側の async 処理を await し損ねると、失敗すべき assertion の reject が同期 try/catch をすり抜け、**誤って「正解」判定**が出る（実機で unhandled rejection を確認）。`await new AsyncFunction(...)()` を徹底する。
- **タイムアウト**: `judge/index.ts` の 5秒 `worker.terminate()` は worker 全体に効くため、無限 await のハングは保護される。ただし保護は「全ケース合計5秒」である点に留意。
- **回帰**: 016-029（同期）も AsyncFunction 実行に乗せ替えるが、同期 throw は async 関数内で reject 化され `await` で捕捉されるため挙動は等価。エラーメッセージ表示も維持される想定。**ただし必ず001-029の回帰確認を行う**。
- **代替（案3・非推奨）**: AsyncFunction 方式が何らかの理由で通らない場合は 030/031 を上級へ送り、中級は 016-029 ＋ unknown/satisfies で完結させる。

→ **方針: AsyncFunction 方式で 030/031 を設計。実装着手時はまず judge.worker を上記へ拡張し、回帰ゲート（下記実装フロー手順1）を通してから 030/031 を追加する。**

### 型レベル操作の判定パターン（016-029）
- **③実行値が効くレッスン**（型効果が値に現れる）: 016/017/020(読み取り)/021/022/023/024/025/026/028/029/030/031。これらは「型を消費する関数＋実行値＋正規表現」の3点セットで判定可能。
- **③実行値が効かないレッスン**（型が transpile で完全に消え、正解/不正解が同値）: **018 typeof型 / 019 as const / 027 never**。これらは ③を主判定にせず、**②（型文脈アンカーの正規表現）＋①ゲート**で組む。設計表の判定列もその旨を明記済み。
- 正規表現（②）は初級と同じく `[ \t]`（半角スペース/タブのみ）で全角スペース誤検出を避ける。`<` `[` `(` 等はエスケープに注意（テンプレートリテラル内 `\\{` 等）。**キーワード単体マッチは避け、型文脈（`type X =`/`: 型`/`] as`）にアンカーする**。
- 「型エラーになるべきケース」（誤キー・再代入・網羅漏れ・絞り込み漏れ）は**ネガティブテストで実行できない**ため、**判定列の①には載せない**（正解経路で発火しないため）。①ゲートとして使えるのは「正しく書かないと Step1 で落ちる」ポジティブ構成のみ。型エラー体験は description/challenge の解説で補う。

### コンテンツ品質ルール（開発部門ガイド準拠）
- 各レッスンの description は「なぜそう書くか」を必ず説明（initialCode のアンチパターン → 課題で修正、の流れを初級から踏襲）。
- hint には模範解答の骨子を載せる（初級と同水準）。
- 1レッスンの新概念は1つに絞る（粒度を初級と揃える）。021（Partial/Required）と031（async/Awaited）は関連2概念をまとめるが、主概念1＋対概念の紹介の形で負荷を抑える。

### 実装フロー（次セッション）
1. `judge.worker.ts` を **AsyncFunction 方式**へ拡張 → **回帰ゲート**: 既存001-029 が全て従来通り判定でき、かつ **030/031 の模範解答が実際に `correct` を返す／模範解答の誤り版が `incorrect` を返す**ことをローカル実機で確認（ここを通らない限り 030/031 は確定させない）
2. `src/lib/lessons/data/016-*.ts` 〜 `031-*.ts` を作成
3. `src/lib/lessons/catalog.ts` に import / 配列登録
4. ローカルで各レッスンの「初期コード＝不正解／模範解答＝正解」を実機確認（特に 018/019/027 は ①ゲートが本当に Step1 で落ちるかを確認）
5. 進捗UI（初級/中級の区切り表示）が必要か別途検討 ← UI 設計タスク

---

## 学びポイント

- **判定エンジンの制約が出題形式を決める**：型は実行時に消えるという事実から、「型を消費する値を書かせる」という中級の出題原則が導かれた。設計はエンジンの現実から逆算する。
- **静的な「動くはず」を信じない**：旧案1（async IIFE を `new Function` で実行）は静的には妥当に見えたが、トップレベル await が transpile で残り実機で全件 throw した。CSP 強制適用のときと同じ「静的レビューだけで確定してはいけない」教訓。**030/031 は実機の回帰ゲートを設計確定の条件にする**。
- **判定列は正直に**：③実行値が効かないのに表に書くと、実装者が「検証している」と誤認する。型が消えるレッスンは②＋①ゲートに正直化し、ネガティブ専用の①は載せない。
- **前提概念を飛ばさない**：型述語（028）は `unknown` を前提にしていたのに `unknown` のレッスンが無かった。依存を洗い出し、欠けた前提（025 unknown）を独立レッスンで補った。
- **スコープを切る勇気**：条件型・infer を上級へ送り、中級を「実務で毎日使う型操作」に集中させた。全部入りは離脱を生む。

---

## 変更履歴

### v2（2026-06-08）— 設計レビュー（5次元・敵対的検証・実機確認）反映
確定8件を反映:
- **[High] 030/031 非同期実装**: 旧案1（`await (async()=>{})()` を `new Function` で実行）は `module:None` がトップレベル await を変換せず実機で全件 throw。→ **AsyncFunction コンストラクタ方式**に修正し、回帰ゲート（模範解答が correct を返すこと）を実装フローに追加。
- **[High] 027 never 網羅性の判定不能**: ③空振り・①ネガティブで自動判定不可だった。→ 判定列から「①漏れで型エラー」を削除し、`triangle` 追加で網羅性を**実行可能な形**に落とす課題へ変更。「網羅漏れ→型エラー」は解説で補うと明記。
- **[Medium] 018/019/027 の幻の③**: 型が transpile で消え正解/不正解が同値。→ 判定列から③を外し②（型文脈アンカー）＋①ゲートへ。「③が効く/効かないレッスン」を判定戦略節で明示。
- **[Medium] 028 型述語が型述語なしでも合格**: → 絞り込み後に `String` 固有メソッドを呼ぶ課題にし、`boolean` 戻り値だと Step1 エラーになる①ゲートを追加。
- **[Medium] unknown 欠落**: 028 が前提とする `unknown` のレッスンが無かった。→ **025-unknown を新設**（15→16レッスン、採番を旧025-030→026-031 へ繰り下げ）。
- **[Low] 019/020 の「①再代入不可」**: ネガティブ専用で line138 原則と矛盾。→ 判定列から削除、解説で補う。判定の凡例に「ネガティブ専用の①は載せない」を明文化。
- **[Low] 018 typeof の正規表現が緩い**: → `type\s+\w+\s*=\s*typeof` 等、型文脈アンカーへ。
- **[Low] satisfies 欠落**: → 候補として 019 付近に注記（必須化せず）。

棄却1件: 「029(旧)/030 Promise の①戻り値型が strict:false 依存で不安定」→ ③実行値が戻り値を捕捉するため設計書の誤読、と判定（不採用）。

未検証: judge-testability / async-engine 次元の検証エージェントはセッションのレート上限で実行できず（confirmed=0）。ただし両次元の中核論点（型が消える③無効・030/031 の非同期破綻）は ts-accuracy / pedagogy 次元が実機検証付きで確定済みのため、実質カバーされている。次セッションで余力があれば両次元の再検証を行う。

### v1（2026-06-08）— 初版
中級15レッスン（016-030）の初期設計。4群構成・「型を消費する値とセット」原則・非同期は要エンジン拡張、を確定。

> 関連: アーキテクチャ `architecture.md`（判定APIは存在しない＝完全クライアントサイド）/ 初級実装 `src/lib/lessons/data/001-015` / 判定エンジン `src/workers/judge.worker.ts` / レビュー記録 `.company/secretary/notes/2026-06-08-decisions.md`
