begin;

-- The mailbox UI used to load every row in conversation_messages (site-wide,
-- across all threads) on every paint just to compute each thread's preview
-- text and to render the active thread's history. Once that table passed the
-- API's row cap, older messages crowded out newer ones in the truncated
-- result set, so a thread with a genuinely recent message could render as
-- "Chưa có nội dung" even though the message was safely stored. Denormalize
-- the latest message onto the thread row so the list never needs an
-- unbounded scan, and load an individual thread's messages only when it is
-- opened.

alter table public.conversation_threads
  add column if not exists last_message_body text,
  add column if not exists last_message_at timestamptz,
  add column if not exists last_sender_id uuid references auth.users(id) on delete set null;

update public.conversation_threads as thread
set last_message_body = latest.body,
    last_message_at = latest.created_at,
    last_sender_id = latest.sender_id
from (
  select distinct on (thread_id) thread_id, body, created_at, sender_id
  from public.conversation_messages
  order by thread_id, created_at desc
) as latest
where latest.thread_id = thread.id
  and thread.last_message_at is null;

create index if not exists conversation_threads_last_message_idx
  on public.conversation_threads(last_message_at desc);

create or replace function private.conversation_message_created()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $fn$
declare
  thread_row public.conversation_threads%rowtype;
  sender_name text;
  recipient record;
begin
  select * into thread_row from public.conversation_threads where id = new.thread_id;
  if thread_row.id is null then return new; end if;

  update public.conversation_threads
  set updated_at = new.created_at,
      last_message_body = new.body,
      last_message_at = new.created_at,
      last_sender_id = new.sender_id
  where id = new.thread_id;

  select coalesce(nullif(display_name,''), email, 'Thành viên') into sender_name
  from public.profiles where user_id = new.sender_id;

  for recipient in
    select thread_row.member_id as user_id
    where new.sender_id <> thread_row.member_id
    union
    select p.user_id from public.profiles p
    where p.role = 'admin' and p.status = 'active'
      and new.sender_id = thread_row.member_id
  loop
    insert into public.notifications (
      user_id, notification_type, title, body, href, actor_id,
      conversation_id, announcement_id, read
    ) values (
      recipient.user_id, 'manual',
      case when recipient.user_id = thread_row.member_id and new.announcement_id is not null
        then thread_row.subject
        when recipient.user_id = thread_row.member_id then 'Quản trị viên đã trả lời'
        else 'Tin nhắn từ ' || coalesce(sender_name, 'thành viên') end,
      new.body,
      case when recipient.user_id = thread_row.member_id
        then '#/hop-thu?thread=' || thread_row.id::text
        else '#/admin/hop-thu?thread=' || thread_row.id::text end,
      new.sender_id, thread_row.id, new.announcement_id, false
    );
  end loop;
  return new;
end
$fn$;

commit;
