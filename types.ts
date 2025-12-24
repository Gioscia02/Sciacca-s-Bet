export interface Team {
  name: string;
  logoPlaceholder: string; // URL for placeholder
}

export interface Odds {
  home: number; // 1
  draw: number; // X
  away: number; // 2
}

export interface Match {
  id: string;
  league: string;
  homeTeam: Team;
  awayTeam: Team;
  startTime: string; // ISO string
  odds: Odds;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED';
  score?: {
    home: number;
    away: number;
  };
}

export interface BetSelection {
  matchId: string;
  matchDetails: Match;
  selection: '1' | 'X' | '2';
  oddsValue: number;
}

export interface Bet {
  id: string;
  selections: BetSelection[];
  totalOdds: number;
  amount: number;
  potentialReturn: number;
  status: 'PENDING' | 'WON' | 'LOST';
  placedAt: string;
}

export interface BalancePoint {
  date: string;
  value: number;
}

export interface User {
  username: string;
  balance: number;
  weeklyBonusDate: string;
  balanceHistory?: BalancePoint[];
}

export enum League {
  SERIE_A = 'Serie A',
  PREMIER_LEAGUE = 'Premier League',
  LA_LIGA = 'La Liga',
  CHAMPIONS_LEAGUE = 'Champions League'
}