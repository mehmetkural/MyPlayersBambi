'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { ATTRIBUTES, TEAM_FORMATS, MIN_PLAYERS_FOR_TEAMS, balanceTeams, type Attribute, type Player } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { UserCheck, RefreshCw, ThumbsUp, ThumbsDown, Check, Users, Lock, Star } from 'lucide-react';

// ── Score slider ──────────────────────────────────────────────────────────────

function ScoreSlider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
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
              n <= value ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-500 hover:bg-gray-600'
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Position types & helpers ──────────────────────────────────────────────────

type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

const FORMATIONS: Record<number, [number, number, number]> = {
  1: [0, 0, 1], 2: [1, 0, 1], 3: [1, 1, 1], 4: [1, 2, 1],
  5: [2, 1, 2], 6: [2, 2, 2], 7: [2, 3, 2], 8: [3, 2, 3],
  9: [3, 3, 3], 10: [3, 4, 3], 11: [4, 3, 4],
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
      const pad = g.length === 2 ? 28 : 14;
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
        <svg viewBox="0 0 100 150" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14532d" />
              <stop offset="50%" stopColor="#166534" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>
          </defs>
          <rect width="100" height="150" fill={`url(#sg-${color})`} />
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
              style={{ fontSize: 7.5, marginTop: 2, textShadow: '0 1px 3px rgba(0,0,0,1)', maxWidth: 44, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
            >
              {player.name.split(' ')[0]}
            </span>
            <span className="font-bold leading-none" style={{ fontSize: 7, color: '#fde047', textShadow: '0 1px 3px rgba(0,0,0,1)' }}>
              {position}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Matchups ──────────────────────────────────────────────────────────────────

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

// ── Team results ──────────────────────────────────────────────────────────────

function TeamResults({ teams, tA, tB, tUnassigned }: {
  teams: ReturnType<typeof balanceTeams>;
  tA: string;
  tB: string;
  tUnassigned: string;
}) {
  const posA = assignPositions(teams.teamA);
  const posB = assignPositions(teams.teamB);
  return (
    <div className="space-y-4">
      <Matchups teamA={posA} teamB={posB} />
      <div className="grid grid-cols-2 gap-3">
        <FootballPitch positionedPlayers={posA} color="blue" title={tA} />
        <FootballPitch positionedPlayers={posB} color="red" title={tB} />
      </div>
      {teams.unassigned.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-gray-400 font-semibold text-sm mb-2">{tUnassigned}</p>
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

// ── Reaction bar ──────────────────────────────────────────────────────────────

function ReactionBar({ reaction, likes, dislikes, onReact }: {
  reaction: boolean | null;
  likes: number;
  dislikes: number;
  onReact: (liked: boolean) => void;
}) {
  const total = likes + dislikes;
  const pct = total === 0 ? null : Math.round((likes / total) * 100);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mt-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onReact(true)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
            reaction === true ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-green-400 hover:bg-gray-700'
          )}
        >
          <ThumbsUp size={16} />
          <span>{likes}</span>
        </button>
        <button
          onClick={() => onReact(false)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
            reaction === false ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-gray-700'
          )}
        >
          <ThumbsDown size={16} />
          <span>{dislikes}</span>
        </button>
        {pct !== null && (
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-semibold text-gray-300 w-10 text-right">%{pct}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface SelfRateClientProps {
  userId: string;
  isAdmin: boolean;
  existingSelfRating: Record<Attribute, number> | null;
  hasRatedSelf: boolean;
  players: Player[];
  initialTeams: { teamAIds: string[]; teamBIds: string[]; unassignedIds: string[] } | null;
  myReaction: boolean | null;
  likeCount: number;
  dislikeCount: number;
}

const DEFAULT_SCORES: Record<Attribute, number> = {
  speed: 5, agility: 5, passing: 5, shooting: 5, defense: 5, goalkeeping: 5,
};

export default function SelfRateClient({
  userId, isAdmin, existingSelfRating, hasRatedSelf, players, initialTeams, myReaction, likeCount, dislikeCount,
}: SelfRateClientProps) {
  const t = useTranslations('selfrate');
  const tRate = useTranslations('rate');
  const supabase = createClient();

  // Self-rating state
  const [scores, setScores] = useState<Record<Attribute, number>>(existingSelfRating ?? DEFAULT_SCORES);
  const [hasSaved, setHasSaved] = useState(hasRatedSelf);
  const [savingRating, setSavingRating] = useState(false);
  const [ratingFlash, setRatingFlash] = useState<'saved' | 'error' | null>(null);

  // Teams state
  const [format, setFormat] = useState(5);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(players.map(p => p.id)));
  const [teams, setTeams] = useState<ReturnType<typeof balanceTeams> | null>(() =>
    initialTeams ? buildTeams(players, initialTeams) : null
  );
  const [generated, setGenerated] = useState(false);
  const [savingTeams, setSavingTeams] = useState(false);

  // Reaction state
  const [reaction, setReaction] = useState<boolean | null>(myReaction);
  const [likes, setLikes] = useState(likeCount);
  const [dislikes, setDislikes] = useState(dislikeCount);

  async function saveRating() {
    setSavingRating(true);
    const { error } = await supabase.from('self_ratings').upsert(
      { user_id: userId, ...scores, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
    setSavingRating(false);
    if (!error) {
      setHasSaved(true);
      setRatingFlash('saved');
      setTimeout(() => setRatingFlash(null), 2000);
    } else {
      setRatingFlash('error');
      setTimeout(() => setRatingFlash(null), 2000);
    }
  }

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

  async function generate() {
    const newTeams = balanceTeams(activePlayers, format);
    setTeams(newTeams);
    setGenerated(true);
    setReaction(null);
    setLikes(0);
    setDislikes(0);
    setSavingTeams(true);
    await Promise.all([
      supabase.from('self_team_reactions').delete().eq('teams_id', 'current'),
      supabase.from('saved_self_teams').upsert({
        id: 'current',
        team_a_ids: newTeams.teamA.map(p => p.id),
        team_b_ids: newTeams.teamB.map(p => p.id),
        unassigned_ids: newTeams.unassigned.map(p => p.id),
        updated_at: new Date().toISOString(),
      }),
    ]);
    setSavingTeams(false);
  }

  async function react(liked: boolean) {
    const prev = reaction;
    const wasLiked = prev === true;
    const wasDisliked = prev === false;

    if (prev === liked) {
      setReaction(null);
      setLikes(l => liked ? l - 1 : l);
      setDislikes(d => !liked ? d - 1 : d);
      await supabase.from('self_team_reactions').delete().eq('teams_id', 'current').eq('user_id', userId);
    } else {
      setReaction(liked);
      setLikes(l => liked ? l + 1 : wasLiked ? l - 1 : l);
      setDislikes(d => !liked ? d + 1 : wasDisliked ? d - 1 : d);
      await supabase.from('self_team_reactions').upsert(
        { user_id: userId, teams_id: 'current', liked },
        { onConflict: 'user_id,teams_id' }
      );
    }
  }

  const selfRatedCount = players.length;
  const teamsUnlocked = selfRatedCount >= MIN_PLAYERS_FOR_TEAMS;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

      {/* ── Self-rating form ── */}
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserCheck className="text-green-400" size={24} />
            {t('title')}
          </h1>
          <p className="text-gray-400 text-sm mt-1">{t('subtitle')}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-5">
          {ATTRIBUTES.map(attr => (
            <ScoreSlider
              key={attr}
              label={tRate(attr as Attribute)}
              value={scores[attr]}
              onChange={v => setScores(prev => ({ ...prev, [attr]: v }))}
            />
          ))}

          {ratingFlash && (
            <p className={cn('text-sm text-center', ratingFlash === 'saved' ? 'text-green-400' : 'text-red-400')}>
              {ratingFlash === 'saved' ? t('flashSaved') : t('flashError')}
            </p>
          )}

          <button
            onClick={saveRating}
            disabled={savingRating}
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {ratingFlash === 'saved' ? <Check size={16} /> : <UserCheck size={16} />}
            {ratingFlash === 'saved' ? t('flashSaved') : savingRating ? t('saving') : hasSaved ? t('update') : t('save')}
          </button>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-gray-800" />

      {/* ── Teams section ── */}
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="text-green-400" size={20} />
            {t('teamsTitle')}
          </h2>
          <p className="text-gray-400 text-sm mt-1">{t('teamsSubtitle')}</p>
        </div>

        {isAdmin ? (
          <>
            {!teamsUnlocked ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                  <Lock size={28} className="text-gray-600" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{t('lockedTitle')}</h3>
                <p className="text-gray-400 text-sm">{t('lockedDesc', { count: MIN_PLAYERS_FOR_TEAMS })}</p>
                <p className="text-gray-600 text-xs mt-3">{selfRatedCount} / {MIN_PLAYERS_FOR_TEAMS}</p>
              </div>
            ) : (
              <>
                {/* Player selector */}
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
                  disabled={savingTeams || activePlayers.length < format * 2}
                  className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors mb-6"
                >
                  <RefreshCw size={18} className={savingTeams ? 'animate-spin' : ''} />
                  {generated ? t('regenerate') : t('generateTeams')}
                </button>
              </>
            )}
          </>
        ) : !hasSaved ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
              <Star size={28} className="text-yellow-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('rateYourselfFirst')}</h3>
            <p className="text-gray-400 text-sm">{t('rateYourselfFirstDesc')}</p>
          </div>
        ) : null}

        {/* Teams display */}
        {teams && (
          <>
            <TeamResults
              teams={teams}
              tA={t('teamA')}
              tB={t('teamB')}
              tUnassigned={t('unassigned')}
            />
            {!generated && (
              <ReactionBar reaction={reaction} likes={likes} dislikes={dislikes} onReact={react} />
            )}
          </>
        )}

        {/* No teams yet (non-admin, has rated self, no teams saved) */}
        {!teams && (hasSaved || isAdmin) && teamsUnlocked && (
          <p className="text-gray-500 text-center py-8">{t('noTeamsYet')}</p>
        )}
      </div>
    </div>
  );
}
