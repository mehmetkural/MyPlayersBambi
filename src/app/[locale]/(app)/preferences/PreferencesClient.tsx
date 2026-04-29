'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { SlidersHorizontal } from 'lucide-react';

const POSITIONS = [
  { key: 'GK', emoji: '🧤', labelKey: 'gk' },
  { key: 'DEF', emoji: '🛡️', labelKey: 'def' },
  { key: 'MID', emoji: '⚡', labelKey: 'mid' },
  { key: 'FWD', emoji: '🎯', labelKey: 'fwd' },
] as const;

export default function PreferencesClient({
  currentUserId,
  savedPositions,
}: {
  currentUserId: string;
  savedPositions: string[];
}) {
  const t = useTranslations('preferences');
  const supabase = createClient();
  const [selected, setSelected] = useState<string[]>(savedPositions);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(false);

  function toggle(key: string) {
    if (selected.includes(key)) {
      setSelected(prev => prev.filter(p => p !== key));
    } else if (selected.length < 3) {
      setSelected(prev => [...prev, key]);
    }
  }

  async function save() {
    setLoading(true);
    await supabase.from('profiles').update({ positions: selected }).eq('id', currentUserId);
    setLoading(false);
    setFlash(true);
    setTimeout(() => setFlash(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <SlidersHorizontal className="text-green-400" size={24} />
          {t('title')}
        </h1>
        <p className="text-gray-400 text-sm mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {POSITIONS.map(pos => {
          const isSelected = selected.includes(pos.key);
          const isDisabled = !isSelected && selected.length >= 3;
          return (
            <button
              key={pos.key}
              onClick={() => toggle(pos.key)}
              disabled={isDisabled}
              className={cn(
                'relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all',
                isSelected
                  ? 'bg-green-500/15 border-green-500'
                  : isDisabled
                  ? 'bg-gray-900 border-gray-800 opacity-35 cursor-not-allowed'
                  : 'bg-gray-900 border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'
              )}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {selected.indexOf(pos.key) + 1}
                  </span>
                </div>
              )}
              <span className="text-4xl">{pos.emoji}</span>
              <div className="text-center">
                <p className={cn('font-bold text-base', isSelected ? 'text-green-400' : 'text-white')}>
                  {t(pos.labelKey)}
                </p>
                <p className="text-gray-600 text-xs mt-0.5">{pos.key}</p>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-gray-600 text-xs text-center mb-6">
        {selected.length} / 3 {t('selected')}
      </p>

      <button
        onClick={save}
        disabled={loading || selected.length === 0}
        className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {flash ? t('saved') : loading ? '...' : t('save')}
      </button>
    </div>
  );
}
