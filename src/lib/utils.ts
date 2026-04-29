import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Attribute = 'speed' | 'agility' | 'passing' | 'shooting' | 'defense' | 'goalkeeping';

export const ATTRIBUTES: Attribute[] = ['speed', 'agility', 'passing', 'shooting', 'defense', 'goalkeeping'];

export const TEAM_FORMATS = [
  { label: '5v5', value: 5 },
  { label: '6v6', value: 6 },
  { label: '7v7', value: 7 },
  { label: '8v8', value: 8 },
  { label: '9v9', value: 9 },
  { label: '10v10', value: 10 },
  { label: '11v11', value: 11 },
];

export const MIN_PLAYERS_FOR_TEAMS = 6;

export interface Player {
  id: string;
  name: string;
  overall?: number;
  speed?: number;
  agility?: number;
  passing?: number;
  shooting?: number;
  defense?: number;
  goalkeeping?: number;
  rating_count?: number;
}

export function balanceTeams(players: Player[], playersPerTeam: number): {
  teamA: Player[];
  teamB: Player[];
  unassigned: Player[];
} {
  const total = playersPerTeam * 2;
  const sorted = [...players].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
  const active = sorted.slice(0, total);
  const unassigned = sorted.slice(total);

  const teamA: Player[] = [];
  const teamB: Player[] = [];

  // Snake draft: 1→A, 2→B, 3→B, 4→A, 5→A ...
  active.forEach((player, i) => {
    const round = Math.floor(i / 2);
    const posInRound = i % 2;
    if (round % 2 === 0) {
      posInRound === 0 ? teamA.push(player) : teamB.push(player);
    } else {
      posInRound === 0 ? teamB.push(player) : teamA.push(player);
    }
  });

  return { teamA, teamB, unassigned };
}
