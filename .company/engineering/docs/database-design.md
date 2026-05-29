---
created: "2026-05-27"
status: approved
phase: "Phase 4-2 データベース設計"
depends_on: "engineering/docs/tech-stack.md（Phase 4-1）"
---

# データベース設計書（Supabase / Postgres）

> Phase 4-2（DB設計）の正本。ERD・テーブル定義・RLS方針・TypeScript型対応を確定する。
> 前提: 認証=Supabase Auth（GitHub/Google OAuth）、レッスン=MDX（Git管理）、進捗=正解時のみ保存（Phase 2/3-3で既決）。

---

## 概要

MVPのDBに保存するのは **「誰が・どのレッスンを・いつ完了したか」だけ**。
レッスンの中身（問題文・初期コード・テストケース・ヒント・模範解答）は **MDX（Git管理）が正本**なのでDBには持たない。

| テーブル | 役割 | 行の単位 |
|---------|------|---------|
| `auth.users` | 認証情報（Supabase管理・**触らない**） | 1ユーザー |
| `public.profiles` | 表示名・アバター等の公開プロフィール | 1ユーザー（auth.usersと1:1） |
| `public.lesson_progress` | 完了したレッスンの記録 | 1完了（user × lesson） |

この3つだけ。`courses` / `lessons` テーブルは **意図的に作らない**（理由は後述）。

---

## なぜこの設計か

### 制約条件（上流から継承）

- **レッスンの正本はGit/MDX**（Phase 2 ブロッカー#3で確定）→ レッスンメタ情報をDBに置くと**正本が二重化**し、MDX追加のたびにDB INSERTが必要になる
- **進捗は正解時のみ保存**（Phase 3-3 判定API契約）→ 保存対象は「完了イベント」だけで十分
- **ゲストは最初の3レッスンをlocalStorageで試用、DB保存なし**（Phase 3-3）→ DBはログインユーザーの永続化のみ担当
- **個人開発・運用コスト最小**（PM/開発部門スタンス）→ テーブル数とポリシーは最小に絞る

### 最重要判断: `lessons` / `courses` テーブルを作らない

レッスンの存在・順序・所属コースは **MDXカタログ（`content/lessons/*.mdx`）から導出**する。DBの `lesson_progress` は `lesson_id` / `course_id` を **ただのTEXT**として持ち、MDXのファイル名連番（`001`〜）と一致させる。

**理由（論理）**:
1. MDXを正本と決めた以上、同じ情報をDBにも持つと「Gitとテーブルのどちらが正しいか」という同期問題が必ず生まれる。単一の正本を保つことが整合性の根本。
2. 進捗計算に必要な「総レッスン数」はMDXカタログの件数から得られる。DBに件数を問い合わせる必要がない。
3. MVPは1コース10レッスン。FK制約で守る規模の参照整合性問題が、そもそも発生しにくい。

**トレードオフ（受け入れるコスト）**:
- `lesson_id` にDBレベルのFK制約がない → 存在しないレッスンIDも技術的には挿入できる。
- **緩和策**: アプリ層で「MDXカタログに存在するIDか」を保存前に検証する。RLSで「自分の行しか書けない」ことは別途保証されるので、悪用面は限定的。

**分岐条件（この判断を見直すとき）**:
- サーバー側でレッスン横断クエリが必要になったら（例: 「どのレッスンが最も不正解が多いか」の分析、管理画面でのDB編集型CMS化）→ そのとき初めて `lessons` テーブルを追加する。それまでは不要。

### `profiles` をなぜ分けるか

`auth.users` はSupabaseが管理する領域で、メールアドレスやOAuth生メタデータを含む。アプリから安全に読める公開情報（表示名・アバター）は `public.profiles` に切り出すのがSupabaseの定石。`auth.users` を直接JOINしない設計にすることで、認証基盤の内部構造にアプリが依存しなくなる。

### `course_id` を今から持つ理由

