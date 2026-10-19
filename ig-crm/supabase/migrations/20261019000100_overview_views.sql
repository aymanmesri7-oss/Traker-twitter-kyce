create view public.account_overview with (security_invoker = true) as
select a.*,
  v.discord_name as va_name,
  v.status as va_status,
  (select max(e.event_time) from public.events e where e.account_id = a.id and e.event_type = 'story_posted') as last_story_at,
  (select max(e.event_time) from public.events e where e.account_id = a.id and e.event_type = 'reel_posted') as last_reel_at,
  lv.event_time as last_views_at,
  lv.views_count as last_views_count,
  (select max(e.event_time) from public.events e where e.account_id = a.id) as last_event_at
from public.accounts a
join public.vas v on v.id = a.va_id
left join lateral (
  select e.event_time, e.views_count from public.events e
  where e.account_id = a.id and e.event_type = 'views_checked'
  order by e.event_time desc limit 1
) lv on true;

create view public.va_overview with (security_invoker = true) as
select v.*,
  (select count(*) from public.accounts a where a.va_id = v.id and a.status in ('actif','routine'))::int as live_count,
  (select count(*) from public.accounts a where a.va_id = v.id)::int as total_accounts,
  (select max(a.created_at) from public.accounts a where a.va_id = v.id) as last_account_at,
  (select max(e.event_time) from public.events e join public.accounts a on a.id = e.account_id where a.va_id = v.id) as last_event_at
from public.vas v;
