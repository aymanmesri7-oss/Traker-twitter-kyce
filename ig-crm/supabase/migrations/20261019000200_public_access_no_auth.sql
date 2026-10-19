-- Pas d'authentification : tout le monde ayant l'URL voit et modifie les données.
drop policy "admin all" on public.vas;
drop policy "admin all" on public.accounts;
drop policy "admin all" on public.events;
drop policy "admin all" on public.settings;

create policy "public all" on public.vas for all to anon, authenticated using (true) with check (true);
create policy "public all" on public.accounts for all to anon, authenticated using (true) with check (true);
create policy "public all" on public.events for all to anon, authenticated using (true) with check (true);
create policy "public all" on public.settings for all to anon, authenticated using (true) with check (true);
