import React, { useState } from 'react';
import { BetSelection } from '../types';
import { X, Check, Trash2, Trophy } from 'lucide-react';

interface BetSlipProps {
  selections: BetSelection[];
  userBalance: number;
  isOpen: boolean;
  onClose: () => void;
  onRemoveSelection: (matchId: string) => void;
  onConfirm: (amount: number) => void;
}

export const BetSlip: React.FC<BetSlipProps> = ({ 
  selections, 
  userBalance,
  isOpen,
  onClose,
  onRemoveSelection,
  onConfirm 
}) => {
  const [amount, setAmount] = useState<string>('');
  
  const totalOdds = selections.reduce((acc, curr) => acc * curr.oddsValue, 1);
  const potentialWin = amount ? (parseFloat(amount) * totalOdds).toFixed(2) : '0.00';
  const isValidAmount = amount !== '' && parseFloat(amount) > 0 && parseFloat(amount) <= userBalance;
  const quickAmounts = [5, 10, 20, 50];

  return (
    <div className={`fixed inset-0 z-50 flex items-end justify-center transition-all duration-300 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`bg-slate-900 w-full max-w-md rounded-t-2xl p-6 relative z-10 transform transition-transform duration-300 flex flex-col max-h-[90vh] ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white">La tua Schedina</h3>
            <span className="bg-brand-accent text-brand-dark text-xs font-bold px-2 py-0.5 rounded-full">{selections.length}</span>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-brand-muted hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Selections List - Scrollable */}
        <div className="overflow-y-auto flex-1 mb-4 space-y-3 pr-1">
            {selections.length === 0 ? (
                <div className="text-center py-10 text-brand-muted">
                    <Trophy size={40} className="mx-auto mb-2 opacity-50" />
                    <p>Nessuna selezione</p>
                </div>
            ) : (
                selections.map((item) => (
                    <div key={item.matchId} className="bg-slate-800 rounded-lg p-3 relative group">
                        <div className="flex justify-between items-start pr-6">
                            <span className="text-sm font-semibold text-white">{item.matchDetails.homeTeam.name} - {item.matchDetails.awayTeam.name}</span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-brand-muted">{item.matchDetails.league}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-brand-muted text-xs">Esito: <b className="text-white">{item.selection}</b></span>
                                <span className="bg-brand-accent text-brand-dark font-bold px-2 py-0.5 rounded text-xs">{item.oddsValue.toFixed(2)}</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => onRemoveSelection(item.matchId)}
                            className="absolute top-2 right-2 text-slate-500 hover:text-red-400 p-1"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))
            )}
        </div>

        {/* Footer / Betting Input - Fixed at bottom of modal */}
        {selections.length > 0 && (
            <div className="flex-shrink-0 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-brand-muted text-sm">Quota Totale</span>
                    <span className="text-brand-accent font-bold text-2xl">{totalOdds.toFixed(2)}</span>
                </div>

                <div className="mb-4">
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold">€</span>
                        <input 
                            type="number" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-slate-800 text-white font-bold text-lg py-3 pl-10 pr-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
                            placeholder="Importo (Min €1)"
                        />
                    </div>
                    <div className="flex gap-2 mt-2">
                        {quickAmounts.map(amt => (
                            <button 
                                key={amt}
                                onClick={() => setAmount(amt.toString())}
                                disabled={userBalance < amt}
                                className="flex-1 py-1.5 bg-slate-800 text-xs font-semibold rounded hover:bg-slate-700 disabled:opacity-30 text-brand-muted"
                            >
                                €{amt}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <span className="text-brand-muted text-sm">Vincita Potenziale</span>
                    <span className="text-white font-bold text-xl">€{potentialWin}</span>
                </div>

                <button 
                    disabled={!isValidAmount}
                    onClick={() => {
                        onConfirm(parseFloat(amount));
                        setAmount('');
                    }}
                    className="w-full py-4 bg-brand-accent text-brand-dark font-bold text-lg rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-accent/20"
                >
                    <Check size={24} />
                    Scommetti Ora
                </button>
            </div>
        )}

      </div>
    </div>
  );
};