MVPは1コース（`beginner`）だが、進捗は本質的に「コース単位」の概念。v1.0/v2.0でコースが増えたときに**マイグレーション不要**にするため、TEXT 1列を先に持っておく。列1つ追加のコストはゼロに近く、後付けマイグレーションより安い。

---

## 詳細

### ERD

```
┌─────────────────────┐
│  auth.users         │  ← Supabase Auth が管理（GitHub/Google OAuth）
│  (Supabase managed) │
│  id (uuid) PK       │
└──────────┬──────────┘
           │ 1:1（トリガで自動生成）
           ▼
┌─────────────────────┐
│  public.profiles    │
│  id (uuid) PK/FK ───┼──→ auth.users.id
│  display_name       │
│  avatar_url (null)  │
│  created_at         │
└──────────┬──────────┘
           │ 1:N
           ▼
┌──────────────────────────────┐
│  public.lesson_progress      │
│  user_id (uuid) FK ──────────┼──→ profiles.id
│  course_id (text)            │··· 'beginner'（MDXカタログ由来・FKなし）
│  lesson_id (text)            │··· '001'（MDXファイル連番・FKなし）
│  completed_at (timestamptz)  │
│  PK (user_id, lesson_id)     │
└──────────────────────────────┘

［ MDXカタログ = content/lessons/*.mdx ］  ← Git管理・DB外
   course_id / lesson_id は論理参照（FKなし・アプリ層で検証）
```

### テーブル定義（DDL）

```sql
-- profiles: auth.users の公開プロフィール拡張（1:1）
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url   text,                              -- null許容（アバター未設定）
  created_at   timestamptz not null default now()
);

-- lesson_progress: 「完了したレッスン1件 = 1行」
create table public.lesson_progress (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  course_id    text not null,                     -- 'beginner'（MDXカタログ由来）
  lesson_id    text not null,                     -- '001'（MDXファイル連番）
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)                -- 自然キー（同じレッスンの重複完了を防ぐ）
);

-- 進捗一覧の取得は user_id で絞るので索引を張る
create index lesson_progress_user_idx on public.lesson_progress (user_id);
```

> **なぜ複合PK `(user_id, lesson_id)` か**: 「同じユーザーが同じレッスンを2回完了行で持つ」状態は無意味。自然キーで重複を構造的に禁止でき、サロゲートidも不要。upsertの衝突キーにもそのまま使える。

### RLSポリシー（行レベルセキュリティ）

Supabaseでは **RLSを有効化しないと anon キーで全行が読める**。必ず有効化し、「自分の行だけ」に絞る。

```sql
-- 両テーブルでRLSを有効化（これを忘れると公開DBになる）
alter table public.profiles        enable row level security;
alter table public.lesson_progress enable row level security;

-- profiles: 自分の行だけ読める・更新できる
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- lesson_progress: 自分の進捗だけ全操作できる
create policy "progress_select_own"
  on public.lesson_progress for select
  using (auth.uid() = user_id);

create policy "progress_insert_own"
  on public.lesson_progress for insert
  with check (auth.uid() = user_id);

create policy "progress_update_own"
  on public.lesson_progress for update
  using (auth.uid() = user_id);

create policy "progress_delete_own"
  on public.lesson_progress for delete
  using (auth.uid() = user_id);
```

> **`using` と `with check` の違い（学び）**: `using` は「既存行のうちどれが見える/操作対象か」のフィルタ、`with check` は「新しく書き込む行が満たすべき条件」。INSERTは既存行がないので `with check` を使う。これを取り違えると「挿入はできるが他人のIDを詐称できる」穴になる。

### プロフィール自動生成トリガ

`auth.users` に新規ユーザーが入った瞬間に `profiles` を作る。OAuthのメタデータから表示名・アバターを拾う。

