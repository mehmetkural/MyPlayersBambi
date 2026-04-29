'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { SlidersHorizontal, ChevronUp, ChevronDown } from 'lucide-react';

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
  const [saved, setSaved] = useState<string[]>(savedPositions);
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

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...selected];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setSelected(next);
  }

  function moveDown(index: number) {
    if (index === selected.length - 1) return;
    const next = [...selected];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setSelected(next);
  }

  async function save() {
    setLoading(true);
    await supabase.from('profiles').update({ positions: selected }).eq('id', currentUserId);
    setLoading(false);
    setSaved(selected);
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

      {/* Kayıtlı tercihler */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
        <p className="text-gray-500 text-xs uppercase font-semibold tracking-wider mb-3">
          {t('savedTitle')}
        </p>
        {saved.length === 0 ? (
          <p className="text-gray-600 text-sm">{t('noneYet')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {saved.map((key, i) => {
              const pos = POSITIONS.find(p => p.key === key)!;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-5 text-right text-green-500 font-bold text-sm">{i + 1}.</span>
                  <span className="text-lg">{pos.emoji}</span>
                  <span className="text-white font-medium">{t(pos.labelKey)}</span>
                  <span className="text-gray-600 text-xs ml-1">{pos.key}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Position cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {POSITIONS.map(pos => {
          const rank = selected.indexOf(pos.key);
          const isSelected = rank !== -1;
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
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{rank + 1}</span>
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

      {/* Priority order */}
      {selected.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
          <p className="text-gray-500 text-xs uppercase font-semibold tracking-wider mb-3">
            {t('priorityOrder')}
          </p>
          <div className="space-y-2">
            {selected.map((key, i) => {
              const pos = POSITIONS.find(p => p.key === key)!;
              return (
                <div key={key} className="flex items-center gap-3 bg-gray-800 rounded-xl px-3 py-2.5">
                  <span className="w-6 text-center text-green-400 font-bold text-sm">{i + 1}.</span>
                  <span className="text-xl">{pos.emoji}</span>
                  <span className="text-white font-medium flex-1">{t(pos.labelKey)}</span>
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      className="text-gray-500 hover:text-white disabled:opacity-20 transition-colors"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      onClick={() => moveDown(i)}
                      disabled={i === selected.length - 1}
                      className="text-gray-500 hover:text-white disabled:opacity-20 transition-colors"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
