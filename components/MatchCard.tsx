
import React from 'react';
import { Match, BetSelection } from '../types';
import { SoundService } from '../services/soundService';

interface MatchCardProps {
  match: Match & { source?: string };
  currentSlip: BetSelection[];
  onToggleSelection: (match: Match, selection: '1' | 'X' | '2', odds: number) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, currentSlip, onToggleSelection }) => {
  const matchDate = new Date(match.startTime);
  const formattedTime = matchDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const formattedDate = matchDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

  const currentSelection = currentSlip.find(s => s.matchId === match.id);

  const OddsButton = ({ selection, value }: { selection: '1' | 'X' | '2'; value: number }) => {
    const isSelected = currentSelection?.selection === selection;
    
    const handleClick = () => {
        // Se non era selezionato, suona "pop", se deseleziono suona click normale o delete
        if (!isSelected) {
            SoundService.playPop();
        } else {
            SoundService.playClick();
        }
        onToggleSelection(match, selection, value);
    };

    return (
      <button
        onClick={handleClick}
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
    <div className="bg-brand-card rounded-xl p-4 mb-4 shadow-lg border border-slate-800 animate-in fade-in slide-in-from-bottom-2 overflow-hidden relative">
      {/* Bookmaker Label */}
      <div className="absolute -right-8 top-2 rotate-45 bg-slate-700 py-1 px-10 border-b border-white/10">
        <span className="text-[7px] font-black text-brand-accent uppercase tracking-[0.2em]">{match.source || 'SNAI'}</span>
      </div>

      <div className="flex justify-between items-center mb-4 text-[10px] uppercase font-black tracking-widest text-brand-muted">
        <span className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-pulse"></div>
          {match.league}
        </span>
        <span>{formattedDate} • {formattedTime}</span>
      </div>

      <div className="flex justify-between items-center mb-6 px-2">
        <div className="flex flex-col items-center w-[40%] text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 mb-2 overflow-hidden p-2 border border-white/5 shadow-inner flex items-center justify-center">
             <img 
               src={match.homeTeam.logoPlaceholder} 
               alt="" 
               className="max-w-full max-h-full object-contain"
               loading="lazy"
               onError={(e) => {
                 (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(match.homeTeam.name)}&background=1e293b&color=10b981&bold=true&length=2`;
               }}
             />
          </div>
          <span className="font-bold text-[11px] leading-tight text-white uppercase tracking-tighter h-8 flex items-center justify-center line-clamp-2">{match.homeTeam.name}</span>
        </div>

        <div className="text-brand-muted text-[10px] font-black bg-slate-900 px-3 py-1 rounded-full border border-white/5">VS</div>

        <div className="flex flex-col items-center w-[40%] text-center">
           <div className="w-14 h-14 rounded-2xl bg-slate-900 mb-2 overflow-hidden p-2 border border-white/5 shadow-inner flex items-center justify-center">
             <img 
               src={match.awayTeam.logoPlaceholder} 
               alt="" 
               className="max-w-full max-h-full object-contain"
               loading="lazy"
               onError={(e) => {
                 (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(match.awayTeam.name)}&background=1e293b&color=10b981&bold=true&length=2`;
               }}
             />
          </div>
          <span className="font-bold text-[11px] leading-tight text-white uppercase tracking-tighter h-8 flex items-center justify-center line-clamp-2">{match.awayTeam.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <OddsButton selection="1" value={match.odds.home} />
        <OddsButton selection="X" value={match.odds.draw} />
        <OddsButton selection="2" value={match.odds.away} />
      </div>
    </div>
  );
};
