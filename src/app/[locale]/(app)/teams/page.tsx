import { createClient } from '@/lib/supabase/server';
import TeamsClient from './TeamsClient';
import { MIN_PLAYERS_FOR_TEAMS } from '@/lib/utils';

export default async function TeamsPage() {
  const supabase = await createClient();

  const { data: players, count } = await supabase
    .from('player_scores')
    .select('*', { count: 'exact' });

  const playerCount = count ?? 0;
  const unlocked = playerCount >= MIN_PLAYERS_FOR_TEAMS;

  return (
    <TeamsClient
      players={players ?? []}
      playerCount={playerCount}
      unlocked={unlocked}
    />
  );
}
