import { createClient } from '@/lib/supabase/server';
import RateClient from './RateClient';

export default async function RatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // All players except self
  const { data: allPlayers } = await supabase
    .from('profiles')
    .select('id, name')
    .neq('id', user!.id)
    .order('name');

  // Already rated player IDs
  const { data: givenRatings } = await supabase
    .from('ratings')
    .select('rated_id')
    .eq('rater_id', user!.id);

  const ratedIds = new Set((givenRatings ?? []).map(r => r.rated_id));

  const players = (allPlayers ?? []).map(p => ({
    ...p,
    rated: ratedIds.has(p.id),
  }));

  return <RateClient players={players} currentUserId={user!.id} />;
}