```sql
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public   -- RLSを越えてINSERTするため
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'user_name',   -- GitHub: ログイン名
      new.raw_user_meta_data ->> 'full_name',   -- Google: 氏名
      new.raw_user_meta_data ->> 'name',
      'ユーザー'                                  -- どれも無ければ既定値
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',  -- GitHub
      new.raw_user_meta_data ->> 'picture'      -- Google
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

> **なぜ `security definer` か**: トリガはサインアップ処理の途中で走り、その時点では「自分の行をINSERTできるセッション」が確立していない。関数を所有者権限で実行することでRLSを越えてINSERTする、Supabase公式の定石。`search_path` を固定するのは権限昇格経路を塞ぐ安全策。

### TypeScript型との対応（開発部門ルール: 型と設計を一致させる）

```typescript
// DBの行（Supabaseは snake_case を返す → アプリ境界で camelCase へマップ）
type Profile = {
  id: string             // = auth.users.id
  displayName: string
  avatarUrl: string | null   // DBの null許容を型に正直に反映する
  createdAt: string          // ISO文字列
}

type LessonProgress = {
  userId: string
  courseId: string       // 'beginner'
  lessonId: string       // '001'
  completedAt: string
}

// Phase 3-3 で確定済みの User 型は、profiles の部分ビュー
type User = Pick<Profile, 'id' | 'displayName'> & { avatarUrl: string }
```

> 実装では `supabase gen types` で `Database` 型を自動生成し、`Database['public']['Tables']['lesson_progress']['Row']` を正本にする。手書き型とスキーマのズレを型で検出できる（`any` を使わない開発部門スタンスの実践）。

### 進捗率の計算（DBに件数を聞かない）

```typescript
// なぜ: 総レッスン数の正本はMDXカタログ（Git）。DBはカウントの正本ではない。
const total = lessonCatalog.length          // content/lessons/*.mdx の件数
const done  = progressRows.length           // lesson_progress の自分の行数
const pct   = total === 0 ? 0 : Math.round((done / total) * 100)
```

### ゲスト進捗のログイン時マージ

ゲストが1〜3レッスンをlocalStorageで完了 → ログインした瞬間にDBへ移す。

```typescript
// 複合PK (user_id, lesson_id) を衝突キーにしたupsert。
// 既にDBにあれば何もしない（completed_atは初回完了時を尊重しても上書きでも実害なし）。
await supabase.from('lesson_progress').upsert(
  guestCompletedLessonIds.map((lessonId) => ({
    user_id: userId,
    course_id: 'beginner',
    lesson_id: lessonId,
  })),
  { onConflict: 'user_id,lesson_id' },
)
```

---

## 学びポイント（TypeScript学習との相乗効果）

- **`string | null` を型に正直に書く**: `avatar_url` がnull許容なら型も `string | null`。`profile.avatarUrl ?? '/default-avatar.png'` で既定値を与える練習になる（`??` と `||` の違い＝null/undefinedだけに反応するか）。
- **`Pick` / ユーティリティ型**: `User` を `Profile` から `Pick` で導出すると、Profile変更時にUserが自動追従する。型の単一正本化。
- **自動生成型を正本にする**: `supabase gen types` の出力を真実とし、アプリ型をそれに合わせる。「スキーマ→型」の一方向依存は、手書き重複を型エラーで防ぐ良い設計練習。
- **境界でのマッピング**: DB(snake_case) と アプリ(camelCase) の変換は「型の境界」。ここに型を付ける意識は、外部データを信用しないTypeScript設計の核。

### 参考リンク（一次情報）

- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase: profiles テーブルとトリガの定石: https://supabase.com/docs/guides/auth/managing-user-data
- `supabase gen types typescript`: https://supabase.com/docs/guides/api/rest/generating-types
- Postgres `ON CONFLICT`（upsert）: https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT

---

## 次ステップ（このドキュメントの範囲外）

- **Phase 4-3**: ディレクトリ構成・コンポーネント設計・API設計・状態管理方針
- **Phase 5冒頭スパイク**: ローカルSupabase（`supabase start`）で本DDL+RLSを適用し、「ログイン→profiles自動生成→progress upsert→自分の行だけ読める」を1往復で確認する
