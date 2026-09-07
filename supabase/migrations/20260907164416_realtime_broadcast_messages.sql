-- supabase/migrations/<novo_timestamp>_realtime_broadcast_messages.sql

-- 1. Desfaz o que era específico do mecanismo postgres_changes,
--    não é mais necessário com Broadcast.
drop policy if exists "messages_select_own" on "public"."messages";

-- A publication (alter publication supabase_realtime add table "messages")
-- e o RLS habilitado na tabela (alter table "messages" enable row level
-- security) podem continuar existindo sem problema, não atrapalham o
-- Broadcast e não precisam ser desfeitos.

-- 2. Trigger que empurra o INSERT direto pro canal, sem recheck de RLS
--    por trás (é isso que resolve o problema do 401 na releitura).
create or replace function public.broadcast_message_insert()
returns trigger
language plpgsql
security definer
as $$
begin
  perform realtime.broadcast_changes(
    'messages-' || new.user_id::text,
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return new;
end;
$$;

drop trigger if exists on_message_insert on "public"."messages";

create trigger on_message_insert
after insert on "public"."messages"
for each row execute function public.broadcast_message_insert();

drop trigger if exists on_message_update on "public"."messages";

create trigger on_message_update
after update on "public"."messages"
for each row execute function public.broadcast_message_insert();

-- 3. Autorização de quem pode ESCUTAR o canal (checada uma vez, ao
--    entrar no canal, não a cada mensagem).
drop policy if exists "authenticated_reads_own_channel" on "realtime"."messages";

create policy "authenticated_reads_own_channel"
on "realtime"."messages"
for select
to authenticated
using (realtime.topic() = 'messages-' || (auth.jwt() ->> 'sub'));

-- 4. Grants já validados como necessários durante o diagnóstico,
--    mantidos aqui para a migration ficar autocontida (idempotente
--    se já existirem).
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update on "public"."messages" to authenticated;