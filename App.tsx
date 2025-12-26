
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User as AppUser, Match, League, Bet, BetSelection, MatchSimResult } from './types';
import { fetchUpcomingMatches, simulateMatchResult } from './services/geminiService';
import { SoundService } from './services/soundService';
import { LeagueSelector } from './components/LeagueSelector';
import { MatchCard } from './components/MatchCard';
import { BetSlip } from './components/BetSlip';
import { BottomNav } from './components/BottomNav';
import { SimulationOverlay } from './components/SimulationOverlay';
import { BalanceChart } from './components/BalanceChart';
import { Leaderboard } from './components/Leaderboard';
import { SettingsModal } from './components/SettingsModal';
import { Trophy, Zap, Clock, User as UserIcon, Loader2, PlayCircle, Cpu, CheckCircle, BarChart3, TrendingUp, AlertTriangle, Gift, Settings, Camera } from 'lucide-react';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  orderBy
} from 'firebase/firestore';

const STARTING_BALANCE = 1000;
const WEEKLY_BONUS_AMOUNT = 250;
const BANKRUPTCY_THRESHOLD = 5;
const BANKRUPTCY_RELIEF = 200;

export interface SelectionWithResult {
  selection: BetSelection;
  homeScore: number;
  awayScore: number;
  isCorrect: boolean;
}

export interface DetailedSimResult {
  won: boolean;
  amount: number;
  results: SelectionWithResult[];
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const [activeTab, setActiveTab] = useState<'home' | 'bets' | 'profile'>('home');
  const [selectedLeague, setSelectedLeague] = useState<League>(League.SERIE_A);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  
  // Bonus State
  const [bonusText, setBonusText] = useState<string>('');
  const [isBonusAvailable, setIsBonusAvailable] = useState(false);
  
  const [currentSlip, setCurrentSlip] = useState<BetSelection[]>([]);
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  const [bets, setBets] = useState<Bet[]>([]);

  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<DetailedSimResult | null>(null);
  
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth!, async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadUserData(user.uid);
        await loadUserBets(user.uid);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Timer Bonus
  useEffect(() => {
    if (!userData) return;
    
    const timer = setInterval(() => {
        const now = new Date();
        const bonusDate = new Date(userData.weeklyBonusDate || 0);
        
        const diff = bonusDate.getTime() - now.getTime();
        
        if (diff <= 0) {
          setBonusText("RISCATTA ORA");
          setIsBonusAvailable(true);
        } else {
            setIsBonusAvailable(false);
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            
            if (d > 0) setBonusText(`${d}g ${h}h`);
            else setBonusText(`${h}h ${m}m ${s}s`);
        }
    }, 1000);
    return () => clearInterval(timer);
  }, [userData]);

  // Statistiche Utente Calcolate
  const userStats = useMemo(() => {
      if (!bets.length) return { totalBets: 0, winRate: 0, totalProfit: 0, biggestWin: 0 };
      
      const finishedBets = bets.filter(b => b.status !== 'PENDING');
      const wonBets = finishedBets.filter(b => b.status === 'WON');
      
      const totalProfit = finishedBets.reduce((acc, curr) => {
          return acc + (curr.status === 'WON' ? curr.potentialReturn - curr.amount : -curr.amount);
      }, 0);

      const biggestWin = wonBets.reduce((max, curr) => Math.max(max, curr.potentialReturn), 0);

      return {
          totalBets: bets.length,
          winRate: finishedBets.length > 0 ? Math.round((wonBets.length / finishedBets.length) * 100) : 0,
          totalProfit,
          biggestWin
      };
  }, [bets]);

  const loadUserData = async (uid: string) => {
    try {
      const userSnap = await getDoc(doc(db!, 'users', uid));
      if (userSnap.exists()) {
        setUserData(userSnap.data() as AppUser);
      }
    } catch (e) { console.error(e); }
  };

