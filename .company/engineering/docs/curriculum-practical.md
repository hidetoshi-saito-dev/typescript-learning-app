# 実践クラス設計（040-048・9本／3シナリオ）

作成: 2026-06-12 ／ 正本。**設計のみ確定・実装は未着手**（ドキュメント先行の運用ルール）。
同日 4部署レビュー実施・P1 指摘8件＋文言系P2 を反映済み（v1.1）。指摘の全文と対応は `curriculum-practical-review.md`。

## 概要

001-039 で学んだ構文を**実務の3つのフロー**の中で総動員する「卒業制作」クラス。
1シナリオ＝3ステップの連作で、各シナリオが一貫したミニドメインを持つ。到達: 39＋9＝**48レッスン**。

| シナリオ | フロー | ドメイン | レッスン | 総動員する既習構文 |
| --- | --- | --- | --- | --- |
| A | 新規開発 | カフェ注文管理「TonariCafe」 | 040-042 | リテラルUnion(009)・satisfies(038)・keyof typeof(016/018)・unknown(025)・型述語(028) |
| B | 機能追加 | 通知配信サービス「Notifier」 | 043-045 | Partial(021)・判別共用体(026)・**never網羅性(027)**・ジェネリクス(014/015)・Promise/async(030/031) |
| C | 既存改修 | レガシー会員APIクライアント | 046-048 | any全廃・unknown＋型ガード(025/028)・as const＋typeof＋インデックスアクセス(017/018/019) |

形式は**「体験最大化」案を基盤に最小拡張**:

- `Lesson` 型に optional 2フィールド（`scenario?: string` / `requirements?: string[]`）
- ProblemPane に**条件付き3セクション**（🎫依頼・📄仕様・✅受け入れ条件）＋ステップバッジ
- レベル `practical`（実践）を `level.ts` に追加、バッジ「🛠️ 実践マスター」を追加
- **DBスキーマ変更ゼロ・判定エンジン（judge/sanitize/worker）変更ゼロ**

## なぜこの設計か

### 実務3フローを「判定エンジン3層の得意技」に対応させる

- **新規開発（A）= ②が要件**。「広すぎる仮実装」（上級規約）を要件どおりに狭める工程を②＋①で判定。
- **機能追加（B）= ①が修正箇所のリスト**。判別共用体に新バリアントを足した瞬間、never 網羅性チェックが
  **複数関数にわたる修正漏れを全部**赤線で列挙する（044 の核体験）。①の「型エラーがあると実行に進めない」
  仕組みが、そのまま「コンパイラに導かれる実務」の再現装置になる。
- **既存改修（C）= ③が回帰スイート**。「挙動を変えない」を改修前後で同一の③テストが守り、
  「書き換えたこと」は②の**不存在チェック**（any が残っていないこと等）で判定する。
  不存在チェックは「書かないことはコメントにも文字列にも偽装できない」ため、バイパス耐性が本質的に最も高い。

### 形式の選定 — 最小拡張案 vs 体験最大化案の審査結果

2案を独立に設計し審査した（意思決定ログ 2026-06-12 参照）。**体験最大化案を採用**：

1. 最小拡張案（既存形式のまま bold ラベルで疑似チケット表現）は、見た目が既存39レッスンと同一になり
   「実務の流れ」という目玉テーマが演出止まりになる（案自身が自己申告）。
2. 両案は実作業の約8割（level.ts・バッジ・catalog・verify・レッスンデータ執筆）を共有し、
   体験最大化案の固有差分は optional フィールド＋条件レンダリングのみ。リスクの質的差はない。
3. **後付けの二重払い**: 最小拡張で出すとチケット文面が challenge 散文に焼き込まれ、
   後から UI を足す際に実践全データの書き直し＋verify 再検証が必要になる。逆方向の増補は後方互換。

ただし最小拡張案の運用資産（連作整合チェックの自動化・80行予算・単独解答可能性3条件・ラベル語彙・
回帰アサーションコピー規約）は本書に全面移植した。

### 読み取り専用「既存コード」区画は却下 — initialCode 埋め込みを採用

| 観点 | 読み取り専用区画 | initialCode 埋め込み（採用） |
| --- | --- | --- |
| ①strict | Monaco モデル外コードの型解決に extraLib 注入が必要 | 変更不要 |
| ②regex | `__originalCode__`＝エディタ内容という contract が曖昧化・verify ミラーに波及 | 変更不要（バナーコメントはサニタイザが除去） |
| ③実行 | Worker 投入前の連結処理が必要 | 変更不要 |
| 体験 | 「既存コードは聖域」という嘘の実務観 | 既存コードも編集**できる**が③の回帰アサーションが守る＝**回帰テストに守られて変更する体験そのものが実務** |

### 受け入れ条件は新フィールドにしない

✅受け入れ条件セクションは `testCases[].description` をそのまま事前表示する。
受け入れ条件と判定基準が**定義上一致**し、乖離バグが構造的に起きない。
代償として description は「振る舞い文」で書く規約が必要（詳細 2-4）。
②が主ゲートのレッスンで文言が破綻したら `acceptanceCriteria?: string[]` 上書きフィールドを
後方互換で追加する——**②主ゲートで振る舞い文が書けないレッスンが1本でも出たら**が追加の判断基準。

