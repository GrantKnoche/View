import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TimerDisplay } from './components/TimerDisplay';
import { WheelPicker } from './components/WheelPicker';
import { StatsView } from './components/StatsView';
import { AchievementsView } from './components/AchievementsView';
import { DevTools } from './components/DevTools';
import { Confetti } from './components/Confetti';
import { 
  TomatoIcon, PlayIcon, XIcon, ClockIcon, ChartIcon, TrophyIcon, CheckCircleIcon, PlayIcon as ResumeIcon
} from './components/Icons';
import { AppMode, TimerStatus, PomodoroConfig, Language, AppView, SessionRecord, UnlockedAchievement, FeedbackState } from './types';
import { 
  TOMATO_DURATION_MINUTES,
  BASE_REST_MINUTES,
  BONUS_REST_MINUTES,
  ONE_MINUTE_SECONDS, 
  INTERRUPTION_THRESHOLD_SECONDS,
  STORAGE_KEY_LANG,
  ACHIEVEMENTS_LIST
} from './constants';
import { getHistory, saveSessionRecord, getUnlockedAchievements, checkAndUnlockAchievements } from './utils/storageUtils';
import { t } from './utils/i18n';
import { playEncouragementSound, playCompleteSound, playClickSound, playActionSound, playCancelSound, initAudioContext } from './utils/soundUtils';

// SEQUENCE PHASES
enum CompletionPhase {
  IDLE = 0,
  SUMMARY = 1,      // First popup: "Completed X Tomatoes"
  ACHIEVEMENT = 2,  // Second popup: "Achievement Unlocked" + Confetti
  DONE = 3          // Transition to Rest
}

