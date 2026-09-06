-- supabase/migrations/20260904190000_messages_rls.sql
alter table "messages" enable row level security;

create policy "messages_select_own" on "messages"
  for select
  using (user_id = (auth.jwt() ->> 'sub'));