### 敵対的レビューの結論を規約化（本書 2-3）

カリキュラム初案に対する判定エンジン敵対レビューで、**②regex の体系的バイパス3パターン**が実証された
（ダミー構文・raw デコイ・①アンカー削除）。実現不能は0本だったが9本中8本に修正が入り、
修正内容を**実践クラスの②規約**として 2-3 に固定した。レッスン別詳細（3章）は修正適用済みの確定版。

## 詳細

### 1. レベル・採番・バッジ

```ts
// src/lib/lessons/level.ts
export type LessonLevel = 'beginner' | 'intermediate' | 'advanced' | 'practical'
// LEVEL_LABELS に practical: '実践'、LEVEL_ORDER 末尾に 'practical' を追加
export function getLessonLevel(lessonId: string): LessonLevel {
  const n = parseInt(lessonId, 10)
  if (n <= 15) return 'beginner'
  if (n <= 31) return 'intermediate'
  if (n <= 39) return 'advanced' // ← else から境界固定に変更（必須）
  return 'practical'
}
```

- `LEVEL_LABELS` は `Record<LessonLevel, string>` なので、union への追加漏れは**コンパイルエラーで波及検出**される
  （＝044 の核体験そのもの。実装時に体感できる）。
- `LessonList.tsx` は `LEVEL_ORDER.map` 駆動のため「実践」セクションは**自動出現・変更不要**。
- **バッジ**: `computeBadges`（insights.ts）は5種を**ハードコードした配列**を返すため、自動では増えない。
  `{ id: 'practical-master', icon: '🛠️', label: '実践マスター', description: '実践をすべて完了',
  earned: levelAllDone('practical') }` を**手動追加**する。`all-complete`（👑）は `done === total` 導出なので自動追従。
  **条件付き挿入（レビューP-2）**: practical レッスンが items に1本も無い間は practical-master を配列に**含めない**
  （PR-1 単独デプロイ時に「絶対に獲得できないバッジ」が未獲得チップとして本番に出るのを防ぐ。
  PR 順序に依存しない解。なおホームの空セクションは LessonList の `length===0 → null` ガード済みで問題なし）。
- **👑バッジの一時剥奪**: 総数 39→48 で既存の全制覇ユーザーは未獲得に戻る。上級リリース時（31→39）と
  同じ導出型バッジの仕様として**再受容**する（意思決定ログに明記）。
- **アクセス制御・SEO は変更不要**: proxy.ts の「番号≥4 ログイン必須」で 040+ は自動的にログイン必須。
  sitemap.ts は「番号<4 のみ掲載」で自動除外。

### 2. 型とUIの差分

#### 2-1. Lesson 型（optional 2フィールドのみ・既存39ファイル無変更）

```ts
export type Lesson = {
  // ...既存フィールドそのまま
  /** 実践クラス: 依頼の文脈。チケット風の枠で表示（「。」分割の段落表示） */
  scenario?: string
  /** 実践クラス: 仕様。1要素=1箇条書き行（renderInlineMarkdown 適用） */
  requirements?: string[]
}
```

`requirements` を `string[]` にするのは Markdown パーサを足さず「1要素=1`<li>`」で曖昧さゼロのため。
受け入れ条件は testCases から、ステップ情報は純関数から導出し、フィールドにしない。

#### 2-2. 新規モジュール src/lib/lessons/scenario.ts（level.ts と同思想）

```ts
export type ScenarioInfo = { title: string; flow: string; step: number; total: number }
// シナリオ配列（title・flow・lessons: id[]）を単一情報源とし、step/total は配列位置から導出する
// （lessonId→step の平置きマップは step/total の手書きミスを許すため不採用。レビューE-6）。
// レッスンデータを import しない＝Client Component 安全
const SCENARIOS = [
  { title: 'TonariCafe', flow: '新規開発', lessons: ['040-...', '041-...', '042-...'] },
  // ...
] as const
export function getScenarioInfo(lessonId: string): ScenarioInfo | undefined
```

#### 2-3. ProblemPane（条件付き追加のみ・既存描画パスの JSX 行に diff を出さない）

props 追加: `scenario?` / `requirements?` / `acceptanceCriteria?` / `scenarioInfo?`（5→9個。9個が限界ライン、
次の拡張要求が来たら practical 用オブジェクトへの束ね直しを検討）。

**依頼・仕様・受け入れ条件は1枚の「チケット」カードに統合する**（レビューC-1: 知覚セクション8つは走査負荷が
高く、「学び」がチケットの物語を分断するため。依頼=顧客の言葉／課題=作業指示、の役割分担も明確になる）。表示順:

1. バッジ行: `Lesson 040` ＋（scenarioInfo があれば）**`TonariCafe · STEP 1/3`** バッジ併置
   （「シナリオA」のようなシステム内部語は使わず、学習者のメンタルモデルに合うドメイン名を表示。レビューC-2）
