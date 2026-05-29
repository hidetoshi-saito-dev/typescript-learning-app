-- ============================================================
-- Phase 4-2 DB設計書準拠の初期マイグレーション
-- profiles: auth.users と 1:1 の公開プロフィール
-- lesson_progress: 完了したレッスン記録（複合PK）
-- ============================================================

-- profiles テーブル
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- lesson_progress テーブル
create table public.lesson_progress (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  course_id    text not null,
  lesson_id    text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index lesson_progress_user_idx on public.lesson_progress (user_id);

-- RLS 有効化
alter table public.profiles        enable row level security;
alter table public.lesson_progress enable row level security;

-- profiles ポリシー
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- lesson_progress ポリシー
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

-- auth.users 新規登録時に profiles を自動生成するトリガ
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'user_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      'ユーザー'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
