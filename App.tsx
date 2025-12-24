import React, { useState, useEffect } from 'react';
import { User as AppUser, Match, League, Bet, BetSelection } from './types';
import { fetchUpcomingMatches, simulateMatchResult } from './services/geminiService';
import { LeagueSelector } from './components/LeagueSelector';
import { MatchCard } from './components/MatchCard';
import { BetSlip } from './components/BetSlip';
import { BottomNav } from './components/BottomNav';
import { BalanceChart } from './components/BalanceChart';
import { TrendingUp, Coins, Trophy, LogOut, Loader2, PlayCircle, Receipt, Mail, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  updateProfile,
  User as FirebaseUser,
  Auth
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
  Firestore
} from 'firebase/firestore';

const STARTING_BALANCE = 1000;
const WEEKLY_BONUS = 500;

export default function App() {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState('');

  // --- App State ---
  const [activeTab, setActiveTab] = useState<'home' | 'bets' | 'profile'>('home');
  const [selectedLeague, setSelectedLeague] = useState<League>(League.SERIE_A);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  
  // Betting Logic
  const [currentSlip, setCurrentSlip] = useState<BetSelection[]>([]);
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  const [bets, setBets] = useState<Bet[]>([]);

  // --- 1. Auth Listener ---
  useEffect(() => {
    // Local reference to handle potential undefined export
    const _auth = auth;
    
    if (!_auth) {
        console.error("Firebase Auth not initialized");
        setAuthLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(_auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadUserData(user.uid);
        await loadUserBets(user.uid);
      } else {
        setUserData(null);
        setBets([]);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. Data Loading (Firestore) ---
  const loadUserData = async (uid: string) => {
    const _db = db;
    if (!_db) return;
    
    try {
      const userRef = doc(_db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data() as AppUser;
        // Ensure balanceHistory exists (migration for existing users)
        if (!data.balanceHistory) {
            data.balanceHistory = [{ date: new Date().toISOString(), value: data.balance }];
        }
        setUserData(data);
        checkWeeklyBonus(uid, data);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const loadUserBets = async (uid: string) => {
    const _db = db;
    if (!_db) return;

    try {
      // FIX: Removed orderBy from Firestore query to avoid need for composite index.
      // We filter by ID here and sort by date in JavaScript below.
      const q = query(
        collection(_db, 'bets'), 
        where('userId', '==', uid)
      );
      
      const querySnapshot = await getDocs(q);
      const loadedBets: Bet[] = [];
      querySnapshot.forEach((doc) => {
        loadedBets.push({ id: doc.id, ...doc.data() } as Bet);
      });
      
      // Client-side sorting (Newest first)
      loadedBets.sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
      
      setBets(loadedBets);
    } catch (error) {
       console.error("Error loading bets:", error);
    }
  };

  // --- 3. Business Logic ---

  // Match Data
  useEffect(() => {
    if (currentUser && activeTab === 'home') {
      loadMatches(selectedLeague);
    }
  }, [currentUser, selectedLeague, activeTab]);

  const loadMatches = async (league: League) => {
    setLoadingMatches(true);
    const data = await fetchUpcomingMatches(league);
    setMatches(data);
    setLoadingMatches(false);
  };

  const checkWeeklyBonus = async (uid: string, currentUserData: AppUser) => {
    const _db = db;
    if (!_db) return;

    const lastBonus = new Date(currentUserData.weeklyBonusDate);
    const now = new Date();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
    if (now.getTime() - lastBonus.getTime() > oneWeek) {
      const newBalance = currentUserData.balance + WEEKLY_BONUS;
      const newDate = now.toISOString();
      const newHistory = [...(currentUserData.balanceHistory || []), { date: newDate, value: newBalance }];
      
      // Update Local
      setUserData({
        ...currentUserData,
        balance: newBalance,
        weeklyBonusDate: newDate,
        balanceHistory: newHistory
      });
      
      // Update Firestore
      const userRef = doc(_db, 'users', uid);
      await updateDoc(userRef, {
        balance: newBalance,
        weeklyBonusDate: newDate,
        balanceHistory: newHistory
      });
      
      alert(`🎉 Bonus settimanale accreditato! +€${WEEKLY_BONUS}`);
    }
  };

  // --- 4. Auth Handlers ---

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    // Local capture for type narrowing
    const _auth = auth;
    const _db = db;

    if (!_auth || !_db) {
        setAuthError("Firebase non inizializzato. Riprova più tardi.");
        return;
    }

    try {
      if (isRegistering) {
        // Register
        const userCredential = await createUserWithEmailAndPassword(_auth, email, password);
        const user = userCredential.user;
        
        // Update Profile Name
        await updateProfile(user, { displayName: username });
        
        // Create Firestore Document with Balance History
        const newUserDoc: AppUser = {
          username: username,
          balance: STARTING_BALANCE,
          weeklyBonusDate: new Date().toISOString(),
          balanceHistory: [{ date: new Date().toISOString(), value: STARTING_BALANCE }]
        };
        
        await setDoc(doc(_db, 'users', user.uid), newUserDoc);
        setUserData(newUserDoc);
        
      } else {
        // Login
        await signInWithEmailAndPassword(_auth, email, password);
        // Data loading handled by onAuthStateChanged
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setAuthError('Email o password non validi.');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('Email già registrata.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('La password deve essere di almeno 6 caratteri.');
      } else {
        setAuthError('Errore durante l\'autenticazione: ' + err.message);
      }
    }
  };

  const handleLogout = async () => {
    const _auth = auth;
    if (_auth) {
        await signOut(_auth);
        setCurrentUser(null);
        setUserData(null);
        setBets([]);
        setAuthError('');
        setEmail('');
        setPassword('');
    }
  };

  // --- 5. Betting Handlers ---
  
  const handleToggleSelection = (match: Match, selection: '1' | 'X' | '2', odds: number) => {
    setCurrentSlip(prev => {
      const existingIndex = prev.findIndex(item => item.matchId === match.id);
      
      if (existingIndex >= 0 && prev[existingIndex].selection === selection) {
        return prev.filter((_, i) => i !== existingIndex);
      }
      
      const newSelection: BetSelection = { 
        matchId: match.id, 
        matchDetails: match, 
        selection, 
        oddsValue: odds 
      };

      if (existingIndex >= 0) {
        const newSlip = [...prev];
        newSlip[existingIndex] = newSelection;
        return newSlip;
      } else {
        return [...prev, newSelection];
      }
    });
  };

  const handleRemoveFromSlip = (matchId: string) => {
    setCurrentSlip(prev => prev.filter(item => item.matchId !== matchId));
  };

  const placeBet = async (amount: number) => {
    const _db = db;
    if (!userData || !currentUser || !_db || currentSlip.length === 0) return;

    if (userData.balance < amount) {
        alert("Saldo insufficiente!");
        return;
    }

    const totalOdds = currentSlip.reduce((acc, curr) => acc * curr.oddsValue, 1);
    const now = new Date().toISOString();

    const newBet: any = { 
      userId: currentUser.uid,
      selections: [...currentSlip],
      totalOdds: totalOdds,
      amount: amount,
      potentialReturn: amount * totalOdds,
      status: 'PENDING',
      placedAt: now
    };

    // Calculate new balance
    const newBalance = userData.balance - amount;
    const newHistory = [...(userData.balanceHistory || []), { date: now, value: newBalance }];

    // Optimistic Update
    setUserData({ ...userData, balance: newBalance, balanceHistory: newHistory });
    
    try {
        // Firestore Transactions
        // 1. Add Bet
        const betRef = await addDoc(collection(_db, 'bets'), newBet);
        const betWithId = { ...newBet, id: betRef.id } as Bet;
        setBets([betWithId, ...bets]);

        // 2. Update Balance & History
        const userRef = doc(_db, 'users', currentUser.uid);
        await updateDoc(userRef, { 
            balance: newBalance,
            balanceHistory: newHistory
        });
        
        setCurrentSlip([]);
        setIsSlipOpen(false);
    } catch (e) {
        console.error("Error placing bet", e);
        // Rollback optimistic update
        setUserData({ ...userData, balance: userData.balance }); // revert
        alert("Errore nel piazzare la scommessa. Riprova.");
    }
  };

  // --- 6. Simulation Logic ---
  const simulateBetResult = async (bet: Bet) => {
    const _db = db;
    if (bet.status !== 'PENDING' || !_db || !currentUser || !userData) return;

    let allWon = true;
    const updatedSelections = [...bet.selections];
    
    // Simulate matches
    for (const selection of updatedSelections) {
       const result = await simulateMatchResult(selection.matchDetails);
       
       let selectionWon = false;
       if (selection.selection === '1' && result.homeScore > result.awayScore) selectionWon = true;
       else if (selection.selection === '2' && result.awayScore > result.homeScore) selectionWon = true;
       else if (selection.selection === 'X' && result.homeScore === result.awayScore) selectionWon = true;

       if (!selectionWon) {
         allWon = false;
       }
       
       selection.matchDetails.score = {
         home: result.homeScore,
         away: result.awayScore
       };
    }

    const newStatus = allWon ? 'WON' : 'LOST';
    const updatedBet = {
      ...bet,
      selections: updatedSelections,
      status: newStatus,
    };

    // Prepare User Updates
    let newUserBalance = userData.balance;
    let newHistory = userData.balanceHistory || [];

    if (allWon) {
        newUserBalance += bet.potentialReturn;
        newHistory = [...newHistory, { date: new Date().toISOString(), value: newUserBalance }];
    }

    // Update Local State
    setBets(prev => prev.map(b => b.id === bet.id ? updatedBet as Bet : b));
    if (allWon) {
        setUserData({ ...userData, balance: newUserBalance, balanceHistory: newHistory });
    }

    try {
        // Update Bet in Firestore
        const betRef = doc(_db, 'bets', bet.id);
        await updateDoc(betRef, {
            status: newStatus,
            selections: updatedSelections // Store scores
        });

        // If Won, Update Balance and History
        if (allWon) {
            const userRef = doc(_db, 'users', currentUser.uid);
            await updateDoc(userRef, { 
                balance: newUserBalance,
                balanceHistory: newHistory
            });
            alert(`Hai vinto €${bet.potentialReturn.toFixed(2)}!`);
        }
    } catch (e) {
        console.error("Error updating simulation", e);
    }
  };

  // --- RENDER ---

  if (authLoading) {
      return (
        <div className="min-h-screen bg-brand-dark flex items-center justify-center text-brand-accent">
            <Loader2 size={40} className="animate-spin" />
        </div>
      );
  }

  // LOGIN / REGISTER SCREEN
  if (!currentUser || !userData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-brand-dark text-center relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-brand-accent/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[100px]"></div>

        <div className="z-10 w-full max-w-md">
            <div className="w-24 h-24 bg-brand-card rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-brand-accent/20 mx-auto border border-slate-700">
            <TrendingUp size={48} className="text-brand-accent" />
            </div>
            <h1 className="text-4xl font-bold mb-3 text-white">FantaBet</h1>
            <p className="text-brand-muted mb-10 text-lg">Il simulatore di scommesse n.1</p>
            
            <form onSubmit={handleAuth} className="space-y-4 text-left">
                {isRegistering && (
                    <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        <input 
                            type="text" 
                            placeholder="Username" 
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-4 pl-12 text-white placeholder-slate-500 focus:outline-none focus:border-brand-accent transition-all focus:ring-1 focus:ring-brand-accent"
                            required
                        />
                    </div>
                )}
                
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input 
                        type="email" 
                        placeholder="Email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-4 pl-12 text-white placeholder-slate-500 focus:outline-none focus:border-brand-accent transition-all focus:ring-1 focus:ring-brand-accent"
                        required
                    />
                </div>

                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-4 pl-12 text-white placeholder-slate-500 focus:outline-none focus:border-brand-accent transition-all focus:ring-1 focus:ring-brand-accent"
                        required
                        minLength={6}
                    />
                </div>

                {authError && (
                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                        <AlertCircle size={16} />
                        {authError}
                    </div>
                )}

                <button type="submit" className="w-full bg-brand-accent text-brand-dark font-bold rounded-xl py-4 hover:bg-emerald-400 transition-all shadow-lg hover:shadow-brand-accent/25 hover:-translate-y-0.5 mt-4">
                    {isRegistering ? 'Crea Account' : 'Accedi'}
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-800">
                <p className="text-brand-muted text-sm">
                    {isRegistering ? "Hai già un account?" : "Non hai un account?"}
                    <button 
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setAuthError('');
                        }}
                        className="text-brand-accent font-bold ml-2 hover:underline"
                    >
                        {isRegistering ? "Accedi" : "Registrati ora"}
                    </button>
                </p>
                {!isRegistering && (
                    <p className="mt-4 text-xs text-slate-600">
                        Effettuando il login, i tuoi dati e le tue scommesse verranno salvati in cloud.
                    </p>
                )}
            </div>
        </div>
      </div>
    );
  }

  // APP INTERFACE
  return (
    <div className="min-h-screen bg-brand-dark pb-24 text-slate-200">
      
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-brand-dark/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-brand-accent rounded-lg flex items-center justify-center shadow-lg shadow-brand-accent/20">
             <TrendingUp size={18} className="text-brand-dark" />
           </div>
           <span className="font-bold text-lg text-white tracking-tight">FantaBet</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 shadow-inner">
           <Coins size={16} className="text-yellow-400" />
           <span className="font-mono font-bold text-yellow-400">€{userData.balance.toFixed(2)}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto">
        
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div>
            <LeagueSelector selectedLeague={selectedLeague} onSelect={setSelectedLeague} />
            
            <div className="px-4 mt-2 mb-20">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-brand-accent rounded-full"></span>
                Partite in Evidenza
              </h2>
              
              {loadingMatches ? (
                <div className="flex flex-col items-center justify-center py-20 text-brand-muted">
                  <Loader2 size={40} className="animate-spin mb-4 text-brand-accent" />
                  <p>Analizzando il calendario...</p>
                </div>
              ) : (
                matches.map(match => (
                  <MatchCard 
                    key={match.id} 
                    match={match} 
                    currentSlip={currentSlip}
                    onToggleSelection={handleToggleSelection} 
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* BETS TAB */}
        {activeTab === 'bets' && (
          <div className="px-4 py-6">
            <h2 className="text-2xl font-bold text-white mb-6">Le Mie Giocate</h2>
            
            {bets.length === 0 ? (
               <div className="text-center py-20 text-brand-muted border-2 border-dashed border-slate-800 rounded-xl bg-brand-card/30">
                 <Receipt size={40} className="mx-auto mb-4 opacity-50" />
                 <p className="font-medium">Nessuna scommessa piazzata.</p>
                 <button onClick={() => setActiveTab('home')} className="mt-4 text-brand-accent text-sm font-bold hover:underline">Vai alle partite</button>
               </div>
            ) : (
              <div className="space-y-4">
                {bets.map(bet => (
                  <div key={bet.id} className={`bg-brand-card rounded-xl p-4 border-l-4 ${bet.status === 'WON' ? 'border-brand-accent' : bet.status === 'LOST' ? 'border-red-500' : 'border-yellow-500'} shadow-lg transition-transform hover:scale-[1.01]`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs text-brand-muted mb-1">{new Date(bet.placedAt).toLocaleString('it-IT')}</p>
                        <h3 className="font-bold text-white">
                            {bet.selections.length > 1 ? `Multipla (${bet.selections.length} eventi)` : 'Singola'}
                        </h3>
                      </div>
                      <div className="text-right">
                         <span className={`text-xs font-bold px-2 py-1 rounded ${bet.status === 'WON' ? 'bg-brand-accent/20 text-brand-accent' : bet.status === 'LOST' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                           {bet.status === 'PENDING' ? 'IN CORSO' : bet.status === 'WON' ? 'VINCENTE' : 'PERDENTE'}
                         </span>
                      </div>
                    </div>
                    
                    {/* Condensed View for Multiple */}
                    <div className="mt-3 space-y-2">
                        {bet.selections.map(sel => (
                            <div key={sel.matchId} className="flex justify-between text-sm border-b border-slate-700/30 last:border-0 pb-1 last:pb-0">
                                <span className="text-slate-300">{sel.matchDetails.homeTeam.name} vs {sel.matchDetails.awayTeam.name}</span>
                                <div className="flex gap-2">
                                    <span className="font-bold text-brand-muted">{sel.selection}</span>
                                    {bet.status !== 'PENDING' && sel.matchDetails.score && (
                                        <span className={`text-xs font-mono ${bet.status === 'LOST' ? 'text-red-400' : 'text-green-400'}`}>
                                            [{sel.matchDetails.score.home}-{sel.matchDetails.score.away}]
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-700/50">
                        <div>
                             <p className="text-xs text-brand-muted">Importo: <span className="text-white font-bold">€{bet.amount}</span></p>
                             <p className="text-xs text-brand-muted">Quota: <span className="text-white font-bold">{bet.totalOdds.toFixed(2)}</span></p>
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-brand-muted block">Vincita: <span className="text-brand-accent font-bold">€{bet.potentialReturn.toFixed(2)}</span></span>
                             
                             {/* Simulation Button for Demo */}
                             {bet.status === 'PENDING' && (
                               <button 
                                 onClick={() => simulateBetResult(bet)}
                                 className="mt-2 text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-full inline-flex items-center gap-1 transition-colors ml-auto border border-slate-600"
                               >
                                 <PlayCircle size={12} /> Simula
                               </button>
                             )}
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="px-4 py-6">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-3xl font-bold text-brand-muted border-2 border-slate-700">
                 {userData.username ? userData.username.charAt(0).toUpperCase() : '?'}
               </div>
               <div>
                 <h2 className="text-2xl font-bold text-white">{userData.username}</h2>
                 <p className="text-brand-accent text-sm flex items-center gap-1">
                     <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Online
                 </p>
                 <p className="text-xs text-slate-500 mt-1">{currentUser.email}</p>
               </div>
            </div>
            
            {/* Balance Chart */}
            <BalanceChart history={userData.balanceHistory || []} currentBalance={userData.balance} />

            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="bg-brand-card p-4 rounded-xl text-center border border-slate-800 shadow-lg">
                  <Coins className="mx-auto mb-2 text-yellow-400" size={24} />
                  <p className="text-2xl font-bold text-white">€{userData.balance.toFixed(2)}</p>
                  <p className="text-xs text-brand-muted">Saldo Disponibile</p>
               </div>
               <div className="bg-brand-card p-4 rounded-xl text-center border border-slate-800 shadow-lg">
                  <Trophy className="mx-auto mb-2 text-brand-accent" size={24} />
                  <p className="text-2xl font-bold text-white">{bets.filter(b => b.status === 'WON').length}</p>
                  <p className="text-xs text-brand-muted">Scommesse Vinte</p>
               </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-xl mb-8 border border-slate-700/50">
              <h3 className="font-bold mb-2 text-white text-sm uppercase tracking-wider">Statistiche</h3>
              <div className="flex justify-between text-sm py-2 border-b border-slate-700/50">
                  <span className="text-brand-muted">Totale Giocate</span>
                  <span className="text-white font-bold">{bets.length}</span>
              </div>
              <div className="flex justify-between text-sm py-2">
                  <span className="text-brand-muted">Win Rate</span>
                  <span className="text-white font-bold">
                    {bets.length > 0 ? Math.round((bets.filter(b => b.status === 'WON').length / bets.length) * 100) : 0}%
                  </span>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-red-400 py-4 bg-red-400/10 hover:bg-red-400/20 rounded-xl transition-colors font-semibold border border-red-400/20"
            >
              <LogOut size={20} /> Disconnetti Account
            </button>
          </div>
        )}

      </div>

      {/* Floating Bet Slip Bar */}
      {currentSlip.length > 0 && !isSlipOpen && activeTab === 'home' && (
        <div className="fixed bottom-20 left-4 right-4 z-40">
            <button 
                onClick={() => setIsSlipOpen(true)}
                className="w-full bg-brand-accent text-brand-dark rounded-xl p-4 shadow-xl shadow-brand-accent/20 flex justify-between items-center animate-in slide-in-from-bottom-10 fade-in duration-300 transform active:scale-95 transition-all"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-brand-dark/20 p-2 rounded-lg">
                        <Receipt size={24} />
                    </div>
                    <div className="text-left">
                        <span className="block font-bold text-sm">Schedina ({currentSlip.length})</span>
                        <span className="block text-xs opacity-80">Quota Totale: {currentSlip.reduce((acc, c) => acc * c.oddsValue, 1).toFixed(2)}</span>
                    </div>
                </div>
                <div className="bg-brand-dark/10 px-4 py-2 rounded-lg font-bold text-sm">
                    Apri
                </div>
            </button>
        </div>
      )}

      <BetSlip 
        selections={currentSlip}
        userBalance={userData.balance}
        isOpen={isSlipOpen}
        onClose={() => setIsSlipOpen(false)}
        onRemoveSelection={handleRemoveFromSlip}
        onConfirm={placeBet}
      />

      <BottomNav currentTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}