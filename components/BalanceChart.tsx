import React from 'react';
import { BalancePoint } from '../types';

interface BalanceChartProps {
  history: BalancePoint[];
  currentBalance: number;
}

export const BalanceChart: React.FC<BalanceChartProps> = ({ history, currentBalance }) => {
  // 1. Prepare Data
  const dataPoints = history && history.length > 0 
    ? [...history] 
    : [{ date: new Date().toISOString(), value: currentBalance }];

  // Ensure chronological order
  dataPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Ensure the current balance is the last point
  const lastPoint = dataPoints[dataPoints.length - 1];
  if (Math.abs(lastPoint.value - currentBalance) > 0.01) {
      dataPoints.push({ date: new Date().toISOString(), value: currentBalance });
  }

  // If we only have 1 point (new account), create a fake previous point to draw a line
  if (dataPoints.length === 1) {
      dataPoints.unshift({ 
          date: new Date(Date.now() - 86400000).toISOString(), 
          value: dataPoints[0].value 
      });
  }

  // 2. Chart Dimensions
  const width = 100; // Using percentages/viewBox logic, this is abstract units
  const height = 50;
  const paddingX = 0; // Full width
  const paddingY = 10; // Space for stroke width

  // 3. Calculate Scales
  const values = dataPoints.map(p => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal;
  // Add a buffer to the range so the line doesn't touch the absolute top/bottom
  const rangeBuffer = range === 0 ? 1 : range; 

  const normalizeY = (val: number) => {
    // Invert Y (SVG 0 is top)
    // Formula: (Height - Padding) - ((Value - Min) / Range) * (Available Height)
    const availableHeight = height - (paddingY * 2);
    const relativeValue = (val - minVal) / rangeBuffer;
    return (height - paddingY) - (relativeValue * availableHeight);
  };

  const normalizeX = (index: number) => {
     return (index / (dataPoints.length - 1)) * width;
  };

  // 4. Generate SVG Path
  const points = dataPoints.map((p, i) => 
    `${normalizeX(i).toFixed(2)},${normalizeY(p.value).toFixed(2)}`
  ).join(' ');

  const areaPath = `
    M 0,${height} 
    L 0,${normalizeY(dataPoints[0].value)} 
    ${dataPoints.map((p, i) => `L ${normalizeX(i)},${normalizeY(p.value)}`).join(' ')}
    L ${width},${normalizeY(dataPoints[dataPoints.length - 1].value)} 
    L ${width},${height} 
    Z
  `;

  // 5. Determine Color
  const startVal = dataPoints[0].value;
  const endVal = dataPoints[dataPoints.length - 1].value;
  const isProfit = endVal >= startVal;
  
  // Emerald-500 (#10b981) for profit, Red-500 (#ef4444) for loss
  const strokeColor = isProfit ? '#10b981' : '#ef4444';
  const gradientId = isProfit ? 'gradProfit' : 'gradLoss';

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg mb-6 relative overflow-hidden">
      {/* Header Info */}
      <div className="flex justify-between items-start mb-6 z-10 relative">
        <div>
           <p className="text-brand-muted text-xs font-bold uppercase tracking-wider mb-1">Andamento Conto</p>
           <h3 className="text-2xl font-bold text-white tracking-tight">€{endVal.toFixed(2)}</h3>
        </div>
        <div className={`text-right px-2 py-1 rounded-lg ${isProfit ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
           <p className={`text-sm font-bold flex items-center gap-1 ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
             {isProfit ? '+' : ''}{(endVal - startVal).toFixed(2)} €
           </p>
           <p className={`text-[10px] font-medium ${isProfit ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
             totale
           </p>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative w-full h-32">
        {/* Min/Max Labels */}
        <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-slate-500 font-mono py-2 pointer-events-none z-10">
           <span>{maxVal.toFixed(0)}</span>
           <span>{minVal.toFixed(0)}</span>
        </div>

        {/* SVG */}
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible preserve-3d">
            <defs>
                <linearGradient id="gradProfit" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.3 }} />
                <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 0 }} />
                </linearGradient>
                <linearGradient id="gradLoss" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#ef4444', stopOpacity: 0.3 }} />
                <stop offset="100%" style={{ stopColor: '#ef4444', stopOpacity: 0 }} />
                </linearGradient>
            </defs>

            {/* Gradient Area */}
            <path d={areaPath} fill={`url(#${gradientId})`} />

            {/* Main Line */}
            <polyline 
                fill="none" 
                stroke={strokeColor} 
                strokeWidth="2" 
                points={points} 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                vectorEffect="non-scaling-stroke"
            />

            {/* Current Value Dot */}
            <circle 
                cx={width} 
                cy={normalizeY(endVal)} 
                r="1.5" 
                fill="#fff" 
                stroke={strokeColor} 
                strokeWidth="0.5"
            >
                <animate attributeName="r" values="1.5;2.5;1.5" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
            </circle>
        </svg>
      </div>
    </div>
  );
};