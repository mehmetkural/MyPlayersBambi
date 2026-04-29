import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LeaderboardClient from './LeaderboardClient';

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user!.id)
    .single();

  if (!profile?.is_admin) notFound();

  const { data: players } = await supabase
    .from('player_scores')
    .select('*')
    .order('overall', { ascending: false });

  return <LeaderboardClient players={players ?? []} />;
}
