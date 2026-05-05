import { createClient } from '@/lib/supabase/server';
import SelfRateClient from './SelfRateClient';
import { type Attribute } from '@/lib/utils';

export default async function SelfRatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: selfRating }, { data: profiles }, { data: allSelfRatings }, { data: savedTeams }, { data: reactions }] = await Promise.all([
    supabase.from('self_ratings').select('*').eq('user_id', user!.id).maybeSingle(),
    supabase.from('profiles').select('id, name, positions, is_admin'),
    supabase.from('self_ratings').select('*'),
    supabase.from('saved_self_teams').select('*').eq('id', 'current').maybeSingle(),
    supabase.from('self_team_reactions').select('user_id, liked').eq('teams_id', 'current'),
  ]);

  const currentProfile = (profiles ?? []).find(p => p.id === user!.id);
  const isAdmin = currentProfile?.is_admin ?? false;

  const selfRatingMap = new Map((allSelfRatings ?? []).map(r => [r.user_id, r]));
  const players = (profiles ?? [])
    .filter(p => selfRatingMap.has(p.id))
    .map(p => {
      const r = selfRatingMap.get(p.id)!;
      const overall = Math.round(((r.speed + r.agility + r.passing + r.shooting + r.defense) / 5) * 10) / 10;
      return {
        id: p.id,
        name: p.name,
        positions: (p.positions ?? []) as string[],
        overall,
        speed: r.speed as number,
        agility: r.agility as number,
        passing: r.passing as number,
        shooting: r.shooting as number,
        defense: r.defense as number,
        goalkeeping: r.goalkeeping as number,
      };
    });

  const existingSelfRating = selfRating ? {
    speed: selfRating.speed,
    agility: selfRating.agility,
    passing: selfRating.passing,
    shooting: selfRating.shooting,
    defense: selfRating.defense,
    goalkeeping: selfRating.goalkeeping,
  } as Record<Attribute, number> : null;

  const initialTeams = savedTeams ? {
    teamAIds: savedTeams.team_a_ids as string[],
    teamBIds: savedTeams.team_b_ids as string[],
    unassignedIds: savedTeams.unassigned_ids as string[],
  } : null;

  const reactionList = reactions ?? [];
  const myReaction = reactionList.find(r => r.user_id === user!.id)?.liked ?? null;
  const likeCount = reactionList.filter(r => r.liked).length;
  const dislikeCount = reactionList.filter(r => !r.liked).length;

  return (
    <SelfRateClient
      userId={user!.id}
      isAdmin={isAdmin}
      existingSelfRating={existingSelfRating}
      hasRatedSelf={selfRating !== null}
      players={players}
      initialTeams={initialTeams}
      myReaction={myReaction}
      likeCount={likeCount}
      dislikeCount={dislikeCount}
    />
  );
}
