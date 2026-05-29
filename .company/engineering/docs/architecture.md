---
created: "2026-05-27"
status: approved
phase: "Phase 4-3 アーキテクチャ設計"
depends_on: "tech-stack.md（4-1）/ database-design.md（4-2）/ Notion🧩コンポーネントリスト"
---

# アーキテクチャ設計書（ディレクトリ / コンポーネント / API / 状態管理）

> Phase 4-3の正本。Phase 5で「どこに・何を・どの責務で置くか」を迷わないための地図。
> コンポーネントProps型の正本は Notion「🧩 コンポーネントリスト」。本書はその配置・境界・データフローを確定する。

---

## 概要

App Router を選んだ時点で、設計の背骨は **「サーバー/クライアントの境界をどこに引くか」** に決まる。この1本の線が、バンドルサイズ・認可・データ取得の全てを支配する。

本書で確定する4点:

| # | 項目 | 結論（要点） |
|---|------|-------------|
| A | ディレクトリ構成 | `src/app`（ルート）/ `src/components`（🧩準拠4分類）/ `src/lib`（判定・診断・supabase・進捗）/ `content/lessons`（MDX正本） |
| B | サーバー/クライアント境界 | ページはServer Componentでデータ取得＋認可。対話部分だけClient Container `LessonWorkspace` に閉じ込める |
| C | API設計 | **判定APIは存在しない**（完全クライアントサイド）。サーバー越境は Server Actions（進捗）と OAuthコールバックのみ |
| D | 状態管理 | 判定フローは **判別ユニオンの reducer ステートマシン**。サーバー状態はRSC直読み。Zustandは不採用 |

---

## なぜこの設計か

### 上流からの制約（再掲・継承）

- **判定は完全クライアントサイド**（4-1）→ 「コードを送って結果をもらう」HTTP判定APIは**作らない**。`judge()` はブラウザ内のローカル関数
- **レッスンの正本はMDX/Git**（既決）→ レッスンはサーバー（ビルド時）で読む。DBには問い合わせない
- **進捗はRLSで「自分の行だけ」**（4-2）→ 進捗の読みはRSCのサーバーSupabaseクライアント、書きはServer Actionで型とサーバー検証を一枚かませる
- **ゲストは3レッスンをlocalStorage**（3-3）→ クライアント状態とサーバー状態の二系統を、ログイン時マージで橋渡しする

### 設計原理

1. **デフォルトはServer Component**。`'use client'` は「対話/状態/ブラウザAPIが要る所」にだけ付ける。Monaco・判定Worker・エディタ状態はクライアント、それ以外（MDX描画・認可・進捗取得）はサーバー。
2. **状態の所有者を1つに絞る**。レッスン画面の可変状態（コード・診断・判定結果・ヒント開示）は `LessonWorkspace` 1箇所が持ち、子は props で受けるだけ（presentational）。状態の出所が散らからない。
3. **過剰な抽象化を足さない**（開発部門スタンス）。client cacheライブラリもグローバルstoreもMVPには要らない。必要が出た時の分岐条件だけ決めておく。

---

## 詳細

### A. ディレクトリ構成

