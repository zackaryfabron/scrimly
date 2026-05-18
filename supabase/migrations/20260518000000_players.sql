create table public.players (
  id               uuid          default gen_random_uuid() primary key,
  puuid            text,
  riot_id          text          not null unique,
  game_name        text          not null,
  tag_line         text          not null,
  region           text          not null default 'na',
  account_level    integer,
  rank_tier        text,
  rank_rr          integer,
  rank_tier_number integer,
  top_agents       jsonb         not null default '[]'::jsonb,
  kda_kills        numeric(6,2),
  kda_deaths       numeric(6,2),
  kda_assists      numeric(6,2),
  last_synced_at   timestamptz,
  created_at       timestamptz   not null default now()
);

alter table public.players enable row level security;

-- Open access until auth is wired up
create policy "Public access"
  on public.players for all
  using (true)
  with check (true);