2. タイトル
3. **🎫 チケット**カード（scenario があるときのみ・アクセント枠の1カード。内部に小見出し3つ）:
   依頼文（splitAtPeriod / renderInlineMarkdown 再利用）→ 仕様（requirements の `<ul>`）→
   受け入れ条件（acceptanceCriteria の `<ul>`・チェック型グリフは `aria-hidden`）。
   カードは `<section aria-label="チケット">`。
4. 📘 学び（既存のまま。ただし見出しは scenarioInfo があれば「TypeScript の基本」→**「実務での使いどころ」**に切替。
   ハードコード見出しの文脈不一致解消。props 追加なしで実現）
5. 📋 課題（既存のまま）
6. ヒント（既存のまま）

- 新セクションはすべて**サーバーレンダリングされる静的テキストの初期描画**（遅延挿入なし）。
  CLS 0.005 の規律（ErrorPanel の常設固定と同じ思想）を維持する。
- 新セクションの配色は**コントラスト基準（text-zinc-600 以上・opacity 装飾禁止）を実装レビュー観点に明記**
  （PR #19 バッジ再犯の教訓）。

#### 2-4. LessonWorkspace の受け渡し

```ts
const isPractical = getLessonLevel(lesson.id) === 'practical'
// scenario={lesson.scenario} requirements={lesson.requirements}
// acceptanceCriteria={isPractical ? lesson.testCases.map(t => t.description) : undefined}
// scenarioInfo={getScenarioInfo(lesson.id)}
```

**testCases.description の文体規約**: 受け入れ条件として読める**振る舞い文**で書く
（「不正なデータは受け付けない」○／「regex にマッチする」✗）。③主体の設計なら自然に両立する。

#### 2-5. ホーム（LessonList）— 実践セクション内のシナリオ小見出し

レッスンタイトルにはドメイン名が含まれないため、ホームの実践セクションで9本がフラットに並ぶと
連作構造が見えない（レビューC-3）。**実践セクション内にのみ** scenario.ts 導出のシナリオ小見出し
（「TonariCafe — 新規開発」等）を挿入する（数行・他レベルのセクション描画は無影響）。
タイトル命名での代替（「TonariCafe① …」）は番号バッジと視覚的に重複するため不採用。

### 3. ②regex 実践クラス追補規約（最重要・敵対レビュー反映）

実践クラスは initialCode が 20-40 行と長く、②は脆くなる。**②は1レッスン合計4本以内・③主体**を原則とし、
敵対レビューで実証された3つの体系的バイパスへの対規約を全レッスンに適用する:

1. **存在チェックは対象識別子にアンカーする（ダミー構文封鎖）**。
   `satisfies Record<` 単体は `const dummy = {} satisfies Record<...>` で満たせる。
   必ず `MENU` / `ROLES` / `default:` / `JSON.parse` / 関数シグネチャ等の対象にアンカーした形で書く
   （038 の `palette` アンカーが前例）。
2. **raw（`__rawCode__`）の存在チェックは新設しない（raw デコイ封鎖）**。
   raw は文字列・テンプレートの中身を保持するため、いかなる raw 存在 regex も
   テンプレートリテラルに文面を書くデコイで満たせる。実践の題材（ステータス名・ロール名）は
   テンプレートリテラル型と違い**ランタイム値に倒せる**ので、リテラル名の検査は③＋①連動で行う。
   逆に **structure には引用符（デリミタ）が残る**ため、「文字列リテラルUnionの形」の存在/不存在は
   structure で検査できる（048 で使用。中身の名前を見る場合だけが raw の出番、という整理）。
3. **①はチート耐性ゲートに数えない（①アンカー削除封鎖）**。
   ①はエディタ内コードだけを検査し、initialCode の埋め込みアンカーはユーザーが削除・改変できる。
   さらに assertion は `transpileModule({ strict: false })` で実行され③から型レベルの強制はできない。
   ①をゲートとして数える場合は、**そのアンカーが②存在チェックまたは③参照で削除不能**であることを
   レッスン仕様に明記する（043 の「埋め込みコードを③回帰でピン留め」が模範形）。

補助規約:

- **不存在チェックを積極活用**: `\bany\b`（structure はコメント・リテラル中身が空白化済みのため誤検出なし）、
  `as` キャスト禁止等。バイパス耐性が本質的に高い。否定 regex は型注釈位置等にアンカーした規約形のみ。
  `as` 系はすべて**先頭境界つき `\bas[ \t]+`** に統一する（`has Order` 等の部分一致を排除。レビューE-5）。
- **引用符スタイル非依存（レビューE-1）**: 文字列リテラルの「形」を見る②は、引用符を `["']` クラスで書き
  シングルクォート正答の偽陰性を防ぐ（structure はデリミタを保持するためスタイル差がそのまま残る）。
  バッククォート（テンプレートリテラル型）での記述は仕様外とし、hint がダブルクォート形を提示する。
