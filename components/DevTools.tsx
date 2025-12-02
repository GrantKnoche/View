
import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') === 'true') {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  // --- Time Actions ---

  const handleSetTimeRemaining = (seconds: number) => {
    if (status !== TimerStatus.RUNNING && status !== TimerStatus.RESTING) return;
    
    // Update visual state
    setTimeLeft(seconds);
    
    // CRITICAL: Update the Target Timestamp Ref
    // The main loop uses (endTime - now), so we must adjust endTime to be (now + seconds)
    endTimeRef.current = Date.now() + (seconds * 1000);
  };

  const handleFastForwardFlow = (seconds: number) => {
    // In flow mode, we just add to the "piggy bank"
    setAccumulatedTime(prev => prev + seconds);
  };

  // --- Data Actions ---

  const generateRandomRecord = (dateOffsetDays: number): SessionRecord => {
    const d = new Date();
    d.setDate(d.getDate() - dateOffsetDays);
    // Random hour between 8am and 10pm
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
    // Generate data for past 7 days
    for (let day = 0; day < 7; day++) {
      // 3 to 8 tomatoes per day
      const count = 3 + Math.floor(Math.random() * 6);
      for (let i = 0; i < count; i++) {
        newRecords.push(generateRandomRecord(day));
      }
    }
    saveAndReload(newRecords);
  };

  const clearAllData = () => {
    localStorage.removeItem(STORAGE_KEY_HISTORY);
    localStorage.removeItem(STORAGE_KEY_ACHIEVEMENTS);
    setHistory([]);
    setUnlockedAchievements([]);
    window.location.reload(); // Hard reset easiest for achievements
  };

  const saveAndReload = (newRecords: SessionRecord[]) => {
    const existingStr = localStorage.getItem(STORAGE_KEY_HISTORY);
    const existing: SessionRecord[] = existingStr ? JSON.parse(existingStr) : [];
    const combined = [...existing, ...newRecords];
    
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(combined));
    setHistory(combined); // Update App State
  };

  return (
    <div className="fixed right-5 top-1/2 transform -translate-y-1/2 w-[280px] bg-black/80 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl p-4 z-[9999] text-white font-mono text-xs">
      <div className="flex justify-between items-center mb-4 border-b border-white/20 pb-2">
        <h3 className="font-bold text-green-400">⚡ DEV TOOLS</h3>
        <span className="text-[10px] text-gray-400">v1.0</span>
      </div>

      {/* 1. Time Control */}
      <div className="mb-4">
        <h4 className="font-bold text-gray-400 mb-2 uppercase text-[10px]">⏳ Time Control</h4>
        
        {status === TimerStatus.RUNNING || status === TimerStatus.RESTING ? (
           <div className="grid grid-cols-2 gap-2">
             {mode === AppMode.POMODORO || status === TimerStatus.RESTING ? (
               <>
                 <button onClick={() => handleSetTimeRemaining(5)} className="bg-blue-600 hover:bg-blue-500 py-1 rounded text-white">
                   Set Left: 5s
                 </button>
                 <button onClick={() => handleSetTimeRemaining(60)} className="bg-blue-900 hover:bg-blue-800 py-1 rounded text-white">
                   Set Left: 1m
                 </button>
               </>
             ) : (
                <button onClick={() => handleFastForwardFlow(60)} className="col-span-2 bg-indigo-600 hover:bg-indigo-500 py-1 rounded text-white">
                  Forward +1m
                </button>
             )}
           </div>
        ) : (
          <div className="text-gray-500 italic">Timer not running</div>
        )}
      </div>

      {/* 2. Mock Data */}
      <div className="mb-4">
        <h4 className="font-bold text-gray-400 mb-2 uppercase text-[10px]">📊 Mock Data</h4>
        <div className="flex flex-col gap-2">
          <button onClick={injectTodayData} className="bg-emerald-700 hover:bg-emerald-600 py-1 px-2 rounded text-left flex justify-between">
            <span>Inject Today (5)</span>
            <span>+</span>
          </button>
          <button onClick={fillWeekData} className="bg-emerald-900 hover:bg-emerald-800 py-1 px-2 rounded text-left flex justify-between">
            <span>Fill Week (Random)</span>
            <span>++</span>
          </button>
          <button onClick={clearAllData} className="bg-red-900 hover:bg-red-800 py-1 px-2 rounded text-left flex justify-between text-red-200">
            <span>⚠️ Clear All Data</span>
            <span>X</span>
          </button>
        </div>
      </div>

      {/* 3. Debug State */}
      <div>
        <h4 className="font-bold text-gray-400 mb-2 uppercase text-[10px]">🛠 Status</h4>
        <button onClick={onForceComplete} className="w-full bg-yellow-700 hover:bg-yellow-600 py-2 rounded font-bold text-yellow-100 mb-2">
          Force Complete
        </button>
        <div className="text-[9px] text-gray-500 mt-2">
            Mode: {mode} <br/>
            Status: {status}
        </div>
      </div>

    </div>
  );
};
