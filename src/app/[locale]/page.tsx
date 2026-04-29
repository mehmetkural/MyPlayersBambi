import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function LocalePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect(`/${locale}/rate`);
  } else {
    redirect(`/${locale}/auth`);
  }
}