const App = () => {
  // --- State ---
  const [lang, setLang] = useState<Language>('en');
  const [currentView, setCurrentView] = useState<AppView>('TIMER');
  
  const [mode, setMode] = useState<AppMode>(AppMode.POMODORO);
  const [status, setStatus] = useState<TimerStatus>(TimerStatus.IDLE);
  
  // Timer State (Visual)
  const [timeLeft, setTimeLeft] = useState(TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS);
  const [elapsedTime, setElapsedTime] = useState(0); 
  
  // Timer Accuracy Refs (Target Timestamp Pattern)
  const endTimeRef = useRef<number | null>(null);   // For Countdown (Pomodoro/Rest)
  const pausedTimeRemainingRef = useRef<number | null>(null); // To store remaining time when paused
  
  // Flow Mode Accuracy
  const startTimeRef = useRef<number | null>(null); // Start time of current segment
  const [accumulatedTime, setAccumulatedTime] = useState(0); // "Piggy bank" for previous segments

  const timerInterval = useRef<number | null>(null);
  const encourageTriggeredRef = useRef<boolean>(false);

  // Configuration
  const [config, setConfig] = useState<PomodoroConfig>({
    tomatoesToComplete: 1, // Default 1
  });

  // Session State
  const [isBreakPhase, setIsBreakPhase] = useState(false);
  const [currentBreakDuration, setCurrentBreakDuration] = useState(0); // Calculated dynamically
  const [feedback, setFeedback] = useState<FeedbackState>({ type: null });

  // Completion Sequence State
  const [completionPhase, setCompletionPhase] = useState<CompletionPhase>(CompletionPhase.IDLE);
  const [tempAchievementUnlock, setTempAchievementUnlock] = useState<UnlockedAchievement | null>(null);

  // Data State
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);

  // --- Initialization ---
  useEffect(() => {
    const savedLang = localStorage.getItem(STORAGE_KEY_LANG) as Language;
    if (savedLang) setLang(savedLang);
    setHistory(getHistory());
    setUnlockedAchievements(getUnlockedAchievements());
  }, []);

  // Audio Init
  useEffect(() => {
    const handleUserInteraction = () => { initAudioContext(); };
    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction); 
    window.addEventListener('pointerdown', handleUserInteraction); 
    
    return () => {
        window.removeEventListener('click', handleUserInteraction);
        window.removeEventListener('touchstart', handleUserInteraction);
        window.removeEventListener('keydown', handleUserInteraction);
        window.removeEventListener('pointerdown', handleUserInteraction);
    };
  }, []);

  const toggleLanguage = () => {
    playClickSound();
    const newLang = lang === 'en' ? 'zh' : 'en';
    setLang(newLang);
    localStorage.setItem(STORAGE_KEY_LANG, newLang);
  };

  const getCurrentTomatoIndex = () => {
    if (mode === AppMode.FLOW || status === TimerStatus.IDLE) return 1;
    const totalTime = config.tomatoesToComplete * TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS;
    const timeSpent = totalTime - timeLeft;
    return Math.min(Math.floor(timeSpent / (TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS)) + 1, config.tomatoesToComplete);
  };

  // --- Timer Tick ---
  const tick = useCallback(() => {
    const now = Date.now();
    if (mode === AppMode.FLOW) {
      if (startTimeRef.current !== null) {
        const currentSegment = Math.floor((now - startTimeRef.current) / 1000);
        const total = accumulatedTime + currentSegment;
        setElapsedTime(total);
        setTimeLeft(total); 
      }
    } else {
      if (endTimeRef.current !== null) {
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
        setTimeLeft(remaining);
        if (mode === AppMode.POMODORO && !isBreakPhase) {
            if (remaining <= 121 && remaining > 119 && !encourageTriggeredRef.current) {
                playEncouragementSound();
                setFeedback({ type: 'ENCOURAGE' });
                setTimeout(() => setFeedback({ type: null }), 5000);
                encourageTriggeredRef.current = true;
            }
        }
        if (remaining <= 0) handleTimerComplete();
      }
    }
  }, [mode, status, isBreakPhase, accumulatedTime]); 

  useEffect(() => {
    if (status === TimerStatus.RUNNING || status === TimerStatus.RESTING) {
      if (timerInterval.current) clearInterval(timerInterval.current);
      tick();
      timerInterval.current = window.setInterval(tick, 1000);
    } else {
      if (timerInterval.current) clearInterval(timerInterval.current);
    }
    return () => { if (timerInterval.current) clearInterval(timerInterval.current); };
  }, [status, tick]);

  useEffect(() => {
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
             if (status === TimerStatus.RUNNING || status === TimerStatus.RESTING) tick();
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status, tick]);

  const handleSessionEnd = (type: 'TOMATO' | 'FLOW', durationMinutes: number, completed: boolean) => {
    const newRecord: SessionRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      durationMinutes,
      completed
    };
    const updatedHistory = saveSessionRecord(newRecord);
    setHistory(updatedHistory);
    
    // Return unlocked achievements so we can show them
    if (completed) {
        const newUnlocks = checkAndUnlockAchievements(updatedHistory);
        if (newUnlocks.length > 0) {
           setUnlockedAchievements(getUnlockedAchievements());
           return newUnlocks[0]; // Return the first new unlock
        }
    }
    return null;
  };

  const handleTimerComplete = () => {
    if (timerInterval.current) clearInterval(timerInterval.current);

    // If it was a break that just finished
    if (isBreakPhase) {
      setIsBreakPhase(false);
      resetToIdle();
      playActionSound(); // Gentle sound for break end
      return;
    }

    // --- SEQUENCED COMPLETION ---
    playCompleteSound();
    
    // 1. Save data immediately
    let unlocked = null;
    for (let i = 0; i < config.tomatoesToComplete; i++) {
        const u = handleSessionEnd('TOMATO', TOMATO_DURATION_MINUTES, true);
        if (u) unlocked = u;
    }
    
    // Store unlock for Phase 2 logic
    if (unlocked) {
        setTempAchievementUnlock({ id: unlocked.id, unlockedAt: Date.now() });
    } else {
        setTempAchievementUnlock(null);
    }

    // 2. Start Phase 1: Summary immediately
    setCompletionPhase(CompletionPhase.SUMMARY);
  };

  // --- Sequence Transition Logic ---
  useEffect(() => {
      let timer: number;

      // Phase 1: Summary -> Waits 2s -> Checks Achievement
      if (completionPhase === CompletionPhase.SUMMARY) {
          timer = window.setTimeout(() => {
              if (tempAchievementUnlock) {
                  setCompletionPhase(CompletionPhase.ACHIEVEMENT);
              } else {
                  setCompletionPhase(CompletionPhase.DONE);
              }
          }, 2000);
      }
      
      // Phase 2: Achievement -> Waits 2s -> Done
      else if (completionPhase === CompletionPhase.ACHIEVEMENT) {
          timer = window.setTimeout(() => {
              setCompletionPhase(CompletionPhase.DONE);
          }, 2000);
      }

      // Phase 3: Done -> Transitions to Rest Mode
      else if (completionPhase === CompletionPhase.DONE) {
           const N = config.tomatoesToComplete;
           const totalRest = (N * BASE_REST_MINUTES) + (Math.max(0, N - 1) * BONUS_REST_MINUTES);
           setCurrentBreakDuration(totalRest);
           setIsBreakPhase(true);
           setStatus(TimerStatus.RESTING);
           
           const totalRestSeconds = totalRest * ONE_MINUTE_SECONDS;
           setTimeLeft(totalRestSeconds);
           endTimeRef.current = Date.now() + (totalRestSeconds * 1000);
           
           setCompletionPhase(CompletionPhase.IDLE);
           setFeedback({ type: null });
           setTempAchievementUnlock(null);
      }

      return () => { if (timer) clearTimeout(timer); };
  }, [completionPhase, tempAchievementUnlock, config.tomatoesToComplete]);


  const startTimer = () => {
    playActionSound();
    const now = Date.now();
    
    if (status === TimerStatus.PAUSED) {
        // RESUME LOGIC (Only if paused externally, though UI flow now prevents this usually)
        if (mode === AppMode.POMODORO) {
             const remaining = pausedTimeRemainingRef.current || timeLeft;
             setTimeLeft(remaining);
             endTimeRef.current = now + (remaining * 1000);
        } else {
            startTimeRef.current = now;
        }
        setStatus(TimerStatus.RUNNING);
        setFeedback({ type: null });
        return;
    }

    // NEW START LOGIC
    if (mode === AppMode.POMODORO) {
      setIsBreakPhase(false);
      const durationSeconds = config.tomatoesToComplete * TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS;
      setTimeLeft(durationSeconds);
      endTimeRef.current = now + (durationSeconds * 1000);
      encourageTriggeredRef.current = false;
      setStatus(TimerStatus.RUNNING);
    } else {
      setAccumulatedTime(0);
      setElapsedTime(0);
      setTimeLeft(0);
      startTimeRef.current = now;
      setStatus(TimerStatus.RUNNING);
    }
    setFeedback({ type: null });
  };

  // Handles "Give Up" / Cancellation immediately
  const requestCancelTimer = () => {
    playCancelSound(); // Sad sound
    if (timerInterval.current) clearInterval(timerInterval.current);
    
    // 1. Process Data (Interruption Logic)
    if (mode === AppMode.FLOW) {
        const flowMinutes = Math.floor(accumulatedTime / 60);
        if (flowMinutes > 0) handleSessionEnd('FLOW', flowMinutes, true);
    } else {
        // Pomodoro Interruption Logic
        const durationSeconds = config.tomatoesToComplete * TOMATO_DURATION_MINUTES * 60;
        const currentElapsedForStats = Math.max(0, durationSeconds - timeLeft);
        
        // Credit for fully completed tomatoes in the batch (if any)
        const completed = Math.floor(currentElapsedForStats / (TOMATO_DURATION_MINUTES * 60));
        for (let i = 0; i < completed; i++) handleSessionEnd('TOMATO', TOMATO_DURATION_MINUTES, true);
        
        // Record Interruption for the current broken one
        const currentFractionElapsed = currentElapsedForStats % (TOMATO_DURATION_MINUTES * 60);
        if (currentFractionElapsed >= INTERRUPTION_THRESHOLD_SECONDS) {
            handleSessionEnd('TOMATO', Math.floor(currentFractionElapsed / 60), false);
        }
    }

    // 2. Show UI Feedback
    setFeedback({ type: 'BROKEN' });
    
    // 3. Auto Reset after 1.5s
    setTimeout(() => {
        resetToIdle();
    }, 1500);
  };

  const resetToIdle = (clearFeedback = true) => {
    setStatus(TimerStatus.IDLE);
    setIsBreakPhase(false);
    setElapsedTime(0);
    setAccumulatedTime(0);
    startTimeRef.current = null;
    endTimeRef.current = null;
    pausedTimeRemainingRef.current = null;
    if (mode === AppMode.POMODORO) setTimeLeft(config.tomatoesToComplete * TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS);
    else setTimeLeft(0);
    if (clearFeedback) setFeedback({ type: null });
    setCompletionPhase(CompletionPhase.IDLE);
  };

  const switchMode = (newMode: AppMode) => {
    playClickSound();
    if (status !== TimerStatus.IDLE) return;
    setMode(newMode);
    if (newMode === AppMode.POMODORO) setTimeLeft(config.tomatoesToComplete * TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS);
    else setTimeLeft(0);
  };

  const changeView = (view: AppView) => { playClickSound(); setCurrentView(view); }

  // --- DEV TOOLS HANDLERS ---
  const handleDevSetCountdown = (totalSeconds: number) => {
    if (mode === AppMode.POMODORO) {
      setTimeLeft(totalSeconds);
      endTimeRef.current = Date.now() + (totalSeconds * 1000);
    }
  };

  const handleDevAddFlowTime = (seconds: number) => {
    if (mode === AppMode.FLOW) {
      setAccumulatedTime(prev => prev + seconds);
      setElapsedTime(prev => prev + seconds);
    }
  };

  const handleDevInjectHistory = (records: SessionRecord[]) => {
    let updatedHistory = history;
    records.forEach(record => {
      updatedHistory = saveSessionRecord(record);
    });
    setHistory(updatedHistory);
    const newUnlocks = checkAndUnlockAchievements(updatedHistory);
    if (newUnlocks.length > 0) {
      setUnlockedAchievements(getUnlockedAchievements());
    }
  };

  const renderCurrentView = () => {
    if (currentView === 'STATS') return <StatsView history={history} lang={lang} />;
    if (currentView === 'ACHIEVEMENTS') return <AchievementsView unlocked={unlockedAchievements} lang={lang} />;
    
    return (
      <div className="w-full h-full flex flex-col items-center animate-fade-in relative overflow-hidden pt-4 pb-4 justify-between">
         <div className="absolute top-12 right-0 w-48 h-48 bg-tomato-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
         <div className="absolute bottom-32 left-0 w-48 h-48 bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

        {/* Mode Switcher */}
        <div className="flex flex-col justify-end items-center pb-2 h-12 shrink-0">
             <div className={`flex bg-white/60 backdrop-blur-xl p-1 rounded-2xl shadow-sm border border-white/20 relative z-10 transition-opacity duration-300 ${status === TimerStatus.IDLE ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button onClick={() => switchMode(AppMode.POMODORO)} className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 ${mode === AppMode.POMODORO ? 'bg-white text-tomato-500 shadow-sm' : 'text-gray-500 hover:bg-white/30'}`}>{t('mode_countdown', lang)}</button>
                <button onClick={() => switchMode(AppMode.FLOW)} className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 ${mode === AppMode.FLOW ? 'bg-white text-blue-500 shadow-sm' : 'text-gray-500 hover:bg-white/30'}`}>{t('mode_flow', lang)}</button>
            </div>
        </div>

        {/* Center: Timer & Picker - Fixed Height Container Logic to prevent Jitter */}
        <div className="flex-1 flex flex-col items-center justify-center relative w-full gap-2 overflow-hidden">
             
             {/* Timer Container */}
             <div 
               className="w-full flex flex-col items-center transition-transform duration-700 ease-in-out will-change-transform z-10"
               style={{ 
                   transform: mode === AppMode.FLOW && status === TimerStatus.RUNNING 
                    ? 'translateY(60px)' 
                    : 'translateY(0)' 
               }}
             >
                <TimerDisplay 
                    timeRemaining={mode === AppMode.POMODORO ? timeLeft : elapsedTime}
                    totalDuration={isBreakPhase ? currentBreakDuration * 60 : config.tomatoesToComplete * TOMATO_DURATION_MINUTES * 60}
                    status={status} mode={mode} currentTomatoIndex={getCurrentTomatoIndex()} totalTomatoes={config.tomatoesToComplete} lang={lang} feedback={feedback}
                />
            </div>

            {/* Picker Container - Fixed Height to Reserve Space */}
            <div className="relative w-full h-[220px] flex items-center justify-center shrink-0">
                <div className={`absolute inset-0 transition-all duration-500 flex flex-col items-center justify-center ${
                    status === TimerStatus.IDLE && mode === AppMode.POMODORO 
                    ? 'opacity-100 translate-y-0 pointer-events-auto' 
                    : 'opacity-0 translate-y-4 pointer-events-none'
                }`}>
                    <WheelPicker 
                        min={1} max={8} 
                        value={config.tomatoesToComplete} 
                        onChange={(v) => {
                            if (status === TimerStatus.IDLE) {
                                setConfig({...config, tomatoesToComplete: v});
                                setTimeLeft(v * TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS);
                            }
                        }}
                    />
                </div>
            </div>
        </div>

        {/* Bottom: Action Button */}
        <div className="flex flex-col justify-center items-center pb-12 h-32 shrink-0">
            <div className="relative w-20 h-20 flex items-center justify-center">
                {status === TimerStatus.IDLE ? (
                    <button onClick={startTimer} className="group absolute inset-0 w-20 h-20 bg-tomato-500 rounded-full flex items-center justify-center shadow-lg shadow-tomato-500/30 transition-transform active:scale-90 hover:-translate-y-1 z-20 border-2 border-white/20">
                        <PlayIcon className="text-white w-9 h-9 ml-1" />
                    </button>
                ) : (
                    <button onClick={requestCancelTimer} className="group absolute inset-0 w-20 h-20 bg-white/80 backdrop-blur-md border-2 border-gray-100 rounded-full flex items-center justify-center shadow-lg hover:border-red-200 hover:bg-red-50/50 transition-all active:scale-90 z-20">
                        <XIcon className="text-gray-400 group-hover:text-red-500 w-8 h-8 transition-colors" />
                    </button>
                )}
            </div>
        </div>

      </div>
    );
  };

  return (
    <>
      <div id="app-scale-wrapper">
        <div className="iphone-frame">
          <div className="iphone-screen bg-cream relative z-0">
              
              {/* PHASE 2 (Logic): ACHIEVEMENT + CONFETTI */}
              {completionPhase === CompletionPhase.ACHIEVEMENT && <Confetti />}

              {/* PHASE 1: SUMMARY CARD */}
              {completionPhase === CompletionPhase.SUMMARY && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center animate-bounce-in pointer-events-none">
                     <div className="bg-[#FAFAFA] rounded-[32px] shadow-clay-card p-8 flex flex-col items-center gap-4 mx-8 pointer-events-auto text-center border border-white">
                         <div className="w-16 h-16 bg-gradient-to-tr from-yellow-300 to-orange-400 rounded-full flex items-center justify-center text-white shadow-inner mb-2 animate-bounce">
                            <CheckCircleIcon className="w-9 h-9" />
                         </div>
                         <h3 className="text-2xl font-black text-gray-700 leading-none">
                            {t('msg_reward_base', lang)}
                         </h3>
                         <p className="text-sm font-bold text-gray-400">
                            {config.tomatoesToComplete > 1 
                                ? t('card_session_complete', lang, { count: config.tomatoesToComplete })
                                : t('card_tomato_complete', lang)
                            }
                         </p>
                         {/* Show Bonus if applicable */}
                         {config.tomatoesToComplete > 1 && (
                             <div className="bg-orange-100 text-orange-600 px-4 py-1.5 rounded-full text-xs font-black border border-orange-200 mt-2">
                                {t('msg_reward_bonus', lang, { min: Math.max(0, config.tomatoesToComplete - 1) * BONUS_REST_MINUTES })}
                             </div>
                         )}
                     </div>
                </div>
              )}

              {/* PHASE 2: ACHIEVEMENT UNLOCKED */}
              {completionPhase === CompletionPhase.ACHIEVEMENT && tempAchievementUnlock && (
                  <div className="absolute inset-0 z-[70] flex items-center justify-center px-6 pointer-events-none">
                    <div className="relative bg-white/90 backdrop-blur-xl px-6 py-6 rounded-[40px] shadow-2xl border border-white/60 flex flex-col items-center justify-center gap-4 animate-drop-in pointer-events-auto">
                        
                        {/* Rotating Light Effect Background */}
                        <div className="absolute inset-0 -z-10 flex items-center justify-center overflow-hidden rounded-[40px]">
                             <div className="w-[300px] h-[300px] bg-gradient-to-r from-transparent via-yellow-200/40 to-transparent absolute animate-rotate-shine"></div>
                             <div className="w-[300px] h-[300px] bg-gradient-to-b from-transparent via-yellow-200/40 to-transparent absolute animate-rotate-shine" style={{ animationDelay: '-1.5s' }}></div>
                        </div>

                        <span className="text-6xl animate-bounce filter drop-shadow-md">🏆</span>
                        <div className="text-center">
                            <div className="text-xs text-yellow-600 font-black uppercase tracking-widest mb-1">{t('ach_unlocked', lang)}</div>
                            <span className="text-xl font-black text-gray-800 leading-tight block">
                                {t(ACHIEVEMENTS_LIST.find(a => a.id === tempAchievementUnlock.id)?.titleKey || '', lang)}
                            </span>
                        </div>
                    </div>
                  </div>
              )}
              
              {/* Header */}
              <header className="w-full flex justify-between items-center px-6 py-3 pt-10 z-20 bg-white/60 backdrop-blur-2xl sticky top-0 border-b border-white/20 transition-colors">
                  <div className="flex items-center gap-2.5">
                  <TomatoIcon className="w-9 h-9 filter drop-shadow-sm" />
                  <h1 className="text-lg font-black text-gray-800 tracking-tight">{t('app_title', lang)}</h1>
                  </div>
                  <button onClick={toggleLanguage} className="text-[11px] font-bold text-gray-600 bg-white/50 border border-white/40 px-3 py-1.5 rounded-full shadow-sm hover:bg-white transition-all active:scale-95 backdrop-blur-md">
                  {lang === 'en' ? '中文' : 'EN'}
                  </button>
              </header>

              <main className={`flex-1 w-full relative no-scrollbar flex flex-col z-10 ${currentView === 'TIMER' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                  {renderCurrentView()}
              </main>

              <nav className="w-full bg-white/60 backdrop-blur-2xl border-t border-white/20 pb-4 pt-3 px-6 flex justify-between items-center z-30 shrink-0">
                  <button onClick={() => changeView('TIMER')} className={`flex flex-col items-center flex-1 p-1 transition-all active:scale-95 ${currentView === 'TIMER' ? 'text-tomato-500 scale-105' : 'text-gray-400 hover:text-gray-500'}`}>
                  <ClockIcon className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wide">{t('nav_timer', lang)}</span>
                  </button>
                  <button onClick={() => changeView('STATS')} className={`flex flex-col items-center flex-1 p-1 transition-all active:scale-95 ${currentView === 'STATS' ? 'text-tomato-500 scale-105' : 'text-gray-400 hover:text-gray-500'}`}>
                  <ChartIcon className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wide">{t('nav_stats', lang)}</span>
                  </button>
                  <button onClick={() => changeView('ACHIEVEMENTS')} className={`flex flex-col items-center flex-1 p-1 transition-all active:scale-95 ${currentView === 'ACHIEVEMENTS' ? 'text-tomato-500 scale-105' : 'text-gray-400 hover:text-gray-500'}`}>
                  <TrophyIcon className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wide">{t('nav_achievements', lang)}</span>
                  </button>
              </nav>
          </div>
        </div>
      </div>
      
      {/* DEV TOOLS (Overlays everything) */}
      <DevTools 
        mode={mode}
        onSetCountdown={handleDevSetCountdown}
        onAddFlowTime={handleDevAddFlowTime}
        onInjectHistory={handleDevInjectHistory}
      />
    </>
  );
};

export default App;