```
typescript-learning-app/
├── content/
│   └── lessons/                      # ★レッスンの正本（Git管理・DB外）
│       ├── 001-type-annotation.mdx
│       ├── 002-function-types.mdx
│       └── … (010まで)
├── src/
│   ├── app/                          # App Router（ルーティング＝ディレクトリ）
│   │   ├── layout.tsx                # ルートレイアウト（Header配置）
│   │   ├── page.tsx                  # /            LP        [Server]
│   │   ├── login/page.tsx            # /login       GitHub/Google [Server]
│   │   ├── auth/callback/route.ts    # OAuthコールバック（code交換）[Route Handler]
│   │   ├── courses/[courseId]/page.tsx  # /courses/beginner   [Server・要auth]
│   │   ├── lessons/[lessonId]/page.tsx  # /lessons/001        [Server・ゲートあり]
│   │   └── profile/page.tsx          # /profile             [Server・要auth]
│   ├── components/                   # ★分類はNotion🧩が正本
│   │   ├── layout/                   # Header, LessonLayout
│   │   ├── ui/                       # ProgressBar, Badge（+ shadcn/uiプリミティブ）
│   │   ├── lesson/                   # LessonWorkspace, ProblemPane, CodeEditor,
│   │   │                             #   ErrorPanel, JudgeButton, HintDrawer, JudgeResult
│   │   └── course/                   # LessonListItem（CourseCardはv1.0）
│   ├── lib/
│   │   ├── lessons/                  # MDXカタログのロード・型（getCatalog/getLesson）
│   │   ├── judge/                    # judge() 本体＋Step1/Step2＋Workerクライアント
│   │   ├── diagnostics/              # TSコード→日本語辞書（重要設計②・差別化の核）
│   │   ├── supabase/                 # client.ts(ブラウザ) / server.ts(RSC・Action)
│   │   └── progress/                 # guest.ts(localStorage) / actions.ts(Server Action)
│   ├── workers/
│   │   └── judge.worker.ts           # 自作Web Worker（transpile→隔離実行→terminate）
│   ├── types/
│   │   └── index.ts                  # Lesson/TestCase/JudgeRequest/Response 等（正本は🧩）
│   └── styles/
│       └── tokens.ts                 # design-tokens（as const）
├── supabase/
│   └── migrations/                   # 4-2のDDL+RLSをSQLで版管理
├── middleware.ts                     # 保護ルートのセッション判定（001-003は通す）
├── next.config.mjs                   # MDX（next-mdx-remote相当）設定
├── tailwind.config.ts                # tokens.ts をテーマに流用
└── tsconfig.json                     # strict / paths "@/*"
```

> **なぜ `lib/` を機能で割るか**: `judge` `diagnostics` `progress` は本アプリの「ドメイン」。技術種別（utils/helpers）でなくドメインで割ると、「日本語診断を直したい」が一発で `lib/diagnostics/` に着地する。フォルダが仕様の地図になる。

### B. サーバー/クライアント境界（設計の背骨）

レッスン画面を例に、境界を図示する:

```
app/lessons/[lessonId]/page.tsx        ← Server Component
  ├─ 1. getLesson(lessonId)            ← MDXカタログ（Git）から読む
  ├─ 2. 認可ゲート: 004以降は未ログインなら /login へ
  ├─ 3. getProgress(user)              ← サーバーSupabase（RLS）で進捗取得
  └─ <LessonWorkspace                  ← Client Container（状態の所有者）
        lesson={meta} initialDone={...}>
          {/* ProblemPaneのMDXはサーバーで描画し children で差し込む */}
          <ProblemPane title=… description=… />
       </LessonWorkspace>
```

ポイント:
- **MDXはサーバーで描画**し、Client Component に `children` として渡す。Monaco（重い・`window`前提）だけがクライアントに乗り、問題文の描画コストはサーバーに残る。
- **認可と秘匿情報はサーバーに閉じる**。Supabaseのサーバークライアントはブラウザに出ない。
- Client境界に入るのは `LessonWorkspace` 配下のみ:

```typescript
// components/lesson/CodeEditor.tsx などは 'use client'
// page.tsx は 'use client' を付けない（＝Server Componentのまま）
const CodeEditor = dynamic(() => import('./CodeEditor'), { ssr: false })
// なぜ ssr:false: Monaco は document/window 前提でSSR不可。かつ初期バンドルを軽くする。
```

### C. コンポーネント設計（責務分離）

Props型は🧩が正本。本書は **container 1点を新設**し、責務を「状態を持つ container」と「propsだけの presentational」に二分する。

```
LessonWorkspace（container・'use client'・状態の唯一の所有者）
├─ ProblemPane      （presentational・MDX描画／サーバー由来）
├─ CodeEditor       （presentational・Monaco・onChangeで上へ通知）
├─ ErrorPanel       （presentational・errorsが0なら非表示）
├─ JudgeButton      （presentational・onJudge/disabled）
├─ HintDrawer       （presentational・hints/isOpen/onClose）
└─ JudgeResult      （presentational・result/onNext）
```

新設する container の型（🧩の既存型に追加するのはこれだけ）:

