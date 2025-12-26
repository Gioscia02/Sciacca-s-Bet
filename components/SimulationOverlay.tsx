
import React, { useState, useEffect } from 'react';
import { 
  Loader2, Trophy, Frown, Activity, ChevronRight, 
  CheckCircle2, XCircle, Cpu, Server, Database, 
  Wifi, Zap 
} from 'lucide-react';
import { DetailedSimResult } from '../App';

interface SimulationOverlayProps {
  result: DetailedSimResult | null;
  onClose: () => void;
}

const SYSTEM_LOGS = [
  "Inizializzazione motore fisico v3.5...",
  "Connessione al database storico...",
  "Recupero condizioni meteo stadi...",
  "Analisi forma fisica squadre...",
  "Calcolo fattore campo...",
  "Applicazione variabili casuali...",
  "Generazione eventi partita...",
  "Validazione punteggi finali...",
  "Chiusura connessione..."
];

export const SimulationOverlay: React.FC<SimulationOverlayProps> = ({ result, onClose }) => {
  const [progress, setProgress] = useState(0);
  const [currentLog, setCurrentLog] = useState(SYSTEM_LOGS[0]);
  const [logsHistory, setLogsHistory] = useState<string[]>([]);

  // Gestione animazione caricamento
  useEffect(() => {
    if (!result) {
      setProgress(0);
      setLogsHistory([]);
      
      const totalDuration = 2000; // 2 secondi totali (deve matchare il timeout in App.tsx)
      const intervalTime = 50;
      const steps = totalDuration / intervalTime;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep++;
        const newProgress = Math.min(100, Math.floor((currentStep / steps) * 100));
        setProgress(newProgress);

        // Cambio log in base alla percentuale
        const logIndex = Math.floor((newProgress / 100) * (SYSTEM_LOGS.length - 1));
        const newLog = SYSTEM_LOGS[logIndex];
        
        if (newLog !== currentLog) {
            setCurrentLog(newLog);
            setLogsHistory(prev => [...prev.slice(-3), newLog]); // Tieni ultimi 4 log
        }

        if (currentStep >= steps) {
          clearInterval(timer);
        }
      }, intervalTime);

      return () => clearInterval(timer);
    } else {
      setProgress(100);
    }
  }, [result]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 overflow-hidden">
      
      {/* Sfondo animato tech */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-50%] left-[-50%] right-[-50%] bottom-[-50%] bg-[radial-gradient(circle_800px_at_50%_50%,rgba(16,185,129,0.15),transparent)] animate-pulse"></div>
        <div className="grid grid-cols-[repeat(20,1fr)] gap-1 h-full w-full opacity-20">
            {Array.from({ length: 200 }).map((_, i) => (
                <div key={i} className="bg-brand-accent/20 rounded-full w-0.5 h-0.5" />
            ))}
        </div>
      </div>

      {!result ? (
        // --- LOADING SCREEN ---
        <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
          
          {/* Main Icon */}
          <div className="relative mb-10">
             <div className="w-32 h-32 rounded-full border-4 border-slate-800 flex items-center justify-center bg-slate-900 shadow-[0_0_50px_rgba(16,185,129,0.2)] relative overflow-hidden">
                <div className="absolute inset-0 bg-brand-accent/5 animate-pulse"></div>
                <Cpu size={48} className="text-brand-accent relative z-10" />
                
                {/* Rotating rings */}
                <div className="absolute inset-0 border-t-2 border-brand-accent/50 rounded-full animate-spin duration-[3s]"></div>
                <div className="absolute inset-2 border-r-2 border-brand-accent/30 rounded-full animate-spin duration-[2s] direction-reverse"></div>
             </div>
             <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-900 border border-brand-accent/30 px-3 py-1 rounded-full flex items-center gap-2 shadow-xl">
                <Activity size={12} className="text-brand-accent animate-pulse" />
                <span className="text-[10px] font-mono text-brand-accent font-bold">{progress}%</span>
             </div>
          </div>

          {/* Text Info */}
          <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2 text-center">
            Simulazione Match
          </h2>
          
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-6 border border-slate-700">
             <div 
               className="h-full bg-brand-accent shadow-[0_0_10px_#10b981] transition-all duration-75 ease-out"
               style={{ width: `${progress}%` }}
             />
          </div>

          {/* Terminal / Logs */}
          <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-4 font-mono text-xs shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
                <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                </div>
                <span className="text-slate-500 text-[10px] uppercase tracking-widest ml-auto">System Log</span>
            </div>
            <div className="space-y-1.5 min-h-[80px] flex flex-col justify-end">
                {logsHistory.map((log, idx) => (
                    <div key={idx} className="text-slate-500 truncate animate-in slide-in-from-left-2 fade-in duration-300">
                        <span className="mr-2 opacity-50">{'>'}</span>{log}
                    </div>
                ))}
                <div className="text-brand-accent truncate font-bold animate-pulse">
                    <span className="mr-2">{'>'}</span>{currentLog}
                </div>
            </div>
          </div>

          <div className="mt-8 flex gap-4 text-brand-muted/30">
             <Database size={16} />
             <Server size={16} />
             <Wifi size={16} />
          </div>

        </div>
      ) : (
        // --- RESULT SCREEN ---
        <div className="w-full max-w-md relative z-10 flex flex-col h-full max-h-[90vh]">
          
          {/* Confetti effect if won (simple css radial gradients) */}
          {result.won && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-10 left-10 w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
                <div className="absolute top-20 right-20 w-3 h-3 bg-brand-accent rounded-full animate-bounce delay-100"></div>
                <div className="absolute bottom-40 left-1/2 w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200"></div>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-6 animate-in zoom-in duration-500">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 shadow-2xl ${result.won ? 'bg-emerald-500/20 shadow-emerald-500/20' : 'bg-red-500/20 shadow-red-500/20'}`}>
                {result.won ? <Trophy size={40} className="text-brand-accent" /> : <Frown size={40} className="text-red-400" />}
            </div>
            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none mb-1">
                {result.won ? 'VITTORIA!' : 'PECCATO!'}
            </h2>
            <p className="text-brand-muted text-sm font-medium uppercase tracking-widest">
                {result.won ? 'La previsione era corretta' : 'Il banco ha vinto questa volta'}
            </p>
          </div>

          {/* Results Scroll Area */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-1 pb-4">
            {result.results.map((res, idx) => (
              <div 
                key={idx} 
                className={`
                  relative bg-slate-900 border rounded-xl p-4 transition-all duration-500 animate-in slide-in-from-bottom-4
                  ${res.isCorrect 
                    ? 'border-brand-accent/30 shadow-[0_4px_20px_rgba(16,185,129,0.1)]' 
                    : 'border-red-500/20 opacity-80'
                  }
                `}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                 {/* Match Header */}
                 <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Match #{idx + 1}
                    </span>
                    {res.isCorrect ? (
                         <div className="flex items-center gap-1 text-brand-accent">
                             <CheckCircle2 size={12} />
                             <span className="text-[10px] font-bold uppercase">Presa</span>
                         </div>
                    ) : (
                         <div className="flex items-center gap-1 text-red-400">
                             <XCircle size={12} />
                             <span className="text-[10px] font-bold uppercase">Persa</span>
                         </div>
                    )}
                 </div>

                 {/* Teams & Score */}
                 <div className="flex items-center justify-between">
                    {/* Home */}
                    <div className="flex items-center gap-3 w-[40%]">
                        <img src={res.selection.matchDetails.homeTeam.logoPlaceholder} className="w-8 h-8 object-contain" />
                        <span className="text-xs font-bold text-white leading-tight">{res.selection.matchDetails.homeTeam.name}</span>
                    </div>

                    {/* Score Center */}
                    <div className="bg-slate-950 border border-slate-800 rounded px-2 py-1 flex items-center gap-2">
                        <span className={`text-lg font-black ${res.isCorrect ? 'text-white' : 'text-slate-400'}`}>{res.homeScore}</span>
                        <span className="text-slate-600 text-xs">-</span>
                        <span className={`text-lg font-black ${res.isCorrect ? 'text-white' : 'text-slate-400'}`}>{res.awayScore}</span>
                    </div>

                    {/* Away */}
                    <div className="flex items-center justify-end gap-3 w-[40%] text-right">
                        <span className="text-xs font-bold text-white leading-tight">{res.selection.matchDetails.awayTeam.name}</span>
                        <img src={res.selection.matchDetails.awayTeam.logoPlaceholder} className="w-8 h-8 object-contain" />
                    </div>
                 </div>

                 {/* User Prediction */}
                 <div className="mt-3 flex justify-between items-center bg-slate-950/50 rounded-lg px-3 py-1.5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">La tua giocata</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white bg-slate-800 px-2 rounded">
                            {res.selection.selection}
                        </span>
                        <span className="text-[10px] text-brand-muted">
                            @ {res.selection.oddsValue.toFixed(2)}
                        </span>
                    </div>
                 </div>
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="mt-4 space-y-3">
             {result.won ? (
                <div className="bg-brand-accent text-brand-dark rounded-xl p-4 flex justify-between items-center shadow-lg shadow-brand-accent/20 animate-pulse">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Vincita Accreditata</span>
                        <span className="text-3xl font-black tracking-tighter">€{result.amount.toFixed(2)}</span>
                    </div>
                    <div className="bg-brand-dark/20 p-2 rounded-full">
                        <Zap size={24} className="fill-current" />
                    </div>
                </div>
             ) : (
                <div className="bg-slate-800 text-slate-400 rounded-xl p-4 text-center border border-slate-700">
                    <span className="text-xs font-bold uppercase tracking-wide">Nessuna vincita</span>
                </div>
             )}

             <button 
               onClick={onClose}
               className="w-full bg-slate-900 border border-slate-700 text-white font-bold py-4 rounded-xl uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
             >
                Chiudi Simulazione <ChevronRight size={14} />
             </button>
          </div>

        </div>
      )}
    </div>
  );
};
