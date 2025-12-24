import React from 'react';
import { League } from '../types';

interface LeagueSelectorProps {
  selectedLeague: League;
  onSelect: (league: League) => void;
}

export const LeagueSelector: React.FC<LeagueSelectorProps> = ({ selectedLeague, onSelect }) => {
  return (
    <div className="flex overflow-x-auto gap-3 py-4 px-4 no-scrollbar">
      {Object.values(League).map((league) => (
        <button
          key={league}
          onClick={() => onSelect(league)}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
            selectedLeague === league
              ? 'bg-brand-accent text-brand-dark shadow-lg shadow-brand-accent/20'
              : 'bg-brand-card text-brand-muted hover:text-white'
          }`}
        >
          {league}
        </button>
      ))}
    </div>
  );
};