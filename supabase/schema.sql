create extension if not exists pgcrypto;

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admins(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  email text unique,
  password_hash text,
  ctftime_team_id text unique,
  ctftime_profile jsonb,
  status text not null default 'active' check (status in ('active', 'pending', 'banned')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists team_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table team_sessions add column if not exists ip_address text;
alter table team_sessions add column if not exists user_agent text;
create index if not exists team_sessions_ip_address_idx on team_sessions(ip_address);

create table if not exists event_config (
  id text primary key default 'default',
  name text not null,
  description text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  discord_url text not null,
  updated_at timestamptz not null default now()
);

create table if not exists challenges (
  id text primary key,
  name text not null,
  description text not null,
  category text not null,
  points integer not null check (points >= 0),
  flag_hash text not null,
  connection_link text,
  hints text[] not null default '{}',
  is_published boolean not null default false,
  attachment_path text,
  attachment_name text,
  attachment_size text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists challenge_attachments (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references challenges(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  file_size bigint not null default 0,
  content_type text,
  created_at timestamptz not null default now()
);

insert into challenge_attachments (challenge_id, storage_path, file_name, file_size)
select
  id,
  attachment_path,
  coalesce(attachment_name, 'attachment'),
  case
    when attachment_size ~ '^[0-9]+ KB$' then split_part(attachment_size, ' ', 1)::bigint * 1024
    when attachment_size ~ '^[0-9]+ MB$' then split_part(attachment_size, ' ', 1)::bigint * 1024 * 1024
    else 0
  end
from challenges
where attachment_path is not null
on conflict (storage_path) do nothing;

alter table teams add column if not exists is_admin boolean not null default false;
alter table challenges add column if not exists flag_hash text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'challenges'
      and column_name = 'flag'
  ) then
    execute 'update challenges set flag_hash = encode(digest(flag, ''sha256''), ''hex'') where flag_hash is null and flag is not null';
    execute 'alter table challenges drop column flag';
  end if;
end $$;

alter table challenges alter column flag_hash set not null;

create table if not exists ctftime_pending_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  mode text not null check (mode in ('register', 'login')),
  ctftime_team_id text not null,
  ctftime_team_name text not null,
  ctftime_profile jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists solves (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  challenge_id text not null references challenges(id) on delete cascade,
  solved_at timestamptz not null default now(),
  unique (team_id, challenge_id)
);

create table if not exists submission_attempts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  challenge_id text not null references challenges(id) on delete cascade,
  is_correct boolean not null,
  submitted_at timestamptz not null default now()
);

create table if not exists sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  link_url text not null,
  description text not null,
  tier text not null check (tier in ('Diamond', 'Gold', 'Silver')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists prizes (
  id uuid primary key default gen_random_uuid(),
  place text not null,
  reward text not null,
  icon text not null default 'Trophy',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('challenge-files', 'challenge-files', false)
on conflict (id) do nothing;

insert into event_config (id, name, description, start_time, end_time, discord_url)
values (
  'default',
  'Antigravity Cyber CTF 2026',
  'Cyber wargame platform with challenges, scoreboard, team accounts, and admin controls.',
  '2026-07-15T09:00:00Z',
  '2026-07-17T17:00:00Z',
  'https://discord.gg/antigravity-ctf-demo'
)
on conflict (id) do nothing;

insert into challenges (id, name, description, category, points, flag_hash, hints, is_published)
values
  ('misc-01', 'Welcome to Arena', 'Submit the welcome flag to verify your team account.', 'Misc', 50, 'cc60c9c1f30e668851e64a80b12f6940f12546a2be16c837eeede567b4b3a6bf', array['The flag is included in the challenge text.'], true),
  ('web-01', 'Path Traversal Madness', 'Read /flag.txt by abusing an unsafe file path parameter.', 'Web', 100, 'abfb12f7885450c430594031769388268438f9f72a6b9387c3f95414c97ea888', array['Try ../ sequences.', 'Target /flag.txt from filesystem root.'], true),
  ('crypto-01', 'One Byte XOR', 'Recover a flag encrypted with a repeated one-byte XOR key.', 'Crypto', 100, '0ffeb6de41569a067c991af2c6ca8db02b1e8b56f65bb4e483f65e0d8cbcfe44', array['Flags start with flag{.'], true)
on conflict (id) do nothing;

insert into prizes (place, reward, icon, sort_order)
values
  ('1st Place', '50,000,000 VND + Championship Trophy', 'Trophy', 1),
  ('2nd Place', '25,000,000 VND + Silver Medal', 'Award', 2),
  ('3rd Place', '10,000,000 VND + Bronze Medal', 'ShieldAlert', 3)
on conflict do nothing;

insert into sponsors (name, link_url, description, tier, sort_order)
values
  ('Google Cloud', 'https://cloud.google.com', 'Infrastructure sponsor for secure cloud workloads.', 'Diamond', 1),
  ('Antigravity Labs', 'https://github.com', 'Security lab sponsor for challenge infrastructure.', 'Gold', 2)
on conflict do nothing;