- **dead check 回避**: ②が要求する構文を initialCode（仮実装シグネチャ含む）に**含めない**ことを
  レッスン仕様の必須項目にする（027 の② no-op の再演防止。043/045 が該当）。
- **複数行許容**: 複数行にまたがる②のみ、区切り文字クラスを `[ \t]` から `[ \t\r\n]` に拡張してよい。
- **WRONG 規約の拡張**: 既存の「コメントバイパス必須」に加え、実践クラスは
  **「ダミー構文バイパス答案」を各レッスン最低1本**登録する。改修系は「バグを直さず期待値だけ合わせる偽修正」も必須。
- **残存リスクの受容**: 修正後も②単独の完全性は目標としない（2026-06-11 追補の方針を本クラスにも適用）。
  多層防御＋被害は自己申告進捗のみ、という既存の受容判断を踏襲する。

### 4. 連作（コード引き継ぎ）規約

1. **initialCode(N+1) ＝ 模範解答(N) の整理版＋新 TODO 区画**。区画はバナーコメントで示す:
   `// ===== 既存コード（このレッスンでは変更不要）=====`（サニタイズで除去され②に影響しない）。
2. **initialCode は最大80行**。本筋と無関係な持ち越し部分は「要約コメント＋最小実装」に縮約する
   （根拠: ②脆化・③アサーション増による5秒timeout・モバイル可読性）。045 が縮約の実例。
3. **単独解答可能性（絶対条件）**: (i) initialCode 単体で strict クリーン
   （044 の意図的エラーのみ例外として verify-strict に登録） (ii) scenario 文で文脈を自己完結的に再掲
   (iii) testCases は当該レッスン分＋持ち越し部分の回帰アサーションで完結。
   前レッスンの答案知識を要求しない（復習導線 reviewCandidates との整合根拠）。
4. **連作整合チェックの自動化**: verify-lessons.cjs に「040番台の initialCode(N+1) が前レッスン SOLUTION の
   指定アンカー文字列を含むこと」の機械検証を1関数追加する。手動チェックリスト運用にしない
   （模範解答の変更が後続 initialCode に伝播しない事故を CI で検出）。
5. **執筆禁止事項**: バッククォート・`**` の内側に「。」を書かない（splitAtPeriod がインライン記法を破壊する
   既存制約。scenario フィールドにも適用）。要件（requirements）は1要素1文・最大5項目。
6. **回帰アサーションのコピー**: 機能追加・改修シナリオでは前レッスンの③アサーションをコピーして残し、
   「既存機能を壊していない」を判定に乗せる。
7. **連作フレーミング文（レビューR-1）**: 連作2本目以降の scenario 文に「前回の完成形（模範解答）が
   initialCode に入っています。自分の解き方と違う部分は、まず読んで差分を確かめるところから——それも実務です」
   系の一文を必ず入れる（worked example → completion problem の faded guidance を明示し、
   「自分の解が上書きされた」違和感を学びに転換する）。
8. **所要時間の目安（レビューR-2）**: scenario 文に「目安: 15分」等の所要時間を含める
   （実践は1本5分では終わらないため、期待値設定で離脱を抑える。フィールドは増やさない）。
9. **「こうも書ける」補足（レビューE-7・部門ルールの適用）**: 判定の都合で書き方を固定した箇所
   （T 名・default 節維持・JSON.parse 宣言形）は、hint または description で
   「実務では assertNever ヘルパー等の書き方もある」と必ず補足する。

### 5. レッスン別詳細（敵対レビュー修正適用済みの確定版）

#### シナリオA: TonariCafe 注文管理（新規開発）— 仮実装を要件どおりに狭める

**040-order-status-model「要件を型にする — 注文ステータス設計」**

- 学び: 要件文を読み `type OrderStatus = string` をリテラルUnion（`"pending" | "paid" | "served" | "cancelled"`）へ。
  型設計が仕様の第一防衛線になる体験。
- initialCode（約15行・strict クリーン）: 仮実装 `type OrderStatus = string`＋`Order` 型＋`canCancel` 骨格＋
  **`const ALL_STATUSES: OrderStatus[] = ["pending", "paid", "served", "cancelled"]`**（「この行は変更しない」と課題文に明記）。
- ②structure: Union宣言形 `type[ \t]+OrderStatus[ \t\r\n]*=[ \t\r\n|]*(["'][^"']*["'][ \t\r\n]*\|[ \t\r\n]*){3}["'][^"']*["']`
  （引用符は `["']` クラス＝シングルクォート正答も許容。レビューE-1）／
  存在 `ALL_STATUSES[ \t]*:[ \t]*OrderStatus[ \t]*\[\]`／不存在 `\bas[ \t]+(any|unknown|const)\b`・`:[ \t]*any\b`。
- ③: `ALL_STATUSES.length === 4`＋4語の包含＋`canCancel({status:"pending"})===true`・`canCancel({status:"served"})===false`。
- ①連動（規約3準拠）: ダミーUnion（`"x"×4`）だと `ALL_STATUSES` への代入で①が落ち、
  この行は②存在＋③参照で削除不能。**raw 検査なし**（初案の raw 方式は raw デコイで破られるため廃止）。
