'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { balanceTeams, TEAM_FORMATS, MIN_PLAYERS_FOR_TEAMS, type Player } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Users, Lock, RefreshCw, ShieldAlert } from 'lucide-react';

interface TeamsClientProps {
  players: Player[];
  playerCount: number;
  unlocked: boolean;
}

function PlayerBadge({ player }: { player: Player }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-xl">
      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-sm flex-shrink-0">
        {player.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="text-white text-sm font-medium truncate">{player.name}</p>
        <p className="text-gray-500 text-xs">{player.overall?.toFixed(1) ?? '—'}</p>
      </div>
    </div>
  );
}

function TeamCard({ title, players, color }: { title: string; players: Player[]; color: 'blue' | 'red' }) {
  const t = useTranslations('teams');
  const avg = players.length > 0
    ? players.reduce((sum, p) => sum + (p.overall ?? 0), 0) / players.length
    : 0;

  return (
    <div className={cn(
      'rounded-2xl p-4 border',
      color === 'blue'
        ? 'bg-blue-900/20 border-blue-700/40'
        : 'bg-red-900/20 border-red-700/40'
    )}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={cn(
          'font-bold text-lg',
          color === 'blue' ? 'text-blue-300' : 'text-red-300'
        )}>
          {title}
        </h3>
        <span className={cn(
          'text-sm font-semibold px-2 py-1 rounded-lg',
          color === 'blue' ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'
        )}>
          {t('avgScore')}: {avg.toFixed(1)}
        </span>
      </div>
      <div className="space-y-2">
        {players.map(p => <PlayerBadge key={p.id} player={p} />)}
      </div>
    </div>
  );
}

export default function TeamsClient({ players, playerCount, unlocked }: TeamsClientProps) {
  const t = useTranslations('teams');
  const [format, setFormat] = useState(5);
  const [teams, setTeams] = useState<ReturnType<typeof balanceTeams> | null>(null);
  const [generated, setGenerated] = useState(false);

  if (!unlocked) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-4">
          <Lock size={36} className="text-gray-600" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{t('lockedTitle')}</h2>
        <p className="text-gray-400 mb-3">{t('lockedDesc')}</p>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Users size={16} />
          <span>
            {t('currentPlayers', { count: playerCount })}
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full max-w-xs mt-4 bg-gray-800 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${Math.min((playerCount / MIN_PLAYERS_FOR_TEAMS) * 100, 100)}%` }}
          />
        </div>
        <p className="text-gray-600 text-xs mt-1">{playerCount} / {MIN_PLAYERS_FOR_TEAMS}</p>
      </div>
    );
  }

  function generate() {
    const result = balanceTeams(players, format);
    setTeams(result);
    setGenerated(true);
  }

  const allUnrated = players.every(p => !p.overall || p.overall === 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="text-green-400" size={24} />
          {t('title')}
        </h1>
        <p className="text-gray-400 text-sm mt-1">{t('subtitle')}</p>
      </div>

      {/* Format selector */}
      <div className="mb-6">
        <p className="text-gray-400 text-sm mb-3">{t('format')}</p>
        <div className="flex flex-wrap gap-2">
          {TEAM_FORMATS.map(f => (
            <button
              key={f.value}
              onClick={() => { setFormat(f.value); setGenerated(false); setTeams(null); }}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
                format === f.value
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={generate}
        className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold py-3 rounded-xl transition-colors mb-6"
      >
        <RefreshCw size={18} className={generated ? 'animate-spin-once' : ''} />
        {generated ? t('regenerate') : t('generateTeams')}
      </button>

      {teams && (
        <div className="space-y-4">
          {allUnrated && (
            <div className="flex items-center gap-2 text-yellow-400 text-sm bg-yellow-900/20 border border-yellow-700/30 rounded-xl px-4 py-3">
              <ShieldAlert size={16} />
              <span>{t('notEnoughRated')}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TeamCard title={t('teamA')} players={teams.teamA} color="blue" />
            <TeamCard title={t('teamB')} players={teams.teamB} color="red" />
          </div>

          {teams.unassigned.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-gray-400 font-semibold mb-1">{t('unassigned')}</p>
              <p className="text-gray-600 text-xs mb-3">{t('unassignedDesc')}</p>
              <div className="space-y-2">
                {teams.unassigned.map(p => <PlayerBadge key={p.id} player={p} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
