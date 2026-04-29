'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { ATTRIBUTES, type Attribute } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { CheckCircle, Star, Pencil, Users } from 'lucide-react';

interface PlayerEntry {
  id: string;
  name: string;
  rated: boolean;
  existingScores?: Record<Attribute, number>;
}

interface RateClientProps {
  players: PlayerEntry[];
  currentUserId: string;
  totalPlayers: number;
}

const SCORE_LABELS: Record<number, string> = {
  1: '1', 2: '2', 3: '3', 4: '4', 5: '5',
  6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
};

function ScoreSlider({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-300 font-medium">{label}</span>
        <span className="text-sm font-bold text-green-400 w-8 text-right">{value}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              'flex-1 h-8 rounded-lg text-xs font-semibold transition-all',
              n <= value
                ? 'bg-green-500 text-white'
                : 'bg-gray-700 text-gray-500 hover:bg-gray-600'
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RateClient({ players, currentUserId, totalPlayers }: RateClientProps) {
  const t = useTranslations('rate');
  const supabase = createClient();

  const [ratedIds, setRatedIds] = useState<Set<string>>(
    new Set(players.filter(p => p.rated).map(p => p.id))
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<Attribute, number>>({
    speed: 5,
    agility: 5,
    passing: 5,
    shooting: 5,
    defense: 5,
    goalkeeping: 5,
  });
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<{ id: string; success: boolean } | null>(null);

  const unrated = players.filter(p => !ratedIds.has(p.id));
  const rated = players.filter(p => ratedIds.has(p.id));

  function openPlayer(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const existing = players.find(p => p.id === id)?.existingScores;
    setScores(existing ?? { speed: 5, agility: 5, passing: 5, shooting: 5, defense: 5, goalkeeping: 5 });
  }

  async function submitRating(playerId: string) {
    setLoading(true);
    const { error } = await supabase.from('ratings').upsert({
      rater_id: currentUserId,
      rated_id: playerId,
      ...scores,
    }, { onConflict: 'rater_id,rated_id' });
    setLoading(false);
    if (!error) {
      setRatedIds(prev => new Set([...prev, playerId]));
      setExpanded(null);
      setFlash({ id: playerId, success: true });
      setTimeout(() => setFlash(null), 2000);
    } else {
      setFlash({ id: playerId, success: false });
      setTimeout(() => setFlash(null), 2000);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Star className="text-yellow-400" size={24} />
          {t('title')}
        </h1>
        <p className="text-gray-400 text-sm mt-1">{t('subtitle')}</p>
      </div>

      <div className="flex items-center gap-2 text-gray-400 text-sm bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 mb-6">
        <Users size={14} className="text-green-400" />
        <span>{t('registeredPlayers', { count: totalPlayers })}</span>
      </div>

      {players.length === 0 && (
        <p className="text-gray-500 text-center py-12">{t('noPlayers')}</p>
      )}

      <div className="space-y-2">
        {unrated.map(player => (
          <div key={player.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => openPlayer(player.id)}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-white font-medium">{player.name}</span>
              </div>
              <span className="text-gray-500 text-sm">
                {expanded === player.id ? '▲' : '▼'}
              </span>
            </button>

            {expanded === player.id && (
              <div className="px-4 pb-4 space-y-4 border-t border-gray-800 pt-4">
                {ATTRIBUTES.map(attr => (
                  <ScoreSlider
                    key={attr}
                    label={t(attr as Attribute)}
                    value={scores[attr]}
                    onChange={v => setScores(prev => ({ ...prev, [attr]: v }))}
                  />
                ))}

                {flash?.id === player.id && (
                  <p className={cn('text-sm text-center', flash.success ? 'text-green-400' : 'text-red-400')}>
                    {flash.success ? t('successMsg') : t('errorMsg')}
                  </p>
                )}

                <button
                  onClick={() => submitRating(player.id)}
                  disabled={loading}
                  className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {loading ? t('loading') : t('submit')}
                </button>
              </div>
            )}
          </div>
        ))}

        {rated.length > 0 && (
          <div className="mt-6">
            <p className="text-gray-600 text-xs uppercase font-semibold tracking-wider mb-2 px-1">
              {t('submitted')}
            </p>
            {rated.map(player => (
              <div key={player.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 font-bold flex-shrink-0">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-gray-400 font-medium flex-1">{player.name}</span>
                  <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                  <button
                    onClick={() => openPlayer(player.id)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded-lg hover:bg-gray-800"
                  >
                    <Pencil size={12} />
                    {t('rerate')}
                  </button>
                </div>

                {expanded === player.id && (
                  <div className="px-4 pb-4 space-y-4 border-t border-gray-800 pt-4">
                    {ATTRIBUTES.map(attr => (
                      <ScoreSlider
                        key={attr}
                        label={t(attr as Attribute)}
                        value={scores[attr]}
                        onChange={v => setScores(prev => ({ ...prev, [attr]: v }))}
                      />
                    ))}

                    {flash?.id === player.id && (
                      <p className={cn('text-sm text-center', flash.success ? 'text-green-400' : 'text-red-400')}>
                        {flash.success ? t('successMsg') : t('errorMsg')}
                      </p>
                    )}

                    <button
                      onClick={() => submitRating(player.id)}
                      disabled={loading}
                      className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
                    >
                      {loading ? t('loading') : t('update')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