- WRONG: コメントバイパス／ダミーUnion＋テンプレートデコイの合わせ技（敵対レビューの実証答案をそのまま登録）。

**041-menu-master-satisfies「マスタデータと単一情報源」**

- 学び: 価格表を `satisfies Record<string, number>` で検査しつつ widening を防ぎ、
  `type MenuId = keyof typeof MENU` で値から型を導出。存在しない商品IDが型エラーになる体験。
- initialCode（約25行）: 040 完成形＋注釈なし `MENU`＋仮実装 `type MenuId = string`＋`totalOf`（return 0）。
- ②structure: `MENU[ \t]*=[ \t]*\{[^}]*\}[ \t\r\n]*satisfies[ \t]+Record[ \t]*<`（**MENU 名アンカー**・ダミー封鎖）／
  `type[ \t]+MenuId[ \t]*=[ \t]*keyof[ \t]+typeof[ \t]+MENU`／不存在 `MENU[ \t]*:[ \t]*Record`（038 第2テスト同型）／
  `items[ \t]*:[ \t]*MenuId[ \t]*\[\]`（totalOf 署名。`string[]` 逃げ封鎖）。
- ③: `totalOf(["latte","tea"])` 合計値＋`MENU.latte` 値保持（回帰）。
- WRONG: コメントバイパス／ダミー satisfies（`const dummy = {} satisfies ...`）／注釈版（`MENU: Record` のまま）。

**042-order-input-guard「外部入力の検証 — unknown から Order へ」**

- 学び: `unknown` 値を型述語 `isOrder(value: unknown): value is Order` で絞り込む。`as` で黙らせず検査で通す。
- initialCode（約30行）: 040-041 完成形＋`isOrder` 仮実装（`): boolean` / return false）＋`registerOrder(value: unknown)` 骨格。
- ①必然性ゲート（028 同型・規約3準拠）: 戻り値 `boolean` のままだと `registerOrder` 内のプロパティアクセスが
  strict エラー。`registerOrder` は③が参照するため削除不能。
- ②structure: 存在 `\)[ \t]*:[ \t]*\w+[ \t]+is[ \t]+Order\b`（**引数名は `\w+`**。`value` ハードコードは改名正答が偽陰性）／
  不存在 `\bas[ \t]+(Order|any)\b`・`:[ \t]*any\b`（`as any` での①無効化封鎖。`as unknown as Order` は `as Order` 部分一致で捕捉）。
- ③: 正常注文→受理／`status` 不正→拒否／`null`→拒否（`typeof null === "object"` の実バグを突く）。
- WRONG: コメントバイパス／常に true の型述語（③で確実に落ちる）／`as Order` キャスト逃げ。

#### シナリオB: Notifier 通知配信（機能追加）— 既存コードを読み、壊さず広げる

**043-notify-settings-patch「既存コードを読んで小さく拡張する」**

- 学び: 完成済みの既存実装（判別共用体 `Notification = email | sms`＋`format()`＋`Settings`）を読んで理解し、
  挙動を変えずに `mergeSettings(base, patch)` を追加。既存③テスト＝回帰の構図を初体験。
- initialCode（約30行）: 既存コード完成形（format は switch＋never default で書く→044 の伏線）＋
  **仮実装署名は `mergeSettings(base: Settings, patch: Settings): Settings { return base }`**
  （**`Partial` を含めない**——dead check 回避を仕様として明文化）。
- ②structure 1本のみ: `patch[ \t]*:[ \t]*Partial[ \t]*<[ \t]*Settings[ \t]*>`
  （assertion は strict 対象外のため Partial 強制は②が唯一の砦。「ネガティブ専用①は判定列に載せない」中級凡例準拠）。
- ③ 4本: **回帰2本**（`format(email)`/`format(sms)` 出力不変＝埋め込みコードのピン留め）＋
  受け入れ2本（部分パッチ反映・`base` 非破壊＝スプレッドの必然性）。
- WRONG: コメントバイパス／`patch: Settings` のまま／`base` を直接 mutate。

**044-notify-new-channel「★新チャネル追加 — コンパイラが全修正箇所を教える」（本クラスの目玉）**

- 学び: initialCode で Union に `{ kind: "push"; deviceId: string; title: string }` が**追加済み**になっており、
  `format()`・`destinationOf()`・`charLimitOf()` の**3関数の never 網羅性チェックが同時に①エラー**になる。
  赤線＝直すべき場所の完全なリスト。仕様どおり3箇所に case を足すと全部緑になる。
  027 の単関数体験を「複数関数に波及する実務スケール」へ拡張。
  description で「Union に1行足しただけで、コンパイラが直すべき場所を全部教えてくれた。これが型のある実務」を明文化。
- initialCode（約40行・本クラス最長だが課題は case 追加のみ）: 043 完成形＋push 追加済み Union＋
  3つの switch 関数（`default: const _: never = n` 付き・**3関数とも明示的戻り値型必須**
  ——default 削除逃げを TS2366「全経路 return なし」で①が塞ぐための仕様）。
  **意図的 strict エラー3箇所**（027 と同じ①ゲート型として verify-strict に登録）。