```typescript
// なぜ container を1枚足すか: page.tsx(Server) は状態を持てない。
// 可変状態の所有者をここに集約し、子は純粋なpresentationalに保つ＝テスト容易。
type LessonWorkspaceProps = {
  lesson: Lesson           // MDXから取得済みのメタ（initialCode/testCases/hints/answer含む）
  initialDone: boolean     // この人がこのレッスンを完了済みか（進捗の初期値）
  isGuest: boolean         // ゲストなら完了時にlocalStorage、ログイン済みならServer Action
  children: React.ReactNode // サーバー描画したProblemPane等を差し込む
}
```

既存Props（🧩準拠・抜粋）はそのまま使う: `CodeEditorProps` `ErrorPanelProps`(=`{errors: TypeScriptDiagnostic[]}`) `JudgeButtonProps` `HintDrawerProps` `JudgeResultProps`。

> **`JudgeResponse` と `JudgeResultType` の関係（重要な型の使い分け）**:
> `judge()` の戻り値は3状態の `JudgeResponse`（`correct | incorrect | type_error`）。
> 一方 `JudgeResult` コンポーネントが受けるのは2状態の `JudgeResultType`（`correct | incorrect`）。
> `type_error` は **ErrorPanel側で処理**し結果パネルには来ない（型エラー中はJudgeButtonがdisabled）。
> workspace内で `if (res.status === 'type_error') { … } else { /* ここで型はJudgeResultTypeに絞られる */ }` と**判別ユニオンで安全に振り分ける**。

### D. API設計

最も重要な設計判断は **「判定APIが存在しないこと」**。完全クライアントサイド判定の必然の帰結。サーバーを越える通信は2種類だけ。

| 種別 | 実体 | 入力 → 出力 | 場所 |
|------|------|------------|------|
| 判定 | **ローカル関数**（HTTPなし） | `judge(req: JudgeRequest): Promise<JudgeResponse>` | `lib/judge/`（ブラウザ内） |
| 進捗・書き | **Server Action** | `markLessonComplete(lessonId: string): Promise<Progress>` | `lib/progress/actions.ts` |
| 進捗・読み | サーバーSupabase直読み | RSC内で `select`（RLS適用） | `page.tsx`（Server） |
| 認証 | **Route Handler** | OAuth `code` → セッション交換 | `app/auth/callback/route.ts` |

判定の関数契約（HTTPでなく型で固める・3-3の契約をそのまま実装）:

```typescript
// lib/judge/index.ts — サーバー往復ゼロ。
export async function judge(req: JudgeRequest): Promise<JudgeResponse> {
  // Step1: Monacoが既に動かしているTSワーカーの診断を再利用
  const diagnostics = await collectDiagnostics(req.code)   // TypeScriptDiagnostic[]
  if (diagnostics.length > 0) return { status: 'type_error', diagnostics }
  // Step2: 自作Web Workerで transpile→隔離実行→TestCase突合（タイムアウトでterminate）
  return runTestsInWorker(req)                              // correct | incorrect
}
```

進捗書きをServer Actionにする理由（4-2のトレードオフをここで回収）:

```typescript
// lib/progress/actions.ts
'use server'
export async function markLessonComplete(lessonId: string): Promise<Progress> {
  // ★4-2で「lesson_idにFKなし」と決めた穴を、サーバー側のカタログ検証で塞ぐ
  if (!getCatalog().has(lessonId)) throw new Error(`unknown lesson: ${lessonId}`)
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthorized')
  await supabase.from('lesson_progress').upsert(
    { user_id: user.id, course_id: courseOf(lessonId), lesson_id: lessonId },
    { onConflict: 'user_id,lesson_id' },     // 複合PK衝突キー（4-2）
  )
  return computeProgress(user.id)             // { completedLessons, totalLessons }
}
```

> **なぜ直Supabaseでなく Server Action か**: RLSだけでも安全だが、Server Actionを挟むと「存在しないlesson_idを弾く」サーバー検証を一点に置ける（FKの代わり）。かつ呼び出し側は型付き関数を `await` するだけで、エンドポイントURLもfetchも書かない。

保護ルートは `middleware.ts` で一括判定:

