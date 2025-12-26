
import React from 'react';
import { Home, List, User } from 'lucide-react';
import { SoundService } from '../services/soundService';

type Tab = 'home' | 'bets' | 'profile';

interface BottomNavProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  const NavItem = ({ tab, icon: Icon, label }: { tab: Tab, icon: any, label: string }) => {
    const isActive = currentTab === tab;
    return (
      <button 
        onClick={() => {
            SoundService.playClick();
            onTabChange(tab);
        }}
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-brand-accent' : 'text-brand-muted'}`}
      >
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-brand-card/90 backdrop-blur-md border-t border-slate-800 flex justify-around items-center z-40 pb-safe">
      <NavItem tab="home" icon={Home} label="Partite" />
      <NavItem tab="bets" icon={List} label="Le Mie Giocate" />
      <NavItem tab="profile" icon={User} label="Profilo" />
    </div>
  );
};
