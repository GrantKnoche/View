
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppMode, SessionRecord, TimerStatus } from '../types';
import { STORAGE_KEY_HISTORY, STORAGE_KEY_ACHIEVEMENTS, TOMATO_DURATION_MINUTES, ONE_MINUTE_SECONDS } from '../constants';

interface DevToolsProps {
  mode: AppMode;
  status: TimerStatus;
  
  // Timer Manipulation
  setTimeLeft: (val: number) => void;
  endTimeRef: React.MutableRefObject<number | null>;
  setAccumulatedTime: React.Dispatch<React.SetStateAction<number>>;
  accumulatedTime: number;
  
  // Logic Triggers
  onForceComplete: () => void;
  
  // Data Manipulation
  setHistory: React.Dispatch<React.SetStateAction<SessionRecord[]>>;
  setUnlockedAchievements: React.Dispatch<React.SetStateAction<any[]>>;
}

export const DevTools: React.FC<DevToolsProps> = ({
  mode,
  status,
  setTimeLeft,
  endTimeRef,
  setAccumulatedTime,
  accumulatedTime,
  onForceComplete,
  setHistory,
  setUnlockedAchievements
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  // Dragging State
  const [position, setPosition] = useState({ x: -1, y: 100 }); // -1 x means "use default right css"
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Check URL param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') === 'true') {
      setIsVisible(true);
      // Initialize position to verify it exists
      if (position.x === -1) {
          setPosition({ x: window.innerWidth - 300, y: 100 });
      }
    }
  }, []);

  // Drag Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current) {
      setIsDragging(true);
      const rect = panelRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      setPosition({ x: newX, y: newY });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global listeners for drag (so you can move mouse fast outside the handle)
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);


  if (!isVisible) return null;

  // --- Logic Implementations ---

  const handleSetTimeRemaining = (seconds: number) => {
    if (status !== TimerStatus.RUNNING && status !== TimerStatus.RESTING) return;
    
    setTimeLeft(seconds);
    endTimeRef.current = Date.now() + (seconds * 1000);
  };

  const handleFastForwardFlow = (seconds: number) => {
    setAccumulatedTime(prev => prev + seconds);
  };

  const generateRandomRecord = (dateOffsetDays: number): SessionRecord => {
    const d = new Date();
    d.setDate(d.getDate() - dateOffsetDays);
    d.setHours(8 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60));
    
    return {
      id: crypto.randomUUID(),
      timestamp: d.getTime(),
      type: 'TOMATO',
      durationMinutes: TOMATO_DURATION_MINUTES,
      completed: true
    };
  };

  const injectTodayData = () => {
    const newRecords: SessionRecord[] = [];
    for (let i = 0; i < 5; i++) {
      newRecords.push(generateRandomRecord(0));
    }
    saveAndReload(newRecords);
  };

  const fillWeekData = () => {
    const newRecords: SessionRecord[] = [];
    for (let day = 0; day < 7; day++) {
      const count = 3 + Math.floor(Math.random() * 6);
      for (let i = 0; i < count; i++) {
        newRecords.push(generateRandomRecord(day));
      }
    }
    saveAndReload(newRecords);
  };

  const clearAllData = () => {
    if (confirm('确定要清空所有历史数据吗？')) {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
      localStorage.removeItem(STORAGE_KEY_ACHIEVEMENTS);
      setHistory([]);
      setUnlockedAchievements([]);
      window.location.reload(); 
    }
  };

  const saveAndReload = (newRecords: SessionRecord[]) => {
    const existingStr = localStorage.getItem(STORAGE_KEY_HISTORY);
    const existing: SessionRecord[] = existingStr ? JSON.parse(existingStr) : [];
    const combined = [...existing, ...newRecords];
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(combined));
    setHistory(combined);
  };

  return (
    <div 
      ref={panelRef}
      className="fixed w-[280px] bg-black/85 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl z-[9999] text-white font-mono text-xs overflow-hidden transition-shadow"
      style={{ 
        left: position.x, 
        top: position.y,
        boxShadow: isDragging ? '0 20px 50px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.3)'
      }}
    >
      {/* Draggable Header */}
      <div 
        onMouseDown={handleMouseDown}
        className="flex justify-between items-center px-4 py-2 bg-white/10 border-b border-white/10 cursor-move select-none hover:bg-white/20 transition-colors"
        title="按住拖动面板"
      >
        <h3 className="font-bold text-green-400 flex items-center gap-2">
            <span>🔧</span> 开发者调试面板
        </h3>
        <span className="text-[9px] text-gray-400 bg-black/30 px-1.5 py-0.5 rounded">v2.0</span>
      </div>

      <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar" onMouseDown={e => e.stopPropagation()}> 
        
        {/* 1. Time Control */}
        <div>
          <h4 className="font-bold text-gray-400 mb-2 uppercase text-[10px]">⏳ 时间控制 (Time)</h4>
          
          {status === TimerStatus.RUNNING || status === TimerStatus.RESTING ? (
             <div className="grid grid-cols-2 gap-2">
               {mode === AppMode.POMODORO || status === TimerStatus.RESTING ? (
                 <>
                   <button onClick={() => handleSetTimeRemaining(5)} className="bg-blue-600 hover:bg-blue-500 py-1.5 rounded text-white font-bold transition-transform active:scale-95">
                     剩 5 秒
                   </button>
                   <button onClick={() => handleSetTimeRemaining(60)} className="bg-blue-800 hover:bg-blue-700 py-1.5 rounded text-white font-bold transition-transform active:scale-95">
                     剩 1 分钟
                   </button>
                 </>
               ) : (
                  <button onClick={() => handleFastForwardFlow(60)} className="col-span-2 bg-indigo-600 hover:bg-indigo-500 py-1.5 rounded text-white font-bold transition-transform active:scale-95">
                    快进 +1 分钟
                  </button>
               )}
             </div>
          ) : (
            <div className="text-gray-500 italic bg-white/5 p-2 rounded text-center border border-white/5">
                计时器未运行
            </div>
          )}
        </div>

        {/* 2. Mock Data */}
        <div>
          <h4 className="font-bold text-gray-400 mb-2 uppercase text-[10px]">📊 数据伪造 (Data Mock)</h4>
          <div className="flex flex-col gap-2">
            <button onClick={injectTodayData} className="bg-emerald-700 hover:bg-emerald-600 py-1.5 px-3 rounded text-left flex justify-between items-center transition-transform active:scale-95">
              <span>注入今日数据 (5条)</span>
              <span className="opacity-50 text-[10px]">+</span>
            </button>
            <button onClick={fillWeekData} className="bg-emerald-900 hover:bg-emerald-800 py-1.5 px-3 rounded text-left flex justify-between items-center transition-transform active:scale-95">
              <span>填满本周 (随机)</span>
              <span className="opacity-50 text-[10px]">++</span>
            </button>
            <button onClick={clearAllData} className="bg-red-900/80 hover:bg-red-800 py-1.5 px-3 rounded text-left flex justify-between items-center text-red-100 border border-red-800 transition-transform active:scale-95">
              <span>⚠️ 清空所有数据</span>
              <span className="opacity-50 text-[10px]">DEL</span>
            </button>
          </div>
        </div>

        {/* 3. Debug State */}
        <div>
          <h4 className="font-bold text-gray-400 mb-2 uppercase text-[10px]">🛠 状态调试 (Status)</h4>
          <button onClick={onForceComplete} className="w-full bg-yellow-700 hover:bg-yellow-600 py-2 rounded font-bold text-yellow-100 mb-2 shadow-sm active:scale-95 transition-transform">
            🚀 强制完成 (Force Complete)
          </button>
          <div className="text-[9px] text-gray-500 mt-2 bg-black/40 p-2 rounded font-mono">
              Mode: {mode === AppMode.POMODORO ? '倒计时' : '心流'}<br/>
              Status: {status}
          </div>
        </div>
      </div>
    </div>
  );
};
