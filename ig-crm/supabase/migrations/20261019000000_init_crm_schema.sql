create table public.vas (
  id uuid primary key default gen_random_uuid(),
  discord_name text not null,
  discord_id text,
  status text not null default 'actif' check (status in ('actif','inactif','formation','suspendu','parti')),
  identity text,
  gms_link text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  va_id uuid not null references public.vas(id) on delete cascade,
  username text not null,
  status text not null default 'actif' check (status in ('actif','routine','abandonné','banni','supprimé')),
  identity text,
  abandon_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index accounts_va_id_idx on public.accounts(va_id);
create index accounts_status_idx on public.accounts(status);
-- un même @username ne peut pas être actif deux fois
create unique index accounts_username_live_uniq on public.accounts (lower(username)) where status in ('actif','routine');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  event_type text not null check (event_type in ('story_posted','reel_posted','views_checked','branding_checked','account_deleted')),
  event_time timestamptz not null,
  views_count integer check (views_count is null or views_count >= 0),
  notes text,
  created_at timestamptz not null default now()
);
create index events_account_time_idx on public.events(account_id, event_time desc);
create index events_time_idx on public.events(event_time desc);

create table public.settings (
  key text primary key,
  value text not null
);
insert into public.settings (key, value) values
  ('story_duration_hours','24'),
  ('reel_check_delay_minutes','60'),
  ('min_views_threshold','100'),
  ('routine_reel_interval_hours','2'),
  ('inactivity_alert_hours','4'),
  ('max_accounts_per_va','3');

-- updated_at
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger vas_updated_at before update on public.vas for each row execute function public.set_updated_at();
create trigger accounts_updated_at before update on public.accounts for each row execute function public.set_updated_at();

-- max comptes actifs par VA (configurable)
create or replace function public.enforce_max_accounts() returns trigger
language plpgsql set search_path = '' as $$
declare max_n int; cur int;
begin
  if new.status not in ('actif','routine') then return new; end if;
  if tg_op = 'UPDATE' and old.status in ('actif','routine') and old.va_id = new.va_id then return new; end if;
  select coalesce(value::int, 3) into max_n from public.settings where key = 'max_accounts_per_va';
  select count(*) into cur from public.accounts
    where va_id = new.va_id and status in ('actif','routine') and id <> new.id;
  if cur >= coalesce(max_n, 3) then
    raise exception 'MAX_ACCOUNTS: ce VA a déjà % comptes actifs (max %)', cur, coalesce(max_n,3);
  end if;
  return new;
end; $$;
create trigger accounts_max_per_va before insert or update on public.accounts
  for each row execute function public.enforce_max_accounts();

-- RLS : seul un utilisateur authentifié (l'admin) a accès
alter table public.vas enable row level security;
alter table public.accounts enable row level security;
alter table public.events enable row level security;
alter table public.settings enable row level security;

create policy "admin all" on public.vas for all to authenticated using (true) with check (true);
create policy "admin all" on public.accounts for all to authenticated using (true) with check (true);
create policy "admin all" on public.events for all to authenticated using (true) with check (true);
create policy "admin all" on public.settings for all to authenticated using (true) with check (true);
