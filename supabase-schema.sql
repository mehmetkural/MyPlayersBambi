-- 1. Profiles (one per user)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  is_admin boolean not null default false,
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
-- Outlier detection: per-attribute ratings that deviate >3 points from the median
-- are excluded when a player has at least 3 ratings (manipulation guard).
create or replace view player_scores as
with medians as (
  select
    rated_id,
    count(*) as cnt,
    percentile_cont(0.5) within group (order by speed)       as med_speed,
    percentile_cont(0.5) within group (order by agility)     as med_agility,
    percentile_cont(0.5) within group (order by passing)     as med_passing,
    percentile_cont(0.5) within group (order by shooting)    as med_shooting,
    percentile_cont(0.5) within group (order by defense)     as med_defense,
    percentile_cont(0.5) within group (order by goalkeeping) as med_goalkeeping
  from ratings
  group by rated_id
)
select
  p.id,
  p.name,
  count(r.id) as rating_count,
  round(avg(case when m.cnt < 3 or abs(r.speed       - m.med_speed)       <= 4 then r.speed       end)::numeric, 1) as speed,
  round(avg(case when m.cnt < 3 or abs(r.agility     - m.med_agility)     <= 4 then r.agility     end)::numeric, 1) as agility,
  round(avg(case when m.cnt < 3 or abs(r.passing     - m.med_passing)     <= 4 then r.passing     end)::numeric, 1) as passing,
  round(avg(case when m.cnt < 3 or abs(r.shooting    - m.med_shooting)    <= 4 then r.shooting    end)::numeric, 1) as shooting,
  round(avg(case when m.cnt < 3 or abs(r.defense     - m.med_defense)     <= 4 then r.defense     end)::numeric, 1) as defense,
  round(avg(case when m.cnt < 3 or abs(r.goalkeeping - m.med_goalkeeping) <= 4 then r.goalkeeping end)::numeric, 1) as goalkeeping,
  round((
    avg(case when m.cnt < 3 or abs(r.speed    - m.med_speed)    <= 4 then r.speed    end) +
    avg(case when m.cnt < 3 or abs(r.agility  - m.med_agility)  <= 4 then r.agility  end) +
    avg(case when m.cnt < 3 or abs(r.passing  - m.med_passing)  <= 4 then r.passing  end) +
    avg(case when m.cnt < 3 or abs(r.shooting - m.med_shooting) <= 4 then r.shooting end) +
    avg(case when m.cnt < 3 or abs(r.defense  - m.med_defense)  <= 4 then r.defense  end)
  ) / 5, 1) as overall
from profiles p
left join ratings r on r.rated_id = p.id
left join medians m on m.rated_id = p.id
group by p.id, p.name;

-- Grant view access
grant select on player_scores to anon, authenticated;

-- 4. Saved teams (admin-generated, single current row)
create table saved_teams (
  id text primary key,
  team_a_ids uuid[] not null,
  team_b_ids uuid[] not null,
  unassigned_ids uuid[] not null default '{}',
  match_date timestamptz,
  venue text,
  updated_at timestamptz default now()
);

alter table saved_teams enable row level security;
create policy "saved_teams_select" on saved_teams for select using (true);
create policy "saved_teams_write" on saved_teams for all using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- 5. Team reactions (like/dislike per user for current teams)
create table team_reactions (
  user_id  uuid references profiles(id) on delete cascade,
  teams_id text references saved_teams(id) on delete cascade,
  liked    boolean not null,
  created_at timestamptz default now(),
  primary key (user_id, teams_id)
);

alter table team_reactions enable row level security;
create policy "reactions_select" on team_reactions for select using (true);
create policy "reactions_write" on team_reactions for all using (auth.uid() = user_id);

-- 6. Self ratings (each user rates themselves)
create table self_ratings (
  user_id uuid references profiles(id) on delete cascade primary key,
  speed int not null check (speed between 1 and 10),
  agility int not null check (agility between 1 and 10),
  passing int not null check (passing between 1 and 10),
  shooting int not null check (shooting between 1 and 10),
  defense int not null check (defense between 1 and 10),
  goalkeeping int not null check (goalkeeping between 1 and 10),
  updated_at timestamptz default now()
);

alter table self_ratings enable row level security;
create policy "self_ratings_select" on self_ratings for select using (true);
create policy "self_ratings_write" on self_ratings for all using (auth.uid() = user_id);

-- 7. Saved self-rated teams (admin-generated from self ratings)
create table saved_self_teams (
  id text primary key,
  team_a_ids uuid[] not null,
  team_b_ids uuid[] not null,
  unassigned_ids uuid[] not null default '{}',
  updated_at timestamptz default now()
);

alter table saved_self_teams enable row level security;
create policy "saved_self_teams_select" on saved_self_teams for select using (true);
create policy "saved_self_teams_write" on saved_self_teams for all using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- 8. Self team reactions
create table self_team_reactions (
  user_id uuid references profiles(id) on delete cascade,
  teams_id text references saved_self_teams(id) on delete cascade,
  liked boolean not null,
  created_at timestamptz default now(),
  primary key (user_id, teams_id)
);

alter table self_team_reactions enable row level security;
create policy "self_reactions_select" on self_team_reactions for select using (true);
create policy "self_reactions_write" on self_team_reactions for all using (auth.uid() = user_id);
