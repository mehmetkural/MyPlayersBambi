import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Shield } from 'lucide-react';

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user!.id)
    .single();

  if (!currentProfile?.is_admin) redirect(`/${locale}/rate`);

  const [{ data: profiles }, { data: ratings }] = await Promise.all([
    supabase.from('profiles').select('id, name, positions').order('name'),
    supabase.from('ratings').select('rater_id'),
  ]);

  const totalPlayers = (profiles ?? []).length;

  const givenCountMap = new Map<string, number>();
  for (const r of ratings ?? []) {
    givenCountMap.set(r.rater_id, (givenCountMap.get(r.rater_id) ?? 0) + 1);
  }

  const rows = (profiles ?? []).map(p => ({
    id: p.id,
    name: p.name,
    givenCount: givenCountMap.get(p.id) ?? 0,
    totalToRate: totalPlayers - 1,
    hasPreferences: Array.isArray(p.positions) && p.positions.length > 0,
  }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="text-green-400" size={24} />
          Admin
        </h1>
        <p className="text-gray-400 text-sm mt-1">{totalPlayers} kayıtlı oyuncu</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 border-b border-gray-800">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Oyuncu</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Değerlendirme</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Tercih</span>
        </div>

        {rows.map((row, i) => (
          <div
            key={row.id}
            className={`grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 items-center ${i < rows.length - 1 ? 'border-b border-gray-800/60' : ''}`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-green-500/15 flex items-center justify-center text-green-400 font-bold text-xs flex-shrink-0">
                {row.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-white text-sm font-medium">{row.name}</span>
            </div>

            <div className="text-center min-w-[64px]">
              <span className={`text-sm font-semibold ${row.givenCount >= row.totalToRate ? 'text-green-400' : 'text-yellow-400'}`}>
                {row.givenCount}
              </span>
              <span className="text-gray-600 text-xs"> / {row.totalToRate}</span>
            </div>

            <div className="text-center min-w-[48px]">
              {row.hasPreferences
                ? <span className="text-green-400 text-sm">✓</span>
                : <span className="text-gray-600 text-sm">—</span>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
