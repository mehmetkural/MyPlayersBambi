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

  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar playerCount={count ?? 0} />
      <main className="flex-1 pb-24 md:pb-0">
        {children}
      </main>
    </div>
  );
}
