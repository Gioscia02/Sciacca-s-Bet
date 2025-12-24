import React from 'react';
import { Match, BetSelection } from '../types';

interface MatchCardProps {
  match: Match;
  currentSlip: BetSelection[];
  onToggleSelection: (match: Match, selection: '1' | 'X' | '2', odds: number) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, currentSlip, onToggleSelection }) => {
  const matchDate = new Date(match.startTime);
  const formattedTime = matchDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const formattedDate = matchDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

  // Check if this match has a selection in the current slip
  const currentSelection = currentSlip.find(s => s.matchId === match.id);

  const OddsButton = ({ selection, value }: { selection: '1' | 'X' | '2'; value: number }) => {
    const isSelected = currentSelection?.selection === selection;
    
    return (
      <button
        onClick={() => onToggleSelection(match, selection, value)}
        className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all duration-200 border ${
          isSelected 
            ? 'bg-brand-accent text-brand-dark border-brand-accent shadow-[0_0_15px_rgba(16,185,129,0.4)] transform scale-[1.02]' 
            : 'bg-slate-800 text-brand-text border-slate-700 hover:border-brand-accent/50 active:scale-95'
        }`}
      >
        <span className={`text-xs font-bold mb-1 ${isSelected ? 'text-brand-dark' : 'text-brand-muted'}`}>{selection}</span>
        <span className="text-sm font-bold">{value.toFixed(2)}</span>
      </button>
    );
  };

  return (
    <div className="bg-brand-card rounded-xl p-4 mb-4 shadow-lg border border-slate-800">
      {/* Header Info */}
      <div className="flex justify-between items-center mb-4 text-xs text-brand-muted">
        <span>{match.league}</span>
        <span>{formattedDate} • {formattedTime}</span>
      </div>

      {/* Teams */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col items-center w-1/3 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-700 mb-2 overflow-hidden p-1">
             <img src={match.homeTeam.logoPlaceholder} alt={match.homeTeam.name} className="w-full h-full object-cover rounded-full" />
          </div>
          <span className="font-semibold text-sm leading-tight">{match.homeTeam.name}</span>
        </div>

        <div className="text-brand-muted text-xs font-bold bg-slate-800 px-2 py-1 rounded">VS</div>

        <div className="flex flex-col items-center w-1/3 text-center">
           <div className="w-12 h-12 rounded-full bg-slate-700 mb-2 overflow-hidden p-1">
             <img src={match.awayTeam.logoPlaceholder} alt={match.awayTeam.name} className="w-full h-full object-cover rounded-full" />
          </div>
          <span className="font-semibold text-sm leading-tight">{match.awayTeam.name}</span>
        </div>
      </div>

      {/* Odds */}
      <div className="grid grid-cols-3 gap-2">
        <OddsButton selection="1" value={match.odds.home} />
        <OddsButton selection="X" value={match.odds.draw} />
        <OddsButton selection="2" value={match.odds.away} />
      </div>
    </div>
  );
};