- ②structure: never カウント `(?:[\s\S]*?default[ \t]*:[\s\S]{0,80}?:[ \t]*never[ \t]*=){3}`
  （**`default:` アンカー＋代入形 `: never =`**。初案の素朴な `:never` ×3 カウントは `const _a: never[] = []`
  ダミーで破られ、`\b` 終端でも `never[]` に一致してしまうため、027 の `const _: never = n` 代入形まで縛る。レビューE-4）／
  不存在 `\bas[ \t]+never\b`（`undefined as never` 偽装防止）。
- ③ 5本: push の3関数動作3本＋email/sms 回帰2本。
- challenge に「3つの `default` 節はそのまま残し、`case` を追加してください」と明記
  （`assertNever` ヘルパーに括り出す上級者答案は偽陰性になるため、仕様で書き方を固定。015 の T 名指定が前例）。
- WRONG: コメントバイパス（never をコメントへ移し default 削除）／`default: return ""`（網羅性放棄）／never[] ダミー。

**045-notify-retry-async「非同期送信とジェネリックなリトライ」**

- 学び: `retry<T>(fn: () => Promise<T>, times: number): Promise<T>` を実装。
  検証は**呼び出し回数を数えるモックPromise**（タイマー不使用・決定的・5秒予算と無関係）。
- initialCode: 044 完成形は**型定義＋format のみに縮約**（80行予算の実例。destinationOf 等はこのレッスンの③が
  参照しないため省略——単独解答可能性は維持）＋**仮実装は具体型署名**
  `function retry(fn: () => Promise<string>, times: number): Promise<string> { return fn() }`（dead check 回避）。
  埋め込み利用例は **`async function demo()` でラップ**（トップレベル await は module None で TS1375 ①常時赤になるため）。
- challenge で「型引数は `T` と名付けてください」と明示（015/016 の前例。`retry<R>` 正答の偽陰性防止）。
  `times` の定義は「総試行回数」で challenge と③を統一。
- ②structure: `retry[ \t]*<[ \t]*T[ \t]*>`／`\([ \t]*\)[ \t]*=>[ \t]*Promise[ \t]*<[ \t]*T[ \t]*>`。
- ③ 3本（**assertion 内で必ず await**——judge.worker の await 漏れ偽陽性警告を実装規約に明記）:
  2回失敗→3回目成功モックで `await retry(flaky, 3) === "ok"` **かつ呼び出し回数 === 3**／
  1回成功モックは1回しか呼ばれない／times 超過で reject が伝播。
- WRONG: コメントバイパス／`fn: any`／リトライせず1回だけ（回数カウントで落ちる）。

#### シナリオC: レガシー会員APIクライアント（既存改修）— 挙動を変えずに型を立て直す

**046-api-any-removal「any 全廃 — 挙動を変えずに型を当てる」**

- 学び: any だらけだが動いているコードに `type ApiUser` を定義し、シグネチャの any を全廃。
  ③回帰は最初から全部緑で、型を当てても緑のまま、が成功条件。①は any を消した瞬間に
  型の合わない箇所を列挙する「移行ガイド」役。
- initialCode（約25行）: `function pickActiveNames(res: any): any` 等のレガシーコード。
  データ形は使用箇所（`res.users`・`u.active`・`u.name`）から読み取らせる。
- ②structure: **不存在 `\bany\b`**（本エンジン最強パターン。コメント・リテラル中身は空白化済みで誤検出なし。
  暗黙 any 化は noImplicitAny の①が塞ぐ）／**不存在 `\bas[ \t]+[A-Za-z_]`**（ブランケット。
  単段キャスト `res as {...}` 逃げも封鎖。この題材に as の正当用途はない）／
  存在 `(type[ \t]+ApiUser[ \t]*=|interface[ \t]+ApiUser\b)`（択一形）。
- ③ 回帰3本: 正常レスポンス／active=false 混在／空配列。
- WRONG: コメントバイパス（型をコメントにのみ書く→noImplicitAny で①も落ちる二重防御）／`as unknown as` 二段キャスト。

**047-api-unknown-guard「境界を unknown にする — キャストからの卒業」**

- 学び: `JSON.parse(json) as ApiResponse` という実行時に何も守らないキャスト（不正データでクラッシュする実バグ）を、
  `unknown` 受け＋型述語＋不正時 null 返却に改修。バグ修正と型強化が同時に進む体験。
- initialCode（約35行）: 046 完成形＋`as ApiResponse` キャスト入り `handleResponse(json: string)`。
- ②structure: 存在 `:[ \t]*unknown\b[\s\S]{0,40}?=[ \t]*JSON[ \t]*\.[ \t]*parse\b`
  （**JSON.parse 地点にアンカー**。素朴な `: unknown` 存在はダミー変数で満たせる上、
  JSON.parse の lib 由来 any は文面に any が出ず不存在チェックで捕捉不能——アンカーが唯一の砦。
  `{0,40}` 窓で `let data: unknown` → try 内代入の分離形と `const data: unknown = JSON.parse(json)` 形の
  両スタイルを許容）／存在 `\)[ \t]*:[ \t]*\w+[ \t]+is[ \t]+ApiResponse\b`／
  不存在 `\bas[ \t]+ApiResponse\b`・`\bany\b`（046 で全廃した any の再侵入防止）。
