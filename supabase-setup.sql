create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  requester text not null check (char_length(requester) between 1 and 50),
  type text not null check (type in ('Película', 'Serie')),
  year integer check (year is null or year between 1888 and 2100),
  image text not null default '',
  status text not null default 'Pendiente' check (status in ('Pendiente', 'En búsqueda', 'Agregada', 'Disponible')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_updates (
  id uuid primary key,
  title text not null,
  type text not null,
  year integer,
  image text not null default '',
  status text not null,
  updated_at timestamptz not null
);

alter table public.requests enable row level security;
alter table public.public_updates enable row level security;
revoke all on public.requests from anon, authenticated;
revoke all on public.public_updates from anon, authenticated;
grant insert (title, requester, type, year, image) on public.requests to anon;
grant select, update, delete on public.requests to authenticated;
grant select on public.public_updates to anon, authenticated;

drop policy if exists "Public can submit requests" on public.requests;
create policy "Public can submit requests"
  on public.requests for insert to anon
  with check (status = 'Pendiente');

drop policy if exists "Admin can read requests" on public.requests;
create policy "Admin can read requests"
  on public.requests for select to authenticated using (true);

drop policy if exists "Admin can update requests" on public.requests;
create policy "Admin can update requests"
  on public.requests for update to authenticated using (true) with check (true);

drop policy if exists "Admin can delete requests" on public.requests;
create policy "Admin can delete requests"
  on public.requests for delete to authenticated using (true);

drop policy if exists "Public can read safe updates" on public.public_updates;
create policy "Public can read safe updates"
  on public.public_updates for select to anon, authenticated using (true);

create or replace function public.sync_public_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'DELETE') then
    delete from public.public_updates where id = old.id;
    return old;
  end if;

  insert into public.public_updates (id, title, type, year, image, status, updated_at)
  values (new.id, new.title, new.type, new.year, new.image, new.status, new.updated_at)
  on conflict (id) do update set
    title = excluded.title,
    type = excluded.type,
    year = excluded.year,
    image = excluded.image,
    status = excluded.status,
    updated_at = excluded.updated_at;
  return new;
end;
$$;

revoke all on function public.sync_public_update() from public, anon, authenticated;
drop trigger if exists requests_sync_public_update on public.requests;
create trigger requests_sync_public_update
  after insert or update or delete on public.requests
  for each row execute function public.sync_public_update();
