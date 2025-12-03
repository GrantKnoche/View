
import React, { useState, useEffect, useRef } from 'react';
import { SessionRecord } from '../types';

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
  // Initial position: roughly right side (window width - 350px)
  const [position, setPosition] = useState({ x: window.innerWidth - 350, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Inputs for Countdown
  const [manualMin, setManualMin] = useState('0');
  const [manualSec, setManualSec] = useState('10');

  // 1. Drag Logic
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

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // 2. Handlers
  const handleApplyCountdown = () => {
    const m = parseInt(manualMin) || 0;
    const s = parseInt(manualSec) || 0;
    onSetCountdown(m * 60 + s);
  };

  const handleGenerateData = () => {
    const records: SessionRecord[] = [];
    const today = new Date();
    
    // Time Buckets definition
    const buckets = [
      { label: 'Dawn', minH: 0, maxH: 5 },
      { label: 'Morn', minH: 6, maxH: 10 },
      { label: 'Noon', minH: 11, maxH: 12 },
      { label: 'Aftn', minH: 13, maxH: 16 },
      { label: 'Eve', minH: 17, maxH: 18 },
      { label: 'Night', minH: 19, maxH: 23 },
    ];

    // Generate 7 random entries
    for (let i = 0; i < 7; i++) {
      // Random day offset: -7 to +7
      const dayOffset = Math.floor(Math.random() * 15) - 7;
      
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayOffset);

      // Random Bucket
      const bucket = buckets[Math.floor(Math.random() * buckets.length)];
      
      // Random hour within bucket
      const hour = Math.floor(Math.random() * (bucket.maxH - bucket.minH + 1)) + bucket.minH;
      const minute = Math.floor(Math.random() * 60);

      targetDate.setHours(hour, minute, 0, 0);

      const record: SessionRecord = {
        id: crypto.randomUUID(),
        timestamp: targetDate.getTime(),
        type: 'TOMATO',
        durationMinutes: 25,
        completed: true
      };
      records.push(record);
    }

    onInjectHistory(records);
    alert(`Injected ${records.length} records across buckets! Check Stats.`);
  };

  return (
    <div 
      className="fixed flex flex-col w-72 bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden text-xs font-mono text-white/90 transition-opacity duration-200"
      style={{ 
        left: position.x, 
        top: position.y,
        zIndex: 999999, // Extremely high Z-Index
        border: '2px solid red' // Temporary Debug Border
      }}
    >
      {/* Title Bar (Draggable) */}
      <div 
        onMouseDown={handleMouseDown}
        className="bg-gray-800 p-2 border-b border-white/10 cursor-move flex justify-between items-center select-none hover:bg-gray-700"
      >
        <span className="font-bold text-emerald-400">⚡ DEVTOOLS (UNLOCKED)</span>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        
        {/* Module A: Countdown */}
        <div className={`space-y-2 ${mode !== 'POMODORO' ? 'opacity-30 pointer-events-none' : ''}`}>
          <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Countdown Control</div>
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-1 bg-white/5 rounded p-1">
              <input 
                type="number" 
                value={manualMin} 
                onChange={e => setManualMin(e.target.value)}
                className="w-8 bg-transparent text-right outline-none border-b border-transparent focus:border-emerald-500" 
              />
              <span className="text-gray-500">m</span>
            </div>
            <div className="flex items-center gap-1 bg-white/5 rounded p-1">
              <input 
                type="number" 
                value={manualSec} 
                onChange={e => setManualSec(e.target.value)}
                className="w-8 bg-transparent text-right outline-none border-b border-transparent focus:border-emerald-500" 
              />
              <span className="text-gray-500">s</span>
            </div>
            <button 
              onClick={handleApplyCountdown}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1 px-2 rounded transition-colors"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Module B: Flow */}
        <div className={`space-y-2 ${mode !== 'FLOW' ? 'opacity-30 pointer-events-none' : ''}`}>
          <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Flow Control (FF)</div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { l: '+10s', v: 10 },
              { l: '+1m', v: 60 },
              { l: '+2m', v: 120 },
              { l: '+5m', v: 300 }
            ].map((btn, i) => (
              <button 
                key={i}
                onClick={() => onAddFlowTime(btn.v)}
                className="bg-blue-600 hover:bg-blue-500 text-white py-1 rounded text-[10px] font-bold transition-colors"
              >
                {btn.l}
              </button>
            ))}
          </div>
        </div>

        {/* Module C: Data Injection */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Smart Data Injection</div>
          <button 
            onClick={handleGenerateData}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors group"
          >
             <span>Generate Test Data</span>
             <span className="group-hover:rotate-12 transition-transform">🎲</span>
          </button>
          <p className="text-[9px] text-gray-500 leading-tight">
            Injects 7 days of random records (Dawn-Night buckets) into local storage.
          </p>
        </div>

      </div>
    </div>
  );
};
