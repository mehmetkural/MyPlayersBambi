import { createClient } from '@/lib/supabase/server';
import TeamsClient from './TeamsClient';
import { MIN_PLAYERS_FOR_TEAMS } from '@/lib/utils';

export default async function TeamsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: players, count }, { data: profiles }, { data: savedTeams }, { count: ratedCount }] = await Promise.all([
    supabase.from('player_scores').select('*', { count: 'exact' }),
    supabase.from('profiles').select('id, positions, is_admin'),
    supabase.from('saved_teams').select('*').eq('id', 'current').maybeSingle(),
    supabase.from('ratings').select('id', { count: 'exact', head: true }).eq('rater_id', user!.id),
  ]);

  const posMap = new Map((profiles ?? []).map(p => [p.id, p.positions ?? []]));
  const enrichedPlayers = (players ?? []).map(p => ({ ...p, positions: posMap.get(p.id) ?? [] }));

  const currentProfile = user ? (profiles ?? []).find(p => p.id === user.id) : null;
  const isAdmin = currentProfile?.is_admin ?? false;

  const playerCount = count ?? 0;
  const unlocked = playerCount >= MIN_PLAYERS_FOR_TEAMS;
  // -1 because user doesn't rate themselves
  const hasRatedAll = (ratedCount ?? 0) >= playerCount - 1;

  const initialTeams = savedTeams ? {
    teamAIds: savedTeams.team_a_ids as string[],
    teamBIds: savedTeams.team_b_ids as string[],
    unassignedIds: savedTeams.unassigned_ids as string[],
  } : null;

  return (
    <TeamsClient
      players={enrichedPlayers}
      playerCount={playerCount}
      unlocked={unlocked}
      isAdmin={isAdmin}
      initialTeams={initialTeams}
      hasRatedAll={hasRatedAll}
    />
  );
}
