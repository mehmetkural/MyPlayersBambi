'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { balanceTeams, TEAM_FORMATS, MIN_PLAYERS_FOR_TEAMS, type Player } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Users, Lock, RefreshCw, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Link } from '@/i18n/navigation';

// ── Position assignment ──────────────────────────────────────────────────────

type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

// [numDef, _, numFwd] — no GK, MID gets the remainder
const FORMATIONS: Record<number, [number, number, number]> = {
  1:  [0, 0, 1],
  2:  [1, 0, 1],
  3:  [1, 1, 1],
  4:  [1, 2, 1],
  5:  [2, 1, 2],
  6:  [2, 2, 2],
  7:  [2, 3, 2],
  8:  [3, 2, 3],
  9:  [3, 3, 3],
  10: [3, 4, 3],
  11: [4, 3, 4],
};

interface PositionedPlayer { player: Player; position: Position }

function prefScore(player: Player, pos: Position): number {
  const idx = (player.positions ?? []).indexOf(pos);
  return idx === -1 ? -1 : 3 - idx;
}

function assignPositions(players: Player[]): PositionedPlayer[] {
  if (!players.length) return [];
  const [numDef, , numFwd] = FORMATIONS[Math.min(players.length, 11)] ?? [1, 1, 1];
  const pool = [...players];
  const result: PositionedPlayer[] = [];

  function pick(pos: Position, stat: keyof Player, count: number) {
    pool.sort((a, b) => {
      const ps = prefScore(b, pos) - prefScore(a, pos);
      if (ps !== 0) return ps;
      return ((b[stat] as number) ?? 0) - ((a[stat] as number) ?? 0);
    });
    result.push(...pool.splice(0, count).map(p => ({ player: p, position: pos })));
  }

  pick('DEF', 'defense', numDef);
  pick('FWD', 'shooting', numFwd);
  pool.forEach(p => result.push({ player: p, position: 'MID' }));

  return result;
}

function buildTeams(
  players: Player[],
  ids: { teamAIds: string[]; teamBIds: string[]; unassignedIds: string[] }
): ReturnType<typeof balanceTeams> {
  const byId = new Map(players.map(p => [p.id, p]));
  return {
    teamA: ids.teamAIds.flatMap(id => { const p = byId.get(id); return p ? [p] : []; }),
    teamB: ids.teamBIds.flatMap(id => { const p = byId.get(id); return p ? [p] : []; }),
    unassigned: ids.unassignedIds.flatMap(id => { const p = byId.get(id); return p ? [p] : []; }),
  };
}

// ── Matchups ─────────────────────────────────────────────────────────────────

const POS_ORDER: Position[] = ['FWD', 'MID', 'DEF', 'GK'];

