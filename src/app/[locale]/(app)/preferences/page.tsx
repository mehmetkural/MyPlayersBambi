import { createClient } from '@/lib/supabase/server';
import PreferencesClient from './PreferencesClient';

export default async function PreferencesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('positions')
    .eq('id', user!.id)
    .single();

  return (
    <PreferencesClient
      currentUserId={user!.id}
      savedPositions={profile?.positions ?? []}
    />
  );
}
