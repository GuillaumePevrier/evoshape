-- Push subscriptions improvements + notifications center

alter table public.push_subscriptions
  add column if not exists external_user_id text,
  add column if not exists device_type text,
  add column if not exists user_agent text,
  add column if not exists platform text,
  add column if not exists last_seen_at timestamptz,
  add column if not exists is_enabled boolean not null default true;

create index if not exists push_subscriptions_external_user_id_idx
  on public.push_subscriptions (external_user_id);

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_user_subscription_unique;

alter table public.push_subscriptions
  add constraint push_subscriptions_user_subscription_unique
  unique (user_id, onesignal_subscription_id);

create or replace function public.touch_push_subscription_last_seen()
returns trigger
language plpgsql
as $$
begin
  new.last_seen_at = now();
  return new;
end;
$$;

drop trigger if exists set_push_subscription_last_seen on public.push_subscriptions;

create trigger set_push_subscription_last_seen
before insert or update on public.push_subscriptions
for each row execute procedure public.touch_push_subscription_last_seen();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  url text,
  data jsonb,
  sent_at timestamptz not null default now(),
  read_at timestamptz,
  deleted_at timestamptz,
  source text not null default 'onesignal'
);

create index if not exists notifications_user_id_idx
  on public.notifications (user_id, sent_at desc);

alter table public.notifications enable row level security;

create policy "notifications_crud_own"
on public.notifications for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
