-- Version simplifiée : un compte = un lien Instagram, plus de suivi stories/reels/vues ni de limite par VA.
alter table public.accounts add column link text;
drop trigger accounts_max_per_va on public.accounts;
drop function public.enforce_max_accounts();

drop view public.account_overview;
drop view public.va_overview;

create view public.va_overview with (security_invoker = true) as
select v.*,
  (select count(*) from public.accounts a where a.va_id = v.id and a.status in ('actif','routine'))::int as live_count,
  (select count(*) from public.accounts a where a.va_id = v.id and a.status = 'banni')::int as banned_count,
  (select count(*) from public.accounts a where a.va_id = v.id)::int as total_accounts,
  (select max(a.created_at) from public.accounts a where a.va_id = v.id) as last_account_at
from public.vas v;
