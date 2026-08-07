begin;

create extension if not exists pgcrypto;

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  entry_html text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_files (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  relative_path text not null,
  storage_path text not null unique,
  mime_type text not null,
  created_at timestamptz not null default now(),
  unique (site_id, relative_path)
);

create index if not exists sites_user_id_idx on public.sites(user_id);

alter table public.sites enable row level security;
alter table public.site_files enable row level security;

revoke all on public.sites, public.site_files from anon, authenticated;
grant select, insert, update, delete on public.sites, public.site_files to authenticated;

create policy "sites_select_own" on public.sites
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "sites_insert_own" on public.sites
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "sites_update_own" on public.sites
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "sites_delete_own" on public.sites
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "site_files_select_own" on public.site_files
for select to authenticated
using (exists (
  select 1
  from public.sites as site
  where site.id = site_files.site_id
    and site.user_id = (select auth.uid())
));

create policy "site_files_insert_own" on public.site_files
for insert to authenticated
with check (exists (
  select 1
  from public.sites as site
  where site.id = site_files.site_id
    and site.user_id = (select auth.uid())
));

create policy "site_files_update_own" on public.site_files
for update to authenticated
using (exists (
  select 1
  from public.sites as site
  where site.id = site_files.site_id
    and site.user_id = (select auth.uid())
))
with check (exists (
  select 1
  from public.sites as site
  where site.id = site_files.site_id
    and site.user_id = (select auth.uid())
));

create policy "site_files_delete_own" on public.site_files
for delete to authenticated
using (exists (
  select 1
  from public.sites as site
  where site.id = site_files.site_id
    and site.user_id = (select auth.uid())
));

create or replace function public.set_sites_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sites_set_updated_at on public.sites;
create trigger sites_set_updated_at
before update on public.sites
for each row
execute function public.set_sites_updated_at();

insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do update set public = excluded.public;

create policy "site_assets_insert_own" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'site-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.sites as site
    where site.id::text = (storage.foldername(name))[2]
      and site.user_id = (select auth.uid())
  )
);

create policy "site_assets_update_own" on storage.objects
for update to authenticated
using (
  bucket_id = 'site-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.sites as site
    where site.id::text = (storage.foldername(name))[2]
      and site.user_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'site-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.sites as site
    where site.id::text = (storage.foldername(name))[2]
      and site.user_id = (select auth.uid())
  )
);

create policy "site_assets_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id = 'site-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.sites as site
    where site.id::text = (storage.foldername(name))[2]
      and site.user_id = (select auth.uid())
  )
);

commit;
