'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ATTRIBUTES, type Player, type Attribute } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';

const MEDALS = ['🥇', '🥈', '🥉'];

const CATEGORY_KEYS = ['overall', ...ATTRIBUTES] as const;
type Category = typeof CATEGORY_KEYS[number];

export default function LeaderboardClient({ players }: { players: Player[] }) {
  const t = useTranslations('leaderboard');
  const [category, setCategory] = useState<Category>('overall');

  const sorted = [...players].sort((a, b) => {
    const aVal = category === 'overall' ? (a.overall ?? 0) : (a[category as Attribute] ?? 0);
    const bVal = category === 'overall' ? (b.overall ?? 0) : (b[category as Attribute] ?? 0);
    return bVal - aVal;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="text-yellow-400" size={24} />
          {t('title')}
        </h1>
        <p className="text-gray-400 text-sm mt-1">{t('subtitle')}</p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
        {CATEGORY_KEYS.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
              category === cat
                ? 'bg-green-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            )}
          >
            {t(cat as 'overall')}
          </button>
        ))}
      </div>

      {players.length === 0 ? (
        <p className="text-gray-500 text-center py-12">{t('noData')}</p>
      ) : (
        <div className="space-y-3">
          {/* Top 3 podium */}
          {sorted.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[sorted[1], sorted[0], sorted[2]].map((player, podiumIdx) => {
                const realRank = podiumIdx === 0 ? 1 : podiumIdx === 1 ? 0 : 2;
                const score = category === 'overall'
                  ? player.overall
                  : player[category as Attribute];
                const heights = ['h-28', 'h-36', 'h-24'];
                return (
                  <div key={player.id} className="flex flex-col items-center">
                    <div
                      className={cn(
                        'w-full rounded-2xl flex flex-col items-center justify-end pb-4 pt-2',
                        heights[podiumIdx],
                        realRank === 0
                          ? 'bg-gradient-to-b from-yellow-500/30 to-yellow-600/10 border border-yellow-500/40'
                          : realRank === 1
                          ? 'bg-gradient-to-b from-gray-400/20 to-gray-500/10 border border-gray-500/40'
                          : 'bg-gradient-to-b from-orange-700/20 to-orange-800/10 border border-orange-700/40'
                      )}
                    >
                      <span className="text-3xl mb-1">{MEDALS[realRank]}</span>
                      <p className="text-white font-semibold text-sm text-center px-1 leading-tight">
                        {player.name}
                      </p>
                      <p className={cn(
                        'text-lg font-bold mt-1',
                        realRank === 0 ? 'text-yellow-400' : realRank === 1 ? 'text-gray-300' : 'text-orange-400'
                      )}>
                        {score?.toFixed(1) ?? '—'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full list */}
          {sorted.map((player, i) => {
            const score = category === 'overall'
              ? player.overall
              : player[category as Attribute];
            const isTop3 = i < 3;
            return (
              <div
                key={player.id}
                className={cn(
                  'flex items-center gap-4 px-4 py-3 rounded-xl',
                  isTop3 ? 'bg-gray-800/80 border border-gray-700' : 'bg-gray-900'
                )}
              >
                <div className="w-8 text-center">
                  {i < 3 ? (
                    <span className="text-xl">{MEDALS[i]}</span>
                  ) : (
                    <span className="text-gray-500 font-medium text-sm">{i + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{player.name}</p>
                  <p className="text-gray-500 text-xs">
                    {player.rating_count ?? 0} {t('ratings')}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    'font-bold text-lg',
                    i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-green-400'
                  )}>
                    {score != null ? score.toFixed(1) : '—'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