  const loadUserBets = async (uid: string) => {
    try {
      const q = query(collection(db!, 'bets'), where('userId', '==', uid));
      const snap = await getDocs(q);
      const b: Bet[] = [];
      snap.forEach(d => b.push({ id: d.id, ...d.data() } as Bet));
      setBets(b.sort((x,y) => new Date(y.placedAt).getTime() - new Date(x.placedAt).getTime()));
    } catch (e) { console.error(e); }
  };

  const loadMatches = useCallback(async (l: League) => {
    setLoadingMatches(true);
    const d = await fetchUpcomingMatches(l);
    setMatches(d);
    setLoadingMatches(false);
  }, []);

  useEffect(() => { 
    if (currentUser && activeTab === 'home') {
      loadMatches(selectedLeague);
    }
  }, [selectedLeague, activeTab, currentUser, loadMatches]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        const cred = await createUserWithEmailAndPassword(auth!, email, password);
        await updateProfile(cred.user, { displayName: username });
        const nextBonus = new Date(); // Subito disponibile all'iscrizione
        const newUser: AppUser = {
          username, balance: STARTING_BALANCE,
          weeklyBonusDate: nextBonus.toISOString(),
          balanceHistory: [{ date: new Date().toISOString(), value: STARTING_BALANCE }]
        };
        await setDoc(doc(db!, 'users', cred.user.uid), newUser);
        setUserData(newUser);
      } else {
        await signInWithEmailAndPassword(auth!, email, password);
      }
    } catch (err: any) { alert(err.message); }
  };

  const onToggleSelection = (ma: Match, s: '1' | 'X' | '2', o: number) => {
    setCurrentSlip(prev => {
      const exists = prev.find(x => x.matchId === ma.id);
      if (exists && exists.selection === s) {
        return prev.filter(x => x.matchId !== ma.id);
      }
      const clean = prev.filter(x => x.matchId !== ma.id);
      return [...clean, { matchId: ma.id, matchDetails: ma, selection: s, oddsValue: o }];
    });
  };

  const placeBet = async (amount: number) => {
    if (!userData || amount > userData.balance || currentSlip.length === 0 || !currentUser) return;
    
    const totalOdds = currentSlip.reduce((a,c) => a * c.oddsValue, 1);
    const newBet = {
        userId: currentUser.uid, 
        selections: currentSlip, 
        totalOdds, 
        amount,
        potentialReturn: amount * totalOdds, 
        status: 'PENDING', 
        placedAt: new Date().toISOString()
    };
    
    const newBal = userData.balance - amount;
    const newHistory = [...(userData.balanceHistory || []), { date: new Date().toISOString(), value: newBal }];
    
    try {
      await addDoc(collection(db!, 'bets'), newBet);
      await updateDoc(doc(db!, 'users', currentUser.uid), { 
          balance: newBal,
          balanceHistory: newHistory
      });
      setUserData({ ...userData, balance: newBal, balanceHistory: newHistory });
      setCurrentSlip([]);
      setIsSlipOpen(false);
      await loadUserBets(currentUser.uid);
      // alert("Giocata piazzata con successo!"); // Sound service replaces this
    } catch (error) {
      console.error("Errore:", error);
      alert("Si è verificato un errore.");
    }
  };

  const handleSimulate = async (bet: Bet) => {
    SoundService.playClick();
    setIsSimulating(true);
    setSimResult(null);
    
    await new Promise(r => setTimeout(r, 2000));
    
    const results: SelectionWithResult[] = [];
    const dbSimResults: MatchSimResult[] = [];
    
    for (const selection of bet.selections) {
        const res = await simulateMatchResult(selection.matchDetails);
        const isCorrect = selection.selection === '1' 
            ? res.homeScore > res.awayScore 
            : (selection.selection === '2' 
                ? res.awayScore > res.homeScore 
                : res.homeScore === res.awayScore);
        
        results.push({
            selection,
            homeScore: res.homeScore,
            awayScore: res.awayScore,
            isCorrect
        });

        dbSimResults.push({
            matchId: selection.matchId,
            homeScore: res.homeScore,
            awayScore: res.awayScore
        });
    }

    const won = results.every(r => r.isCorrect);
    const status = won ? 'WON' : 'LOST';
    
    if (won) {
        SoundService.playWin();
        const newBal = userData!.balance + bet.potentialReturn;
        const newHistory = [...(userData!.balanceHistory || []), { date: new Date().toISOString(), value: newBal }];
        
        await updateDoc(doc(db!, 'users', currentUser!.uid), { 
            balance: newBal,
            balanceHistory: newHistory
        });
        setUserData({ ...userData!, balance: newBal, balanceHistory: newHistory });
    } else {
        SoundService.playLoss();
    }

    await updateDoc(doc(db!, 'bets', bet.id), { 
      status, 
      simulatedResults: dbSimResults
    });

    setSimResult({ won, amount: won ? bet.potentialReturn : 0, results });
    loadUserBets(currentUser!.uid);
  };

  // Funzioni Nuove: Bonus e Reset
  const claimBonus = async () => {
    if (!isBonusAvailable || !userData || !currentUser) return;
    
    SoundService.playCoin();
    const newBal = userData.balance + WEEKLY_BONUS_AMOUNT;
    const nextBonusDate = new Date();
    nextBonusDate.setDate(nextBonusDate.getDate() + 7); // 7 giorni di cooldown
    
    const newHistory = [...(userData.balanceHistory || []), { date: new Date().toISOString(), value: newBal }];

    try {
        await updateDoc(doc(db!, 'users', currentUser.uid), {
            balance: newBal,
            weeklyBonusDate: nextBonusDate.toISOString(),
            balanceHistory: newHistory
        });
        setUserData({ 
            ...userData, 
            balance: newBal, 
            weeklyBonusDate: nextBonusDate.toISOString(), 
            balanceHistory: newHistory 
        });
        // alert(`Bonus di €${WEEKLY_BONUS_AMOUNT} riscattato!`);
    } catch (e) { console.error(e); }
  };

  const handleBankruptcy = async () => {
      if (!userData || !currentUser || userData.balance >= BANKRUPTCY_THRESHOLD) return;
      
      SoundService.playCoin();
      const newBal = BANKRUPTCY_RELIEF;
      const newHistory = [...(userData.balanceHistory || []), { date: new Date().toISOString(), value: newBal }];
      
      try {
          await updateDoc(doc(db!, 'users', currentUser.uid), {
              balance: newBal,
              balanceHistory: newHistory
          });
          setUserData({ ...userData, balance: newBal, balanceHistory: newHistory });
          // alert("Ti abbiamo ricaricato €200. Giocali con saggezza!");
      } catch (e) { console.error(e); }
  };

  const playedMatchIds = new Set(bets.flatMap(b => b.selections.map(s => s.matchId)));
  const availableMatches = matches.filter(m => !playedMatchIds.has(m.id));

  if (authLoading) return <div className="min-h-screen bg-brand-dark flex items-center justify-center text-brand-accent"><Loader2 className="animate-spin" size={48} /></div>;

  if (!currentUser || !userData) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 text-center">
        <Trophy size={60} className="text-brand-accent mb-6" />
        <h1 className="text-4xl font-black text-white mb-2 italic tracking-tighter uppercase">SCIACCA BET</h1>
        <p className="text-brand-muted mb-8">Punta virtuale, vinci reale. 🏟️</p>
        <form onSubmit={handleAuth} className="w-full max-sm:px-4 space-y-4 max-w-sm">
          {isRegistering && <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white" required />}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white" required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white" required />
          <button type="submit" className="w-full bg-brand-accent text-brand-dark font-bold py-4 rounded-xl uppercase tracking-widest hover:brightness-110">
            {isRegistering ? 'Registrati' : 'Accedi'}
          </button>
        </form>
        <button onClick={() => setIsRegistering(!isRegistering)} className="mt-6 text-brand-muted text-sm underline">{isRegistering ? 'Già iscritto? Accedi' : 'Nuovo utente? Crea account'}</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark pb-24 relative">
      {isSimulating && <SimulationOverlay result={simResult} onClose={() => { SoundService.playClick(); setIsSimulating(false); }} />}
      <Leaderboard isOpen={isLeaderboardOpen} onClose={() => { SoundService.playClick(); setIsLeaderboardOpen(false); }} currentUserId={currentUser.uid} />
      
      {currentUser && (
        <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => { SoundService.playClick(); setIsSettingsOpen(false); }} 
            currentUser={currentUser}
            currentUsername={userData.username}
            currentProfilePic={userData.profilePicture}
            onUpdate={() => loadUserData(currentUser.uid)}
        />
      )}

      <div className="sticky top-0 z-30 bg-brand-dark/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <Trophy size={20} className="text-brand-accent" />
           <span className="font-black text-xl text-white italic tracking-tighter uppercase">SCIACCA BET</span>
        </div>
        <div className="flex items-center gap-3">
             <button onClick={() => { SoundService.playClick(); setIsLeaderboardOpen(true); }} className="p-2 bg-slate-800 rounded-lg border border-slate-700 text-yellow-400 hover:bg-slate-700 transition-colors">
                <Trophy size={18} />
             </button>
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
               <Zap size={16} className="text-brand-accent fill-brand-accent" />
               <span className="font-bold text-white text-sm">€{userData.balance.toFixed(2)}</span>
            </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-4">
        {activeTab === 'home' && (
          <>
            <div className="flex items-center justify-between mb-2">
                <LeagueSelector selectedLeague={selectedLeague} onSelect={(l) => { SoundService.playClick(); setSelectedLeague(l); }} />
            </div>
            
            <div className="flex items-center gap-2 mb-4 px-2">
                <div className="flex items-center gap-1.5 bg-brand-accent/10 border border-brand-accent/20 px-2 py-1 rounded text-[10px] font-black text-brand-accent uppercase tracking-wider">
                    <Cpu size={10} className="text-brand-accent" /> Generatore Ufficiale 2025
                </div>
                <span className="text-[10px] text-brand-muted uppercase font-bold">Quote Reali & Payout 105%</span>
            </div>

            <div className="space-y-4">
                {loadingMatches ? (
                  <div className="text-center py-20 text-brand-muted flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-brand-accent" />
                    <span className="text-xs uppercase font-bold tracking-widest">Creazione palinsesto settimanale...</span>
                  </div>
                ) : availableMatches.length === 0 ? (
                  <div className="text-center py-20 text-brand-muted flex flex-col items-center">
                    <CheckCircle className="text-brand-accent mb-2" size={32} />
                    <p className="text-sm font-bold">Hai giocato tutte le partite disponibili!</p>
                    <p className="text-xs mt-1">Torna la prossima settimana per nuovi match.</p>
                  </div>
                ) : (
                  availableMatches.map(m => (
                    <MatchCard 
                      key={m.id} 
                      match={m} 
                      currentSlip={currentSlip} 
                      onToggleSelection={onToggleSelection} 
                    />
                  ))
                )}
            </div>
          </>
        )}

        {activeTab === 'bets' && (
           <div className="py-4">
              <h2 className="text-2xl font-black text-white mb-6 italic uppercase">Storico Giocate</h2>
              <div className="space-y-4">
                {bets.length === 0 ? <p className="text-center py-20 text-brand-muted">Nessuna giocata trovata.</p> : 
                bets.map(b => (
                  <div key={b.id} className="bg-brand-card p-5 rounded-2xl border border-white/5 shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] text-brand-muted font-mono tracking-wider">{new Date(b.placedAt).toLocaleDateString()}</span>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${b.status === 'WON' ? 'bg-emerald-500/20 text-brand-accent' : b.status === 'LOST' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{b.status === 'PENDING' ? 'IN CORSO' : b.status}</span>
                    </div>
                    
                    <div className="flex flex-col gap-3 mb-4">
                      {b.selections.map(sel => {
                        const simRes = b.simulatedResults?.find(r => r.matchId === sel.matchId);
                        return (
                          <div key={sel.matchId} className="flex flex-col gap-1">
                            <div className="flex justify-between items-center text-white font-bold text-sm">
                              <span>{sel.matchDetails.homeTeam.name} - {sel.matchDetails.awayTeam.name}</span>
                              {simRes && (
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-brand-accent tabular-nums">
                                  {simRes.homeScore} - {simRes.awayScore}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-brand-muted">
                              <span>Esito: {sel.selection}</span>
                              <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                              <span>Quota: {sel.oddsValue.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-between items-end border-t border-white/5 pt-4">
                        <div>
                            <p className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">Importo Giocato</p>
                            <p className="text-white font-black">€{b.amount.toFixed(2)}</p>
                        </div>
                        {b.status === 'PENDING' ? (
                            <button onClick={() => handleSimulate(b)} className="bg-brand-accent text-brand-dark text-xs font-black px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-brand-accent/20 active:scale-95 transition-transform">
                                <PlayCircle size={14}/> SIMULA
                            </button>
                        ) : b.status === 'WON' ? (
                            <div className="text-right">
                                <p className="text-[10px] text-brand-accent uppercase font-bold tracking-widest">Vincita</p>
                                <div className="text-brand-accent font-black text-xl tracking-tight">+€{b.potentialReturn.toFixed(2)}</div>
                            </div>
                        ) : (
                            <div className="text-right">
                                <p className="text-[10px] text-red-400 uppercase font-bold tracking-widest">Persa</p>
                                <div className="text-red-400 font-black text-xl tracking-tight">€0.00</div>
                            </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}

        {activeTab === 'profile' && (
           <div className="py-6 px-4">
              <div className="relative mb-8 text-center">
                   <button 
                      onClick={() => { SoundService.playClick(); setIsSettingsOpen(true); }}
                      className="absolute right-0 top-0 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full border border-slate-700 transition-colors"
                   >
                       <Settings size={20} />
                   </button>

                  <div 
                      className="w-24 h-24 bg-slate-800 rounded-full mx-auto flex items-center justify-center text-brand-accent border-4 border-slate-700 mb-4 shadow-xl overflow-hidden relative group cursor-pointer"
                      onClick={() => { SoundService.playClick(); setIsSettingsOpen(true); }}
                  >
                     <img 
                        src={userData.profilePicture || `https://ui-avatars.com/api/?name=${userData.username}&background=random&color=fff&size=128`} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                     />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <Camera className="text-white" size={24} />
                     </div>
                  </div>
                  <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">{userData.username}</h2>
                  <p className="text-brand-muted text-xs uppercase tracking-widest mt-1">Membro Ufficiale</p>
              </div>
              
              <BalanceChart history={userData.balanceHistory || []} currentBalance={userData.balance} />
              
              {/* Statistiche Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                 <div className="bg-slate-800 p-4 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 mb-2 text-brand-muted">
                        <BarChart3 size={16} />
                        <span className="text-[10px] uppercase font-bold">Win Rate</span>
                    </div>
                    <span className="text-2xl font-black text-white">{userStats.winRate}%</span>
                 </div>
                 <div className="bg-slate-800 p-4 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 mb-2 text-brand-muted">
                        <TrendingUp size={16} />
                        <span className="text-[10px] uppercase font-bold">Profitto Netto</span>
                    </div>
                    <span className={`text-2xl font-black ${userStats.totalProfit >= 0 ? 'text-brand-accent' : 'text-red-400'}`}>
                        {userStats.totalProfit >= 0 ? '+' : ''}€{userStats.totalProfit.toFixed(0)}
                    </span>
                 </div>
                 <div className="bg-slate-800 p-4 rounded-xl border border-white/5 col-span-2">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 mb-1 text-brand-muted">
                                <Trophy size={16} className="text-yellow-400" />
                                <span className="text-[10px] uppercase font-bold">Miglior Vincita</span>
                            </div>
                            <span className="text-2xl font-black text-white">€{userStats.biggestWin.toFixed(2)}</span>
                        </div>
                        <div className="text-right">
                             <div className="text-[10px] uppercase font-bold text-brand-muted mb-1">Giocate Totali</div>
                             <span className="text-xl font-bold text-white">{userStats.totalBets}</span>
                        </div>
                    </div>
                 </div>
              </div>

              {/* Azioni Account (Bonus & Reset) */}
              <div className="space-y-4 mb-8">
                  {/* Bonus Card */}
                  <div className={`border p-6 rounded-2xl relative overflow-hidden transition-all ${isBonusAvailable ? 'bg-brand-accent/10 border-brand-accent cursor-pointer active:scale-95' : 'bg-slate-800 border-slate-700 opacity-70'}`} onClick={claimBonus}>
                      <div className="flex items-center gap-4 relative z-10">
                          <div className={`p-3 rounded-full ${isBonusAvailable ? 'bg-brand-accent text-brand-dark' : 'bg-slate-700 text-slate-500'}`}>
                              <Gift size={24} />
                          </div>
                          <div>
                              <p className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">Bonus Settimanale</p>
                              <h3 className={`text-xl font-black uppercase tracking-tighter ${isBonusAvailable ? 'text-brand-accent' : 'text-white'}`}>{bonusText}</h3>
                          </div>
                      </div>
                  </div>

                  {/* Bankruptcy Relief */}
                  {userData.balance < BANKRUPTCY_THRESHOLD && (
                      <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-2xl flex items-center justify-between cursor-pointer active:scale-95 transition-transform" onClick={handleBankruptcy}>
                          <div>
                              <p className="text-[10px] text-red-400 uppercase font-bold tracking-widest mb-1 flex items-center gap-1"><AlertTriangle size={12}/> Fondi Esauriti</p>
                              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Ricarica €{BANKRUPTCY_RELIEF}</h3>
                          </div>
                          <div className="bg-red-500 text-white p-2 rounded-lg font-bold text-xs uppercase">SOS</div>
                      </div>
                  )}
              </div>

              <button onClick={() => signOut(auth!)} className="w-full bg-slate-800 text-red-400 py-4 rounded-xl border border-red-400/20 font-bold uppercase tracking-widest text-sm active:bg-red-500/10 transition-colors">Esci</button>
           </div>
        )}
      </div>

      <BottomNav currentTab={activeTab} onTabChange={setActiveTab} />
      
      {currentSlip.length > 0 && !isSlipOpen && activeTab === 'home' && (
        <div className="fixed bottom-20 left-4 right-4 z-40 animate-in slide-in-from-bottom-4">
            <button onClick={() => { SoundService.playClick(); setIsSlipOpen(true); }} className="w-full bg-brand-accent text-brand-dark rounded-xl p-4 shadow-2xl flex justify-between items-center transform active:scale-95 transition-all">
                <span className="font-black italic uppercase text-sm tracking-tight">Schedina Attiva ({currentSlip.length})</span>
                <div className="bg-brand-dark/20 px-3 py-1 rounded-lg font-bold text-xs">Visualizza</div>
            </button>
        </div>
      )}

      <BetSlip selections={currentSlip} userBalance={userData.balance} isOpen={isSlipOpen} onClose={() => { SoundService.playClick(); setIsSlipOpen(false); }} onRemoveSelection={id => setCurrentSlip(s => s.filter(x => x.matchId !== id))} onConfirm={placeBet} />
    </div>
  );
}