```typescript
// 公開: / , /login , /lessons/001〜003（ゲスト試用）
// 保護: /courses* , /profile , /lessons/004以降 → 未ログインは /login?redirect=…
// lessonIdの数値を見て001-003だけ通す分岐をここに集約する
```

### E. 状態管理方針

**サーバー状態**（進捗・セッション）: RSCで取得しpropsで降ろす。再取得は `revalidatePath` で十分。client cacheライブラリ（TanStack Query等）は**MVP不採用**。

**ワークスペースUI状態**: `LessonWorkspace` 内の `useReducer`。判定フローは小さなステートマシンなので、判別ユニオンで表す:

```typescript
// 状態自体を判別ユニオンに（不正な組合せを型で作れないようにする）
type WorkspaceState = {
  code: string
  diagnostics: TypeScriptDiagnostic[]
  hintsOpened: number                 // 開示済みヒント数（0〜hints.length）
  judge:
    | { phase: 'idle' }
    | { phase: 'judging' }
    | { phase: 'done'; result: JudgeResponse }
}

type WorkspaceAction =
  | { type: 'CODE_CHANGED'; code: string }
  | { type: 'DIAGNOSTICS_UPDATED'; diagnostics: TypeScriptDiagnostic[] }
  | { type: 'JUDGE_START' }
  | { type: 'JUDGE_DONE'; result: JudgeResponse }
  | { type: 'OPEN_NEXT_HINT' }
  | { type: 'RESET' }
// reducer内の switch(action.type) で各ケースのpayloadが型安全に絞られる
```

**ゲスト進捗**: `lib/progress/guest.ts` が `localStorage` を薄くラップ（`getGuestProgress / addGuestCompleted`）。ログイン直後に `markLessonComplete` 相当のupsertでDBへマージ（4-2記載）。

**Zustand**: MVP不採用。**分岐条件** = 「ルートをまたいで共有したいクライアント状態」（例: 全画面通知、横断的なエディタ設定）が出現したら導入。それまで `useReducer` + props で足りる。

---

## 学びポイント（TypeScript学習との相乗効果）

- **RSC境界＝型と秘密の壁**: Server Componentのコード（Supabaseサーバーキー等）はブラウザに出ない。`'use client'` を境界として意識することは、「どの型がネットワークを越えるか」を考える訓練になる。
- **判別ユニオンのステートマシン**: `WorkspaceState.judge` を `idle|judging|done` のユニオンにすると「judging中なのにresultがある」という不正状態を**型で作れなくする**。`JudgeResponse` と同じパターンの再利用。
- **Server Action = 型付きRPC**: 入力と戻り値に型が付いたサーバー関数を `await` するだけ。fetch・URL・JSONパースの定型と、その型崩れが消える。
- **container / presentational 分離**: 状態を持つのはcontainerだけ。子はpropsだけの純関数的コンポーネントになり、Storybookや単体テストが「propsを渡して見た目を確認」で済む（Kent C. Dodds的＝実装でなく振る舞いをテスト）。
- **`Pick` による型の派生**: `LessonListItemProps.lesson` は `Pick<Lesson,'id'|'title'>`。一覧に重い `testCases` まで渡さない＝必要な形だけを型で要求する。

### 参考リンク（一次情報）

- Server / Client Components（Next.js）: https://nextjs.org/docs/app/building-your-application/rendering
- Server Actions と Mutations: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
- Supabase Auth Helpers（Next.js / middleware）: https://supabase.com/docs/guides/auth/server-side/nextjs
- `useReducer`（React）: https://react.dev/reference/react/useReducer

---

## 次ステップ（このドキュメントの範囲外＝Phase 5）

- **5-1 環境構築**: Next.js初期化・strict・Biome/ESLint・`supabase/migrations` に4-2のDDL投入
- **5冒頭スパイク**（最優先・推奨）: ①Monacoが`ssr:false`で描画 ②1件の型エラーが日本語でErrorPanelに出る ③1件のTestCaseが`judge.worker.ts`で合否を返す。この3点で完全クライアントサイド判定の不確実性を消す
- **5-2 コア実装**: `LessonWorkspace` の reducer → `judge()` → `JudgeResult` の一気通貫を最初の1レッスンで通す
