-- 실행 후 update profiles set role='owner' where id='<uuid>'; 를 수동 실행하세요.
-- 새 Supabase 프로젝트의 SQL Editor에서 이 파일 전체를 한 번 실행합니다.
begin;
create extension if not exists pgcrypto;

create type public.user_role as enum ('owner', 'member');
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.user_role not null default 'member',
  created_at timestamptz not null default now()
);
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content_html text not null,
  tags text[] not null default '{}',
  link_url text,
  link_title text,
  link_description text,
  link_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_created_at_idx on public.posts (created_at desc, id desc);
create index posts_tags_idx on public.posts using gin (tags);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger on_post_updated before update on public.posts
for each row execute function public.set_updated_at();

create function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'owner'
  );
$$;
revoke all on function public.handle_new_user() from public;
revoke all on function public.set_updated_at() from public;
revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_update_self" on public.profiles for update to authenticated using (id = auth.uid());
create policy "posts_select" on public.posts for select to authenticated using (true);
create policy "posts_insert_owner" on public.posts for insert to authenticated with check (public.is_owner() and author_id = auth.uid());
create policy "posts_update_owner" on public.posts for update to authenticated using (public.is_owner());
create policy "posts_delete_owner" on public.posts for delete to authenticated using (public.is_owner());

-- RLS limits rows, not columns. Prevent members from promoting their own role.
revoke all on public.profiles, public.posts from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select, insert, update, delete on public.posts to authenticated;

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', false) on conflict do nothing;
create policy "post_images_select" on storage.objects for select to authenticated
using (bucket_id = 'post-images');
create policy "post_images_insert_owner" on storage.objects for insert to authenticated
with check (bucket_id = 'post-images' and public.is_owner());
create policy "post_images_update_owner" on storage.objects for update to authenticated
using (bucket_id = 'post-images' and public.is_owner())
with check (bucket_id = 'post-images' and public.is_owner());
create policy "post_images_delete_owner" on storage.objects for delete to authenticated
using (bucket_id = 'post-images' and public.is_owner());
commit;
