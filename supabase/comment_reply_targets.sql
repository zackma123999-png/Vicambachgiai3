-- Reply targets: a reply can now point at the specific reply it answers.
-- Notifications go to the author of that target (or of the root comment when
-- the reply answers the root), plus the root comment's author, deduplicated.
begin;

alter table public.comment_replies
  add column if not exists reply_to_id text references public.comment_replies(id) on delete set null;

create index if not exists comment_replies_reply_to_idx
  on public.comment_replies(reply_to_id);

create or replace function private.notify_reply_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $fn$
declare
  parent public.comments%rowtype;
  target_user uuid;
  story_title text;
  story_slug text;
  chapter_number numeric;
  actor_name text;
  target_href text;
  mentioned_member record;
begin
  select * into parent
  from public.comments
  where id = new.comment_id;

  if parent.id is null then
    return new;
  end if;

  -- Author of the reply being answered; falls back to the root comment author.
  target_user := parent.user_id;
  if new.reply_to_id is not null then
    select r.user_id into target_user
    from public.comment_replies r
    where r.id = new.reply_to_id
      and r.comment_id = new.comment_id;
    target_user := coalesce(target_user, parent.user_id);
  end if;

  select s.title, s.slug, c.number
    into story_title, story_slug, chapter_number
  from public.stories s
  left join public.chapters c on c.id = parent.chapter_id
  where s.id = parent.story_id;

  select coalesce(nullif(trim(p.display_name), ''), 'Quản trị viên')
    into actor_name
  from public.profiles p
  where p.user_id = new.user_id;

  actor_name := coalesce(actor_name, 'Quản trị viên');
  target_href := '#/truyen/' || coalesce(story_slug, '') ||
    '/chuong-' || coalesce(chapter_number, 0)::text ||
    '?comment=' || parent.id::text;

  -- 1. The person being replied to.
  if target_user is not null and target_user is distinct from new.user_id then
    insert into public.notifications (
      user_id, notification_type, title, body, href,
      story_id, chapter_id, comment_id, actor_id, read
    ) values (
      target_user, 'comment_reply', 'Có phản hồi mới',
      actor_name || ' đã trả lời bình luận của bạn.', target_href,
      parent.story_id, parent.chapter_id, parent.id, new.user_id, false
    );
  end if;

  -- 2. The root comment author, when the reply was aimed at someone else.
  if parent.user_id is not null
     and parent.user_id is distinct from new.user_id
     and parent.user_id is distinct from target_user then
    insert into public.notifications (
      user_id, notification_type, title, body, href,
      story_id, chapter_id, comment_id, actor_id, read
    ) values (
      parent.user_id, 'comment_reply', 'Có phản hồi mới',
      actor_name || ' đã trả lời trong bình luận của bạn.', target_href,
      parent.story_id, parent.chapter_id, parent.id, new.user_id, false
    );
  end if;

  -- 3. Admins.
  insert into public.notifications (
    user_id, notification_type, title, body, href,
    story_id, chapter_id, comment_id, actor_id, read
  )
  select
    p.user_id, 'new_comment', 'Phản hồi mới',
    actor_name || ' vừa trả lời một bình luận tại “' || coalesce(story_title, 'truyện') || '”.',
    target_href, parent.story_id, parent.chapter_id, parent.id, new.user_id, false
  from public.profiles p
  where p.status = 'active'
    and p.role = 'admin'
    and p.user_id is distinct from new.user_id
    and p.user_id is distinct from parent.user_id
    and p.user_id is distinct from target_user;

  -- 4. @mentions of anyone not already notified above.
  for mentioned_member in
    select p.user_id
    from public.profiles p
    where p.status = 'active'
      and p.role <> 'admin'
      and p.user_id is distinct from new.user_id
      and p.user_id is distinct from parent.user_id
      and p.user_id is distinct from target_user
      and position(lower('@' || p.display_name) in lower(new.body)) > 0
  loop
    insert into public.notifications (
      user_id, notification_type, title, body, href,
      story_id, chapter_id, comment_id, actor_id, read
    ) values (
      mentioned_member.user_id, 'mention', actor_name || ' đã nhắc đến bạn',
      left(new.body, 220), target_href,
      parent.story_id, parent.chapter_id, parent.id, new.user_id, false
    );
  end loop;

  return new;
end
$fn$;

revoke all on function private.notify_reply_insert() from public;

drop trigger if exists notify_reply_insert on public.comment_replies;
create trigger notify_reply_insert
after insert on public.comment_replies
for each row execute function private.notify_reply_insert();

commit;
