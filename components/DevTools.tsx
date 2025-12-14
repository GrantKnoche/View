import React, { useState, useEffect, useRef } from 'react';
import { SessionRecord } from '../types';
import { STORAGE_KEY_HISTORY, STORAGE_KEY_ACHIEVEMENTS } from '../constants';

interface DevToolsProps {
  mode: 'POMODORO' | 'FLOW';
  onSetCountdown: (totalSeconds: number) => void;
  onAddFlowTime: (seconds: number) => void;
  onInjectHistory: (records: SessionRecord[]) => void;
}

export const DevTools: React.FC<DevToolsProps> = ({ 
  mode, 
  onSetCountdown, 
  onAddFlowTime, 
  onInjectHistory 
}) => {
  // Initial position
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Inputs
  const [manualMin, setManualMin] = useState('0');
  const [manualSec, setManualSec] = useState('10');

  // Time Buckets Definition (Hour Ranges) strictly complying with requirements
  // 00-05, 06-10, 11-12, 13-17, 18-23
  const TIME_BUCKETS = [
    { label: 'DeepNight', min: 0, max: 5 },
    { label: 'Morning', min: 6, max: 10 },
    { label: 'Noon', min: 11, max: 12 },
    { label: 'Afternoon', min: 13, max: 17 },
    { label: 'Night', min: 18, max: 23 },
  ];

  // --- Drag Logic ---
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y
      });
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // --- Actions ---

  const handleApplyCountdown = () => {
    const m = parseInt(manualMin) || 0;
    const s = parseInt(manualSec) || 0;
    onSetCountdown(m * 60 + s);
  };

  // Helper to get random time in a specific bucket
  const getRandomTimeInBucket = (dateBase: Date, bucketIndex: number) => {
    const bucket = TIME_BUCKETS[bucketIndex];
    const hour = Math.floor(Math.random() * (bucket.max - bucket.min + 1)) + bucket.min;
    const minute = Math.floor(Math.random() * 60);
    const d = new Date(dateBase);
    d.setHours(hour, minute, 0, 0);
    return d.getTime();
  };

  // Function A: Random Scatter (±7 days)
  // Logic: Loop 7 times. Pick random day [-7, +7]. Pick random bucket. Generate 1.
  const handleRandomScatter = () => {
    const records: SessionRecord[] = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
        // Random day offset between -7 and +7 (Range of 15 days)
        const offset = Math.floor(Math.random() * 15) - 7; 
        const targetDay = new Date(today);
        targetDay.setDate(today.getDate() + offset);

        // Pick a random valid bucket (0-4)
        const bucketIdx = Math.floor(Math.random() * TIME_BUCKETS.length);

        // Generate 1 tomato at a random valid time slot in that bucket
        records.push({
            id: crypto.randomUUID(),
            timestamp: getRandomTimeInBucket(targetDay, bucketIdx),
            type: 'TOMATO',
            durationMinutes: 25,
            completed: true
        });
    }
    onInjectHistory(records);
  };

  // Function B: Add to Today (Random Distribution across 5 buckets)
  // Logic: Loop `count` times. Pick random bucket. Generate 1.
  const handleAddToToday = (count: number) => {
    const records: SessionRecord[] = [];
    const today = new Date();

    for (let i = 0; i < count; i++) {
        // Pick a random bucket to distribute load
        const bucketIdx = Math.floor(Math.random() * TIME_BUCKETS.length);
        
        records.push({
            id: crypto.randomUUID(),
            timestamp: getRandomTimeInBucket(today, bucketIdx),
            type: 'TOMATO',
            durationMinutes: 25,
            completed: true
        });
    }
    onInjectHistory(records);
  };

  // Clear Data Logic
  const handleClearData = () => {
    if (confirm('🗑️ Clear ALL Data? This will reset the app.')) {
        localStorage.removeItem(STORAGE_KEY_HISTORY);
        localStorage.removeItem(STORAGE_KEY_ACHIEVEMENTS);
        window.location.reload();
    }
  };

  return (
    <div 
      className="fixed flex flex-col w-72 bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden text-xs font-mono text-white/90 transition-opacity duration-200"
      style={{ 
        left: position.x, 
        top: position.y,
        zIndex: 999999, 
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      {/* Title Bar */}
      <div 
        onMouseDown={handleMouseDown}
        className="bg-gray-800 p-2 border-b border-white/10 cursor-move flex justify-between items-center select-none hover:bg-gray-700"
      >
        <span className="font-bold text-emerald-400">⚡ DEVTOOLS</span>
        <button 
          onClick={handleClearData} 
          className="px-2 py-0.5 bg-red-900/50 hover:bg-red-600 text-red-100 rounded text-[9px] border border-red-800 transition-colors font-bold"
        >
          🗑️ 清空数据
        </button>
      </div>

      <div className="p-3 space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
        
        {/* Module A: Timer Control */}
        <div className={`space-y-2 ${mode !== 'POMODORO' ? 'opacity-30' : ''}`}>
          <div className="text-[9px] uppercase text-gray-500 font-bold tracking-wider">Timer Override</div>
          <div className="flex gap-2 items-center">
            <input 
                type="number" value={manualMin} onChange={e => setManualMin(e.target.value)}
                className="w-10 bg-white/10 rounded px-1 py-0.5 text-center" placeholder="m"
            />
            <span>:</span>
            <input 
                type="number" value={manualSec} onChange={e => setManualSec(e.target.value)}
                className="w-10 bg-white/10 rounded px-1 py-0.5 text-center" placeholder="s"
            />
            <button onClick={handleApplyCountdown} className="flex-1 bg-emerald-700 hover:bg-emerald-600 rounded py-0.5">SET</button>
          </div>
        </div>

        {/* Module B: Data Generator */}
        <div className="space-y-2 pt-2 border-t border-white/10">
           <div className="text-[9px] uppercase text-gray-500 font-bold tracking-wider">Data Injection</div>
           
           {/* Scatter */}
           <button 
             onClick={handleRandomScatter}
             className="w-full bg-indigo-900/60 hover:bg-indigo-700 border border-indigo-700 rounded py-1.5 flex items-center justify-center gap-2 transition-colors"
           >
              <span>🎲 随机散布 (±7天)</span>
           </button>

           {/* Today Add */}
           <div className="flex flex-col gap-1">
               <span className="text-[9px] text-gray-400">今日加量 (Random 5 Buckets):</span>
               <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 5, 10].map(num => (
                      <button 
                        key={num} 
                        onClick={() => handleAddToToday(num)}
                        className="bg-gray-700 hover:bg-gray-600 rounded py-1 border border-gray-600 transition-colors"
                      >
                        +{num}
                      </button>
                  ))}
               </div>
           </div>
        </div>

        {/* Module C: Flow Control */}
        <div className={`space-y-2 pt-2 border-t border-white/10 ${mode !== 'FLOW' ? 'opacity-30' : ''}`}>
             <div className="text-[9px] uppercase text-gray-500 font-bold tracking-wider">Flow Control</div>
             <div className="grid grid-cols-4 gap-1">
                 {[10, 60, 300, 1500].map(sec => (
                     <button 
                       key={sec} 
                       onClick={() => onAddFlowTime(sec)}
                       className="bg-blue-900/50 hover:bg-blue-700 border border-blue-800 rounded py-1"
                     >
                        +{sec < 60 ? `${sec}s` : `${sec/60}m`}
                     </button>
                 ))}
             </div>
        </div>

      </div>
    </div>
  );
};