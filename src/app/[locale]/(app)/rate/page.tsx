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

  // Already given ratings with scores
  const { data: givenRatings } = await supabase
    .from('ratings')
    .select('rated_id, speed, agility, passing, shooting, defense, goalkeeping')
    .eq('rater_id', user!.id);

  const ratingsMap = new Map(
    (givenRatings ?? []).map(r => [r.rated_id, {
      speed: r.speed as number,
      agility: r.agility as number,
      passing: r.passing as number,
      shooting: r.shooting as number,
      defense: r.defense as number,
      goalkeeping: r.goalkeeping as number,
    }])
  );

  const players = (allPlayers ?? []).map(p => ({
    ...p,
    rated: ratingsMap.has(p.id),
    existingScores: ratingsMap.get(p.id),
  }));

  const totalPlayers = (allPlayers?.length ?? 0) + 1;

  return <RateClient players={players} currentUserId={user!.id} totalPlayers={totalPlayers} />;
}
