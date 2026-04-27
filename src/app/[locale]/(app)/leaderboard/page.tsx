import { createClient } from '@/lib/supabase/server';
import LeaderboardClient from './LeaderboardClient';

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: players } = await supabase
    .from('player_scores')
    .select('*')
    .order('overall', { ascending: false });

  return <LeaderboardClient players={players ?? []} />;
}
