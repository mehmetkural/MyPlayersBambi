'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { balanceTeams, TEAM_FORMATS, MIN_PLAYERS_FOR_TEAMS, type Player } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Users, Lock, RefreshCw } from 'lucide-react';

// ── Position assignment ──────────────────────────────────────────────────────

type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

const FORMATIONS: Record<number, [number, number, number]> = {
  1: [0, 0, 0], 2: [0, 1, 0], 3: [0, 1, 1], 4: [1, 1, 1],
  5: [1, 2, 1], 6: [2, 2, 1], 7: [2, 3, 1], 8: [2, 3, 2],
  9: [3, 3, 2], 10: [3, 4, 2], 11: [4, 4, 2],
};

interface PositionedPlayer { player: Player; position: Position }

function assignPositions(players: Player[]): PositionedPlayer[] {
  if (!players.length) return [];
  const [numDef, , numFwd] = FORMATIONS[Math.min(players.length, 11)] ?? [1, 1, 1];
  const pool = [...players];

  pool.sort((a, b) => (b.goalkeeping ?? 0) - (a.goalkeeping ?? 0));
  const gk = pool.shift()!;

  pool.sort((a, b) => (b.defense ?? 0) - (a.defense ?? 0));
  const defs = pool.splice(0, numDef);

  pool.sort((a, b) => (b.shooting ?? 0) - (a.shooting ?? 0));
  const fwds = pool.splice(0, numFwd);

  return [
    { player: gk, position: 'GK' },
    ...defs.map(p => ({ player: p, position: 'DEF' as Position })),
    ...pool.map(p => ({ player: p, position: 'MID' as Position })),
    ...fwds.map(p => ({ player: p, position: 'FWD' as Position })),
  ];
}

// ── Football pitch ────────────────────────────────────────────────────────────

const POS_Y: Record<Position, number> = { GK: 84, DEF: 65, MID: 43, FWD: 19 };

function FootballPitch({ positionedPlayers, color, title }: {
  positionedPlayers: PositionedPlayer[];
  color: 'blue' | 'red';
  title: string;
}) {
  const groups: Record<Position, Player[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const pp of positionedPlayers) groups[pp.position].push(pp.player);

  const dots: Array<{ player: Player; position: Position; x: number; y: number }> = [];
  for (const pos of ['GK', 'DEF', 'MID', 'FWD'] as Position[]) {
    const g = groups[pos];
    g.forEach((p, i) => {
      const pad = 14;
      const x = g.length === 1 ? 50 : pad + (i * (100 - 2 * pad)) / (g.length - 1);
      dots.push({ player: p, position: pos, x, y: POS_Y[pos] });
    });
  }

  const isBlue = color === 'blue';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={cn('text-xs font-bold tracking-wide uppercase', isBlue ? 'text-blue-300' : 'text-red-300')}>
        {title}
      </span>
      <div className="relative w-full" style={{ aspectRatio: '2/3' }}>
        <svg
          viewBox="0 0 100 150"
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`g-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14532d" />
              <stop offset="50%" stopColor="#166534" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>
          </defs>
          <rect width="100" height="150" fill={`url(#g-${color})`} />
          {/* outer border */}
          <rect x="3" y="3" width="94" height="144" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.9" />
          {/* halfway line */}
          <line x1="3" y1="75" x2="97" y2="75" stroke="rgba(255,255,255,0.4)" strokeWidth="0.7" />
          {/* center circle (ellipse to compensate 2:3 aspect) */}
          <ellipse cx="50" cy="75" rx="13" ry="9" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.7" />
          <circle cx="50" cy="75" r="1" fill="rgba(255,255,255,0.45)" />
          {/* top penalty area */}
          <rect x="26" y="3" width="48" height="21" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
          {/* bottom penalty area */}
          <rect x="26" y="126" width="48" height="21" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
          {/* top goal */}
          <rect x="37" y="3" width="26" height="8" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
          {/* bottom goal */}
          <rect x="37" y="139" width="26" height="8" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
          {/* penalty spots */}
          <circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.45)" />
          <circle cx="50" cy="132" r="0.8" fill="rgba(255,255,255,0.45)" />
        </svg>

        {dots.map(({ player, position, x, y }) => (
          <div
            key={player.id}
            className="absolute flex flex-col items-center"
            style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', zIndex: 10 }}
          >
            <div
              className={cn(
                'rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2',
                isBlue ? 'bg-blue-600 border-blue-300' : 'bg-red-600 border-red-300'
              )}
              style={{ width: 26, height: 26, fontSize: 10 }}
            >
              {player.name.charAt(0).toUpperCase()}
            </div>
            <span
              className="text-white font-medium text-center leading-none"
              style={{
                fontSize: 7.5,
                marginTop: 2,
                textShadow: '0 1px 3px rgba(0,0,0,1)',
                maxWidth: 44,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
            >
              {player.name.split(' ')[0]}
            </span>
            <span
              className="font-bold leading-none"
              style={{ fontSize: 7, color: '#fde047', textShadow: '0 1px 3px rgba(0,0,0,1)' }}
            >
              {position}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface TeamsClientProps {
  players: Player[];
  playerCount: number;
  unlocked: boolean;
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
          <span>{t('currentPlayers', { count: playerCount })}</span>
        </div>
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
    setTeams(balanceTeams(players, format));
    setGenerated(true);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="text-green-400" size={24} />
          {t('title')}
        </h1>
        <p className="text-gray-400 text-sm mt-1">{t('subtitle')}</p>
      </div>

      <div className="mb-6">
        <p className="text-gray-400 text-sm mb-3">{t('format')}</p>
        <div className="flex flex-wrap gap-2">
          {TEAM_FORMATS.map(f => (
            <button
              key={f.value}
              onClick={() => { setFormat(f.value); setGenerated(false); setTeams(null); }}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
                format === f.value ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
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
        <RefreshCw size={18} />
        {generated ? t('regenerate') : t('generateTeams')}
      </button>

      {teams && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FootballPitch
              positionedPlayers={assignPositions(teams.teamA)}
              color="blue"
              title={t('teamA')}
            />
            <FootballPitch
              positionedPlayers={assignPositions(teams.teamB)}
              color="red"
              title={t('teamB')}
            />
          </div>

          {teams.unassigned.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-gray-400 font-semibold text-sm mb-2">{t('unassigned')}</p>
              <div className="flex flex-wrap gap-2">
                {teams.unassigned.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 rounded-xl">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-xs">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white text-sm">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
