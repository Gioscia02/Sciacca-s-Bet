
import React, { useState, useMemo } from 'react';
import { BalancePoint } from '../types';

interface BalanceChartProps {
  history: BalancePoint[];
  currentBalance: number;
}

export const BalanceChart: React.FC<BalanceChartProps> = ({ history, currentBalance }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // 1. Prepare & Sort Data
  const dataPoints = useMemo(() => {
    const points = history && history.length > 0 
      ? [...history] 
      : [{ date: new Date().toISOString(), value: currentBalance }];

    points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Ensure current balance is the last point
    const lastPoint = points[points.length - 1];
    if (Math.abs(lastPoint.value - currentBalance) > 0.01) {
        points.push({ date: new Date().toISOString(), value: currentBalance });
    }
    
    // Pad with a fake start point if mostly empty
    if (points.length === 1) {
        points.unshift({ 
            date: new Date(Date.now() - 86400000).toISOString(), 
            value: points[0].value 
        });
    }
    return points;
  }, [history, currentBalance]);

  // 2. Chart Dimensions
  const width = 100; 
  const height = 60; // Increased height for better curves
  const paddingX = 0;
  const paddingY = 10;

  // 3. Scales
  const values = dataPoints.map(p => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  // Add breathing room (10%) to top and bottom
  const range = maxVal - minVal;
  const buffer = range === 0 ? maxVal * 0.1 : range * 0.1;
  const safeMin = minVal - buffer;
  const safeMax = maxVal + buffer;
  const safeRange = safeMax - safeMin;

  const normalizeY = (val: number) => {
    const availableHeight = height - (paddingY * 2);
    const relativeValue = (val - safeMin) / (safeRange || 1);
    return (height - paddingY) - (relativeValue * availableHeight);
  };

  const normalizeX = (index: number) => {
     return (index / (dataPoints.length - 1)) * width;
  };

  // 4. Smooth Curve Logic (Catmull-Rom -> Cubic Bezier)
  const getPath = () => {
    if (dataPoints.length < 2) return "";
    
    // Points coordinates
    const pts = dataPoints.map((p, i) => [normalizeX(i), normalizeY(p.value)]);
    
    const line = (pointA: number[], pointB: number[]) => {
      const lengthX = pointB[0] - pointA[0];
      const lengthY = pointB[1] - pointA[1];
      return {
        length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
        angle: Math.atan2(lengthY, lengthX)
      };
    };

    const controlPoint = (current: number[], previous: number[], next: number[], reverse?: boolean) => {
      const p = previous || current;
      const n = next || current;
      const smoothing = 0.15; // 0 to 1 (0 is straight lines)
      const o = line(p, n);
      const angle = o.angle + (reverse ? Math.PI : 0);
      const length = o.length * smoothing;
      const x = current[0] + Math.cos(angle) * length;
      const y = current[1] + Math.sin(angle) * length;
      return [x, y];
    };

    const bezierCommand = (point: number[], i: number, a: number[][]) => {
      const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point);
      const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true);
      return `C ${cpsX.toFixed(2)},${cpsY.toFixed(2)} ${cpeX.toFixed(2)},${cpeY.toFixed(2)} ${point[0].toFixed(2)},${point[1].toFixed(2)}`;
    };

    const d = pts.reduce((acc, point, i, a) => 
      i === 0 ? `M ${point[0]},${point[1]}` : `${acc} ${bezierCommand(point, i, a)}`
    , "");

    return d;
  };

  const linePath = getPath();
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  // 5. Styling
  const startVal = dataPoints[0].value;
  const endVal = dataPoints[dataPoints.length - 1].value;
  const isProfit = endVal >= startVal;
  const mainColor = isProfit ? '#34d399' : '#fb7185'; // Emerald-400 vs Rose-400
  const gradientId = 'chartGradient';

  // Interaction
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relX = (x / rect.width) * width;
    
    // Find closest point
    let closestIndex = 0;
    let minDiff = Infinity;
    
    dataPoints.forEach((_, i) => {
        const px = normalizeX(i);
        const diff = Math.abs(px - relX);
        if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
        }
    });
    setHoverIndex(closestIndex);
  };

  const displayPoint = hoverIndex !== null ? dataPoints[hoverIndex] : dataPoints[dataPoints.length - 1];

  return (
    <div className="bg-brand-card rounded-3xl p-6 shadow-2xl border border-white/5 relative overflow-hidden mb-6">
      
      {/* Background Glow */}
      <div 
        className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[100px] opacity-20 pointer-events-none transition-colors duration-500"
        style={{ backgroundColor: mainColor }}
      ></div>

      {/* Header Info */}
      <div className="flex justify-between items-end mb-8 relative z-10">
        <div>
           <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Saldo Attuale</p>
           <h3 className="text-4xl font-black text-white tracking-tighter flex items-baseline gap-1">
             <span className="text-2xl opacity-50">€</span>
             {displayPoint.value.toFixed(2)}
           </h3>
           <p className="text-[10px] text-slate-500 mt-1 font-mono">
              {new Date(displayPoint.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
           </p>
        </div>
        
        <div className={`text-right px-3 py-1.5 rounded-xl border border-white/5 ${isProfit ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
           <p className={`text-sm font-black flex items-center justify-end gap-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
             {isProfit ? '▲' : '▼'} {Math.abs(endVal - startVal).toFixed(2)} €
           </p>
           <p className={`text-[9px] font-bold uppercase tracking-wider ${isProfit ? 'text-emerald-400/60' : 'text-rose-400/60'}`}>
             Profitto Totale
           </p>
        </div>
      </div>

      {/* Chart Container */}
      <div 
        className="relative w-full h-48 cursor-crosshair touch-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
        onTouchMove={(e) => {
             // Simple touch support
             const touch = e.touches[0];
             const rect = e.currentTarget.getBoundingClientRect();
             const x = touch.clientX - rect.left;
             // Reuse mouse logic broadly
             const relX = (x / rect.width) * width;
             let closestIndex = 0;
             let minDiff = Infinity;
             dataPoints.forEach((_, i) => {
                const px = normalizeX(i);
                const diff = Math.abs(px - relX);
                if (diff < minDiff) { minDiff = diff; closestIndex = i; }
             });
             setHoverIndex(closestIndex);
        }}
        onTouchEnd={() => setHoverIndex(null)}
      >
        {/* SVG Chart */}
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: mainColor, stopOpacity: 0.3 }} />
                    <stop offset="100%" style={{ stopColor: mainColor, stopOpacity: 0 }} />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            {/* Grid Lines (Max, Mid, Min) */}
            <g className="opacity-20 stroke-slate-400" strokeWidth="0.2" strokeDasharray="2,2">
               <line x1="0" y1={normalizeY(maxVal)} x2={width} y2={normalizeY(maxVal)} />
               <line x1="0" y1={normalizeY((maxVal+minVal)/2)} x2={width} y2={normalizeY((maxVal+minVal)/2)} />
               <line x1="0" y1={normalizeY(minVal)} x2={width} y2={normalizeY(minVal)} />
            </g>

            {/* Area Fill */}
            <path d={areaPath} fill={`url(#${gradientId})`} />

            {/* Main Curve */}
            <path 
                d={linePath} 
                fill="none" 
                stroke={mainColor} 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                filter="url(#glow)"
            />

            {/* Hover Indicator Line */}
            {hoverIndex !== null && (
               <line 
                  x1={normalizeX(hoverIndex)} 
                  y1={0} 
                  x2={normalizeX(hoverIndex)} 
                  y2={height} 
                  stroke="white" 
                  strokeWidth="0.5" 
                  strokeDasharray="2,2"
                  opacity="0.5"
               />
            )}

            {/* Active Point Dot */}
            <circle 
                cx={normalizeX(hoverIndex !== null ? hoverIndex : dataPoints.length - 1)} 
                cy={normalizeY(displayPoint.value)} 
                r="3" 
                fill="white" 
                stroke={mainColor} 
                strokeWidth="2"
            />
        </svg>

        {/* Axis Labels Overlay */}
        <div className="absolute inset-0 pointer-events-none">
            {/* Y Axis Labels */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[9px] text-slate-500 font-bold py-2.5 opacity-50">
                <span style={{ top: `${(normalizeY(maxVal) / height) * 100}%`, position: 'absolute' }}>€{maxVal.toFixed(0)}</span>
                <span style={{ top: `${(normalizeY(minVal) / height) * 100}%`, position: 'absolute' }}>€{minVal.toFixed(0)}</span>
            </div>
            
            {/* X Axis Date Labels */}
            <div className="absolute bottom-[-20px] left-0 right-0 flex justify-between text-[9px] text-slate-500 font-medium">
                <span>{new Date(dataPoints[0].date).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' })}</span>
                <span>{new Date(dataPoints[dataPoints.length-1].date).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' })}</span>
            </div>
        </div>
      </div>
    </div>
  );
};
