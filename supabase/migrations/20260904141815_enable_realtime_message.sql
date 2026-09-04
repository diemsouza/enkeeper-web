-- supabase/migrations/<timestamp>_enable_realtime_message.sql
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and tablename = 'messages'
     )
  then
    alter publication supabase_realtime add table "messages";
  end if;
end $$;