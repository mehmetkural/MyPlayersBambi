import { createClient } from '@/lib/supabase/server';
import TeamsClient from './TeamsClient';
import { MIN_PLAYERS_FOR_TEAMS } from '@/lib/utils';

export default async function TeamsPage() {
  const supabase = await createClient();

  const [{ data: players, count }, { data: profiles }] = await Promise.all([
    supabase.from('player_scores').select('*', { count: 'exact' }),
    supabase.from('profiles').select('id, positions'),
  ]);

  const posMap = new Map((profiles ?? []).map(p => [p.id, p.positions ?? []]));
  const enrichedPlayers = (players ?? []).map(p => ({ ...p, positions: posMap.get(p.id) ?? [] }));

  const playerCount = count ?? 0;
  const unlocked = playerCount >= MIN_PLAYERS_FOR_TEAMS;

  return (
    <TeamsClient
      players={enrichedPlayers}
      playerCount={playerCount}
      unlocked={unlocked}
    />
  );
}
