-- 1. Profiles (one per user)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  created_at timestamptz default now()
);

-- Allow users to read all profiles, write only their own
alter table profiles enable row level security;
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- 2. Ratings (rater → rated, one per pair)
create table ratings (
  id uuid default gen_random_uuid() primary key,
  rater_id uuid references profiles(id) on delete cascade not null,
  rated_id uuid references profiles(id) on delete cascade not null,
  speed int not null check (speed between 1 and 10),
  agility int not null check (agility between 1 and 10),
  passing int not null check (passing between 1 and 10),
  shooting int not null check (shooting between 1 and 10),
  defense int not null check (defense between 1 and 10),
  goalkeeping int not null check (goalkeeping between 1 and 10),
  created_at timestamptz default now(),
  unique (rater_id, rated_id),
  check (rater_id != rated_id)
);

alter table ratings enable row level security;
create policy "ratings_select" on ratings for select using (true);
create policy "ratings_insert" on ratings for insert with check (auth.uid() = rater_id);
create policy "ratings_upsert" on ratings for update using (auth.uid() = rater_id);

-- 3. View: aggregated player scores
create or replace view player_scores as
select
  p.id,
  p.name,
  count(r.id) as rating_count,
  round(avg(r.speed)::numeric, 1) as speed,
  round(avg(r.agility)::numeric, 1) as agility,
  round(avg(r.passing)::numeric, 1) as passing,
  round(avg(r.shooting)::numeric, 1) as shooting,
  round(avg(r.defense)::numeric, 1) as defense,
  round(avg(r.goalkeeping)::numeric, 1) as goalkeeping,
  round(
    (avg(r.speed) + avg(r.agility) + avg(r.passing) + avg(r.shooting) + avg(r.defense)) / 5,
    1
  ) as overall
from profiles p
left join ratings r on r.rated_id = p.id
group by p.id, p.name;

-- Grant view access
grant select on player_scores to anon, authenticated;
