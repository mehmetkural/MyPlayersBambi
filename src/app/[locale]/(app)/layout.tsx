import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/Navbar';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth`);
  }

  const [{ count }, { data: profile }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('is_admin, name').eq('id', user!.id).single(),
  ]);

  const isAdmin = profile?.is_admin ?? false;
  const userName = profile?.name ?? '';

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar playerCount={count ?? 0} isAdmin={isAdmin} userName={userName} />
      <main className="flex-1 pb-24 md:pb-0">
        {children}
      </main>
    </div>
  );
}
