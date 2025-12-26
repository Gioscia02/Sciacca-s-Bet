
import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { X, Trophy, Medal, Crown } from 'lucide-react';

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

interface LeaderboardUser extends User {
  id: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ isOpen, onClose, currentUserId }) => {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadLeaderboard();
    }
  }, [isOpen]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // Nota: Richiede un indice composito in Firestore se i dati diventano tanti.
      // Per ora assumiamo che funzioni o che l'SDK gestisca l'ordinamento in memoria per piccoli dataset se manca l'indice.
      const q = query(collection(db!, 'users'), orderBy('balance', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const loadedUsers: LeaderboardUser[] = [];
      snapshot.forEach(doc => {
        loadedUsers.push({ id: doc.id, ...doc.data() } as LeaderboardUser);
      });
      setUsers(loadedUsers);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown size={20} className="text-yellow-400 fill-yellow-400" />;
      case 1: return <Medal size={20} className="text-slate-300 fill-slate-300" />;
      case 2: return <Medal size={20} className="text-amber-600 fill-amber-600" />;
      default: return <span className="font-bold text-slate-500 font-mono">#{index + 1}</span>;
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-all duration-300 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`bg-slate-900 w-full max-w-md h-[85vh] sm:h-[600px] sm:rounded-2xl rounded-t-2xl relative z-10 transform transition-all duration-300 flex flex-col ${isOpen ? 'translate-y-0 opacity-100 sm:scale-100' : 'translate-y-full opacity-100 sm:translate-y-0 sm:scale-95 sm:opacity-0'}`}>
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-slate-900 rounded-t-2xl">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-brand-accent/10 rounded-lg">
                <Trophy size={24} className="text-brand-accent" />
             </div>
             <div>
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Top Players</h3>
                <p className="text-brand-muted text-xs">I più ricchi di Sciacca Bet</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-brand-muted hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2">
           {loading ? (
             <div className="text-center py-10 text-brand-muted animate-pulse">Caricamento classifica...</div>
           ) : (
             users.map((user, index) => (
               <div 
                 key={user.id} 
                 className={`flex items-center gap-4 p-3 rounded-xl border ${user.id === currentUserId ? 'bg-brand-accent/10 border-brand-accent/50' : 'bg-slate-800 border-slate-700'}`}
               >
                  <div className="w-8 flex justify-center flex-shrink-0">
                    {getRankIcon(index)}
                  </div>
                  
                  <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 border border-white/10">
                     <img 
                        src={user.profilePicture || `https://ui-avatars.com/api/?name=${user.username}&background=random&color=fff`} 
                        alt={user.username}
                        className="w-full h-full object-cover" 
                     />
                  </div>

                  <div className="flex-1 min-w-0">
                     <p className={`font-bold truncate ${user.id === currentUserId ? 'text-brand-accent' : 'text-white'}`}>
                        {user.username} {user.id === currentUserId && '(Tu)'}
                     </p>
                  </div>

                  <div className="text-right font-mono font-bold text-white">
                     €{user.balance.toFixed(0)}
                  </div>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
};