- **宣言形は「let 分離＋try は JSON.parse の1行だけ」を正とする（実装時に E-2 から変更）**:
  レビューE-2 の「const を try 内で宣言と代入を同時に」の形は、try が検証後のコードまで包むため、
  **「検証しない型述語」チート答案のクラッシュが catch で null に化け、③の不正データ検査が偽陽性になる**
  ことが実装中に判明した。try の範囲を JSON.parse に絞れば、検証漏れはクラッシュとして③に表面化する。
  「パースの失敗と形の違いは別の失敗——catch の範囲を絞るのは実務の作法」として教材にも明文化（047 description）。
- ③ 4本: 正常JSON→値／フィールド欠落JSON→null（**旧コードはクラッシュ＝バグ修正の証明**）／
  壊れたJSON→null（try/catch 必須を challenge に明記）／046 範囲の回帰1本。
- ①必然性ゲート: unknown 化で絞り込みなしアクセスが strict エラー（042 同型）。
- WRONG: コメントバイパス／検査なし型述語（return true→③欠落ケースで落ちる）／キャスト温存。

**048-roles-single-source「二重管理の解消 — 挙動を変えないリファクタ」（卒業課題）**

- 学び: `type Role = "admin" | "editor" | "viewer"` と `const ROLES = [...]` が別々に手書きされている実務あるあるを、
  `as const`＋`type Role = (typeof ROLES)[number]` の単一情報源に統合。
  **③テストは改修前後で完全に同一**＝「挙動を変えないリファクタを既存テストが守る」総仕上げ（description で明言）。
- initialCode（約20行）: 二重管理コード＋動作する `isRole` 等の周辺コード（仮実装でなく「動くが脆い」コードからの出発）。
- ②structure: `ROLES[ \t]*=[ \t]*\[[^\]]*\][ \t\r\n]*as[ \t]+const\b`
  （**ROLES 名アンカー**。`const _dummy = [] as const` ダミー封鎖）／
  `type[ \t]+Role[ \t]*=[ \t]*\(?[ \t]*typeof[ \t]+ROLES[ \t]*\)?[ \t]*\[[ \t]*number[ \t]*\]`／
  **不存在 `type[ \t]+Role[ \t]*=[ \t\r\n|]*"`**（手書きUnion形の撤去確認。
  **structure には引用符が残る**ためこの形は structure で検査でき、raw 不存在より
  (a) 先頭 `|` スタイル・順序入れ替えに頑健 (b) 無害なメモ文字列での偽陽性不合格がない）。
- ③ 3本（改修前後で同一）: `isRole("admin")===true`／`isRole("guest")===false`／ROLES の内容と順序不変。
- ①: 手書きUnion 温存は derived `type Role` と重複識別子でエラー（実質不能）。
- WRONG: コメントバイパス／ダミー as const／`as const` だけ付けて手書きUnion温存。

### 6. 検証戦略

- **verify-lessons.cjs**: SOLUTIONS 9本＋WRONG（コメントバイパス必須＋ダミー構文バイパス必須＋レッスン固有）＋
  **連作整合チェック新設**（4-4）＋**形式整合チェック新設（レビューE-3）**:
  040+ のレッスンは `scenario`/`requirements` 必須・039 以前は両フィールド禁止
  （optional フィールドが許す不正状態を、閉じた静的カタログに対するデータ検証で塞ぐ＝型レベル保証の代替）。
  可能なら「バッククォート内に『。』」の静的検査も1関数追加。
- **verify-strict.cjs**: 模範解答9本クリーン。**044 のみ initialCode に意図的 strict エラー3箇所**を設計どおりとして登録（027 前例）。
- **vitest**: insights の practical-master（0本ガード含む）/ all-complete 48本化のテスト増分＋
  **scenario.ts の整合テスト（レビューE-3）**: catalog の practical 全レッスンが getScenarioInfo で引ける・
  マップに catalog 外 ID がない・step/total が配列位置と一致。
  ProblemPane の DOM テストは @testing-library 未導入のため**追加しない**（導入はスコープ外）。
- **E2E（Supabase 非依存域で可能なもの）**: ホームに「実践」セクション見出し（件数アサーションはカタログ駆動で自動追従）／
  **040 ゲストアクセス→/login リダイレクト**（middleware は getUser 失敗時 user=null になるためダミー env で検証可能）／
  既存レッスン 001 で新セクション（🎫依頼等）が**表示されない**こと。
- **実践レッスンページの実描画はログイン必須のため E2E 対象外**→ローカル目視（スクリーンショット）＋本番確認で担保
  （「ゲート全緑でも見た目は別」の既存運用。グラフ棒事故の教訓）。