function Matchups({ teamA, teamB }: { teamA: PositionedPlayer[]; teamB: PositionedPlayer[] }) {
  const rows = POS_ORDER.flatMap(pos => {
    const a = teamA.filter(pp => pp.position === pos).map(pp => pp.player.name);
    const b = teamB.filter(pp => pp.position === pos).map(pp => pp.player.name);
    if (!a.length && !b.length) return [];
    const len = Math.max(a.length, b.length);
    const pairs = Array.from({ length: len }, (_, i) => [a[i] ?? '—', b[i] ?? '—'] as [string, string]);
    return [{ pos, pairs }];
  });

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
      {rows.map(({ pos, pairs }) => (
        <div key={pos} className="flex items-start gap-3">
          <span className="text-yellow-400 font-bold text-xs w-8 pt-0.5 flex-shrink-0">{pos}</span>
          <div className="flex flex-col gap-1 flex-1">
            {pairs.map(([a, b], i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="flex-1 text-blue-300 font-medium text-right truncate">{a}</span>
                <span className="text-gray-600 text-xs flex-shrink-0">vs</span>
                <span className="flex-1 text-red-300 font-medium truncate">{b}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Team results (matchups + pitches) ────────────────────────────────────────

function TeamResults({ teams, t }: { teams: ReturnType<typeof balanceTeams>; t: ReturnType<typeof useTranslations<'teams'>> }) {
  const posA = assignPositions(teams.teamA);
  const posB = assignPositions(teams.teamB);
  return (
    <div className="space-y-4">
      <Matchups teamA={posA} teamB={posB} />

      <div className="grid grid-cols-2 gap-3">
        <FootballPitch positionedPlayers={posA} color="blue" title={t('teamA')} />
        <FootballPitch positionedPlayers={posB} color="red" title={t('teamB')} />
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
  );
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
          <rect x="3" y="3" width="94" height="144" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.9" />
          <line x1="3" y1="75" x2="97" y2="75" stroke="rgba(255,255,255,0.4)" strokeWidth="0.7" />
          <ellipse cx="50" cy="75" rx="13" ry="9" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.7" />
          <circle cx="50" cy="75" r="1" fill="rgba(255,255,255,0.45)" />
          <rect x="26" y="3" width="48" height="21" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
          <rect x="26" y="126" width="48" height="21" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
          <rect x="37" y="3" width="26" height="8" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
          <rect x="37" y="139" width="26" height="8" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
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
  isAdmin: boolean;
  initialTeams: { teamAIds: string[]; teamBIds: string[]; unassignedIds: string[] } | null;
  hasRatedAll: boolean;
}

export default function TeamsClient({ players, playerCount, unlocked, isAdmin, initialTeams, hasRatedAll }: TeamsClientProps) {
  const t = useTranslations('teams');
  const supabase = createClient();

  const [format, setFormat] = useState(5);
  const [teams, setTeams] = useState<ReturnType<typeof balanceTeams> | null>(() =>
    initialTeams ? buildTeams(players, initialTeams) : null
  );
  const [generated, setGenerated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(players.map(p => p.id)));

  function togglePlayer(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setTeams(null);
    setGenerated(false);
  }

  const activePlayers = players.filter(p => selectedIds.has(p.id));

  if (!isAdmin && !hasRatedAll) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
          <Star size={36} className="text-yellow-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{t('rateFirstTitle')}</h2>
        <p className="text-gray-400 mb-6">{t('rateFirstDesc')}</p>
        <Link
          href="/rate"
          className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          <Star size={16} />
          {t('rateFirstAction')}
        </Link>
      </div>
    );
  }

  if (isAdmin && !unlocked) {
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

  async function generate() {
    const newTeams = balanceTeams(activePlayers, format);
    setTeams(newTeams);
    setGenerated(true);
    setSaving(true);
    await supabase.from('saved_teams').upsert({
      id: 'current',
      team_a_ids: newTeams.teamA.map(p => p.id),
      team_b_ids: newTeams.teamB.map(p => p.id),
      unassigned_ids: newTeams.unassigned.map(p => p.id),
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
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

      {isAdmin && (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-400 text-sm font-medium">{t('thisWeek')}</p>
              <div className="flex items-center gap-3">
                <span className="text-gray-600 text-xs">{selectedIds.size}/{players.length}</span>
                <button onClick={() => { setSelectedIds(new Set(players.map(p => p.id))); setTeams(null); setGenerated(false); }} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">{t('selectAll')}</button>
                <span className="text-gray-700">·</span>
                <button onClick={() => { setSelectedIds(new Set()); setTeams(null); setGenerated(false); }} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">{t('clearAll')}</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {players.map(p => {
                const isActive = selectedIds.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlayer(p.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border',
                      isActive
                        ? 'bg-green-500/15 border-green-600 text-green-400'
                        : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-500'
                    )}
                  >
                    <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', isActive ? 'bg-green-400' : 'bg-gray-600')} />
                    {p.name}
                  </button>
                );
              })}
            </div>
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
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors mb-6"
          >
            <RefreshCw size={18} className={saving ? 'animate-spin' : ''} />
            {generated ? t('regenerate') : t('generateTeams')}
          </button>
        </>
      )}

      {teams
        ? <TeamResults teams={teams} t={t} />
        : !isAdmin && (
          <p className="text-gray-500 text-center py-12">{t('noTeamsYet')}</p>
        )
      }
    </div>
  );
}