### 7. 変更ファイル一覧

**新規**: 本書／`src/lib/lessons/scenario.ts`／`src/lib/lessons/data/040-*.ts`〜`048-*.ts`（9本）

**変更**: `src/types/index.ts`（optional 2フィールド）／`src/lib/lessons/level.ts`／`src/lib/lessons/catalog.ts`／
`src/components/lesson/ProblemPane.tsx`／`src/components/lesson/LessonWorkspace.tsx`／
`src/components/home/LessonList.tsx`（**実践セクション内のシナリオ小見出しのみ**・2-5。レビューC-3で
「変更しない」から移動。レベルセクション自動出現自体は LEVEL_ORDER 駆動で従来どおり）／
`src/lib/progress/insights.ts`＋`insights.test.ts`／`src/lib/lessons/scenario.ts` の整合テスト（vitest）／
`scripts/verify-lessons.cjs`／`scripts/verify-strict.cjs`／
`tests/e2e/home.spec.ts`（＋リダイレクト検証の置き場所は実装時に home/lesson spec を判断）

**変更しない（保証込み）**: `src/proxy.ts`（≥4 ゲートで自動カバー）／`RetentionPanel.tsx`（バッジ配列表示のみ）／`src/lib/judge/**`・
`src/workers/judge.worker.ts`・サニタイザミラー（**変更ゼロが本設計の核**）／`src/app/sitemap.ts`・`robots.ts`／
`src/lib/progress/actions.ts`（lesson_id 検証は getCatalogList 由来で自動追従）／DBスキーマ・マイグレーション。

### 8. リリース計画

- **実装はスタックPR 4本**（C項目の運用踏襲・マージ順固定）:
  PR-1 形式基盤（型/level/scenario.ts/ProblemPane/バッジ（0本ガード付き）/E2E増分——この時点でレッスン0本でも
  既存39本に無影響・ホームにも何も出ない）→
  PR-2 シナリオA → PR-3 シナリオB → PR-4 シナリオC（各PRで verify×2・vitest・E2E 緑）。
  **PR-2 はそれ単独で本番リリース可能な増分**であり、着地時に一度本番計測する中間判断点を持てる（レビューP-3）。
  PR-2 着地時に**モバイル/狭幅の実機確認を必須**とする（LessonWorkspace の2ペイン横並びは
  レスポンシブ分岐がなく、実践の長い問題文・initialCode は悪化要因。必要なら既存スコープの別Issueへ。レビューC-4）。
- **9本で小さく出す**: 最小拡張案の4ステップ×3シナリオ=12本案は見送り。
- **計測は二本立て（レビューP-1）**: 到達・離脱ファネル＝Vercel Analytics（ページビュー）、
  **完了＝progress テーブルの DB 集計**（lesson_id 040+。完了イベントは Analytics では取れない）。
  **判断閾値を公開前に確定**する（事後合理化の防止）。仮置き案: 公開4週間で
  「040 到達者のうちシナリオA完走 ≥40% → 増補着手／20-40% → 文言・難度改善して再計測／<20% → 形式再設計」
  ——**数値はオーナー合意で確定すること**。
- 👑バッジ退行の再受容と告知検討を意思決定ログに記録（1-参照）。

## 学びポイント（オーナー向け）

- 実務の3フローは判定エンジンの3層にきれいに対応する: **新規開発=②が要件、機能追加=①が修正箇所のリスト、改修=③が回帰スイート**。
- 「書いてはいけないもの（any・as キャスト・手書き重複）の**不存在チェック**」は、コメントにも文字列にも偽装できない最強の②。
- never 網羅性は1関数のテクニックではなく「**変更の影響範囲をコンパイラに列挙させる仕組み**」——複数関数に波及させて初めて実務の価値が伝わる（044）。
- ②の存在チェックは**対象の名前にアンカー**しないとダミー構文で満たせる。「何が書かれたか」だけでなく「どこに書かれたか」を縛る。
- 非同期の検証はタイマーではなく**呼び出し回数を数えるモックPromise**——決定的で、タイムアウト予算とも無関係になる。
- レビューの教訓: ①strict は「正しく解く人へのガイド」であって「チートを防ぐゲート」ではない。アンカーを②③で削除不能にして初めてゲートになる。

## 関連

- **部署レビュー記録: `curriculum-practical-review.md`**（4部署の判定・指摘全文・対応マッピング。本書 v1.1 の差分根拠）
- 上級設計: `curriculum-advanced.md`（仮実装パターン・structure/raw 二層規約の正本）
- 中級設計: `curriculum-intermediate.md`（判定の凡例・ネガティブ①を判定列に載せない原則）
- 判定エンジン: `2026-06-09-judge-false-positive.md`（②規約・サニタイザ仕様・残存リスク受容）
- 定着支援: `retention-features.md`（バッジ・復習導線の正本。実践マスター追加で更新が必要）
- 意思決定: `.company/secretary/notes/2026-06-12-decisions.md`（形式2案の審査記録）
