

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TimerDisplay } from './components/TimerDisplay';
import { WheelPicker } from './components/WheelPicker';
import { StatsView } from './components/StatsView';
import { AchievementsView } from './components/AchievementsView';
import { AiThemeView } from './components/AiThemeView';
import { DevTools } from './components/DevTools';
import { 
  TomatoIcon, PlayIcon, XIcon, ClockIcon, ChartIcon, TrophyIcon, MagicIcon
} from './components/Icons';
import { AppMode, TimerStatus, PomodoroConfig, Language, AppView, SessionRecord, UnlockedAchievement, FeedbackState, CustomTheme } from './types';
import { 
  TOMATO_DURATION_MINUTES,
  BASE_REST_MINUTES,
  BONUS_REST_MINUTES,
  ONE_MINUTE_SECONDS, 
  INTERRUPTION_THRESHOLD_SECONDS,
  STORAGE_KEY_LANG
} from './constants';
import { getHistory, saveSessionRecord, getUnlockedAchievements, checkAndUnlockAchievements } from './utils/storageUtils';
import { t } from './utils/i18n';
import { playEncouragementSound, playCompleteSound, playClickSound, playActionSound, playCancelSound } from './utils/soundUtils';

const STORAGE_KEY_THEME = 'pomodoro_friends_theme_v1';

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

  // Data State
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [showAchievementPopup, setShowAchievementPopup] = useState<string | null>(null);

  // Theme State (AI)
  const [customTheme, setCustomTheme] = useState<CustomTheme | null>(null);

  // --- Initialization ---
  useEffect(() => {
    // Load Lang
    const savedLang = localStorage.getItem(STORAGE_KEY_LANG) as Language;
    if (savedLang) setLang(savedLang);

    // Load Data
    setHistory(getHistory());
    setUnlockedAchievements(getUnlockedAchievements());

    // Load Theme
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
    if (savedTheme) {
        try {
            setCustomTheme(JSON.parse(savedTheme));
        } catch (e) {}
    }
  }, []);

  const toggleLanguage = () => {
    playClickSound();
    const newLang = lang === 'en' ? 'zh' : 'en';
    setLang(newLang);
    localStorage.setItem(STORAGE_KEY_LANG, newLang);
  };

  const handleThemeSet = (theme: CustomTheme | null) => {
      setCustomTheme(theme);
      if (theme) {
          localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(theme));
      } else {
          localStorage.removeItem(STORAGE_KEY_THEME);
      }
      setCurrentView('TIMER');
  };

  // --- Helpers ---
  
  const getCurrentTomatoIndex = () => {
    if (mode === AppMode.FLOW || status === TimerStatus.IDLE) return 1;
    const totalTime = config.tomatoesToComplete * TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS;
    // Note: In Target Timestamp mode, we rely on timeLeft which is updated every tick
    const timeSpent = totalTime - timeLeft;
    return Math.min(Math.floor(timeSpent / (TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS)) + 1, config.tomatoesToComplete);
  };

  // --- Timer Logic (Target Timestamp) ---

  const tick = useCallback(() => {
    const now = Date.now();

    if (mode === AppMode.FLOW) {
      if (startTimeRef.current !== null) {
        // Core Logic: Current Segment Delta + Accumulated Past
        const currentSegment = Math.floor((now - startTimeRef.current) / 1000);
        const total = accumulatedTime + currentSegment;
        
        setElapsedTime(total);
        setTimeLeft(total); // For consistent prop passing to TimerDisplay
      }
    } else {
      // Countdown (Pomodoro or Rest)
      if (endTimeRef.current !== null) {
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
        setTimeLeft(remaining);

        // Encouragement Logic (Approx 2 mins left)
        if (mode === AppMode.POMODORO && !isBreakPhase) {
            if (remaining <= 121 && remaining > 119 && !encourageTriggeredRef.current) {
                playEncouragementSound();
                setFeedback({ type: 'ENCOURAGE' });
                setTimeout(() => setFeedback({ type: null }), 5000);
                encourageTriggeredRef.current = true;
            }
        }

        // Completion
        if (remaining <= 0) {
          handleTimerComplete();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, status, isBreakPhase, accumulatedTime]); // Added accumulatedTime dependency

  // Interval setup
  useEffect(() => {
    if (status === TimerStatus.RUNNING || status === TimerStatus.RESTING) {
      // Clear any existing interval just in case
      if (timerInterval.current) clearInterval(timerInterval.current);
      // Run tick immediately to avoid 1s delay
      tick();
      timerInterval.current = window.setInterval(tick, 1000);
    } else {
      if (timerInterval.current) clearInterval(timerInterval.current);
    }
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [status, tick]);

  // Page Visibility Handler (Auto-sync when waking up)
  useEffect(() => {
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
             // Force an immediate tick to update UI from system clock
             if (status === TimerStatus.RUNNING || status === TimerStatus.RESTING) {
                 tick();
             }
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status, tick]);


  // --- Logic Handlers ---

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

    if (completed) {
        const newUnlocks = checkAndUnlockAchievements(updatedHistory);
        if (newUnlocks.length > 0) {
        setUnlockedAchievements(getUnlockedAchievements());
        setShowAchievementPopup(t(newUnlocks[0].titleKey, lang));
        setTimeout(() => setShowAchievementPopup(null), 3000);
        }
    }
  };

  const handleTimerComplete = () => {
    // Clear interval immediately to prevent double firing
    if (timerInterval.current) clearInterval(timerInterval.current);

    if (isBreakPhase) {
      // Break is over
      setIsBreakPhase(false);
      resetToIdle();
    } else {
      // Pomodoro Batch Completed
      playCompleteSound();
      for (let i = 0; i < config.tomatoesToComplete; i++) {
          handleSessionEnd('TOMATO', TOMATO_DURATION_MINUTES, true);
      }
      const N = config.tomatoesToComplete;
      const baseRest = N * BASE_REST_MINUTES;
      const bonusRest = Math.max(0, N - 1) * BONUS_REST_MINUTES;
      const totalRest = baseRest + bonusRest;

      setCurrentBreakDuration(totalRest);
      setIsBreakPhase(true);
      setStatus(TimerStatus.RESTING);
      
      // Start Break Timer Immediately using Target Timestamp
      const totalRestSeconds = totalRest * ONE_MINUTE_SECONDS;
      setTimeLeft(totalRestSeconds);
      endTimeRef.current = Date.now() + (totalRestSeconds * 1000);

      setFeedback({ 
        type: 'REWARD', 
        extraData: { bonus: bonusRest }
      });
      setTimeout(() => setFeedback({ type: null }), 4000);
    }
  };

  const startTimer = () => {
    playActionSound();
    const now = Date.now();
    
    if (mode === AppMode.POMODORO) {
      setIsBreakPhase(false);
      
      // Setup Target Timestamp
      const durationSeconds = config.tomatoesToComplete * TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS;
      
      setTimeLeft(durationSeconds);
      endTimeRef.current = now + (durationSeconds * 1000);
      encourageTriggeredRef.current = false;
      
      setStatus(TimerStatus.RUNNING);
    } else {
      // Flow Mode
      // Reset accumulated time on fresh start
      setAccumulatedTime(0);
      setElapsedTime(0);
      setTimeLeft(0);
      startTimeRef.current = now;
      setStatus(TimerStatus.RUNNING);
    }
    setFeedback({ type: null });
  };

  const cancelTimer = () => {
    playCancelSound();
    // Clear interval
    if (timerInterval.current) clearInterval(timerInterval.current);

    if (mode === AppMode.FLOW) {
       // Final Calculation
       const currentSegment = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
       const totalSeconds = accumulatedTime + currentSegment;
       
       const flowMinutes = Math.floor(totalSeconds / 60);
       if (flowMinutes > 0) {
          handleSessionEnd('FLOW', flowMinutes, true);
       }
    } else {
      // Calculate how much actual time passed
      const totalDurationSeconds = config.tomatoesToComplete * TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS;
      const remaining = timeLeft; // State is kept up to date by tick
      const elapsedSeconds = Math.max(0, totalDurationSeconds - remaining);
      
      const oneTomatoSeconds = TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS;
      const completedCount = Math.floor(elapsedSeconds / oneTomatoSeconds);
      
      for (let i = 0; i < completedCount; i++) {
        handleSessionEnd('TOMATO', TOMATO_DURATION_MINUTES, true);
      }
      
      const currentTomatoElapsed = elapsedSeconds % oneTomatoSeconds;
      
      if (currentTomatoElapsed >= INTERRUPTION_THRESHOLD_SECONDS) {
          const minutesSpent = Math.floor(currentTomatoElapsed / 60);
          handleSessionEnd('TOMATO', minutesSpent, false);
      }

      setFeedback({ type: 'BROKEN' });
      setTimeout(() => setFeedback({ type: null }), 3000);
    }
    resetToIdle(false); 
  };

  const resetToIdle = (clearFeedback = true) => {
    setStatus(TimerStatus.IDLE);
    setIsBreakPhase(false);
    
    // Reset all flow tracking
    setElapsedTime(0);
    setAccumulatedTime(0);
    startTimeRef.current = null;
    endTimeRef.current = null;

    if (mode === AppMode.POMODORO) {
      setTimeLeft(config.tomatoesToComplete * TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS);
    } else {
      setTimeLeft(0);
    }
    if (clearFeedback) setFeedback({ type: null });
  };

  const switchMode = (newMode: AppMode) => {
    playClickSound();
    if (status !== TimerStatus.IDLE) return;
    setMode(newMode);
    if (newMode === AppMode.POMODORO) {
      setTimeLeft(config.tomatoesToComplete * TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS);
    } else {
      setTimeLeft(0);
    }
  };

  const changeView = (view: AppView) => {
    playClickSound();
    setCurrentView(view);
  }

  // --- Render ---

  const renderCurrentView = () => {
    if (currentView === 'STATS') return <StatsView history={history} lang={lang} />;
    if (currentView === 'ACHIEVEMENTS') return <AchievementsView unlocked={unlockedAchievements} lang={lang} />;
    if (currentView === 'AI_THEME') return <AiThemeView lang={lang} onThemeSet={handleThemeSet} currentTheme={customTheme} />;
    
    // Timer View
    return (
      <div className="w-full h-full flex flex-col items-center animate-fade-in relative overflow-hidden pt-4 pb-4 justify-between">
         {!customTheme && (
           <>
            <div className="absolute top-12 right-0 w-48 h-48 bg-tomato-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-32 left-0 w-48 h-48 bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
           </>
         )}

        {/* Mode Switcher */}
        <div className="flex flex-col justify-end items-center pb-2 h-12 shrink-0">
             <div className={`flex bg-white/60 backdrop-blur-xl p-1 rounded-2xl shadow-sm border border-white/20 relative z-10 transition-opacity duration-300 ${status === TimerStatus.IDLE ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button 
                onClick={() => switchMode(AppMode.POMODORO)}
                className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 ${mode === AppMode.POMODORO ? 'bg-white text-tomato-500 shadow-sm' : 'text-gray-500 hover:bg-white/30'}`}
                >
                {t('mode_countdown', lang)}
                </button>
                <button 
                onClick={() => switchMode(AppMode.FLOW)}
                className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 ${mode === AppMode.FLOW ? 'bg-white text-blue-500 shadow-sm' : 'text-gray-500 hover:bg-white/30'}`}
                >
                {t('mode_flow', lang)}
                </button>
            </div>
        </div>

        {/* Center: Timer & Picker */}
        <div className="flex-1 flex flex-col items-center justify-center relative w-full gap-2">
            <TimerDisplay 
                timeRemaining={mode === AppMode.POMODORO ? timeLeft : elapsedTime}
                totalDuration={isBreakPhase ? currentBreakDuration * 60 : config.tomatoesToComplete * TOMATO_DURATION_MINUTES * 60}
                status={status}
                mode={mode}
                currentTomatoIndex={getCurrentTomatoIndex()}
                totalTomatoes={config.tomatoesToComplete}
                lang={lang}
                feedback={feedback}
            />

            <div className={`transition-all duration-500 overflow-hidden flex flex-col items-center w-full ${status === TimerStatus.IDLE && mode === AppMode.POMODORO ? 'max-h-[220px] opacity-100' : 'max-h-0 opacity-0'}`}>
                 <WheelPicker 
                    min={1} max={8} 
                    value={config.tomatoesToComplete} 
                    onChange={(v) => {
                        // CRITICAL FIX: Only allow config changes when IDLE to prevent
                        // layout-shift triggered events from changing time during start.
                        if (status === TimerStatus.IDLE) {
                            setConfig({...config, tomatoesToComplete: v});
                            // Reset timeLeft preview when picker changes
                            setTimeLeft(v * TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS);
                        }
                    }}
                  />
            </div>

             {mode === AppMode.FLOW && status === TimerStatus.IDLE && (
                <div className="h-16"></div>
             )}
        </div>

        {/* Bottom: Action Button - Moved UP slightly via higher pb */}
        <div className="flex flex-col justify-center items-center pb-12 h-32 shrink-0">
            <div className="relative w-20 h-20 flex items-center justify-center">
                {status === TimerStatus.IDLE ? (
                    <button 
                        onClick={startTimer}
                        className="group absolute inset-0 w-20 h-20 bg-tomato-500 rounded-full flex items-center justify-center shadow-lg shadow-tomato-500/30 transition-transform active:scale-90 hover:-translate-y-1 z-20 border-2 border-white/20"
                    >
                        <PlayIcon className="text-white w-9 h-9 ml-1" />
                    </button>
                ) : (
                    <button 
                        onClick={cancelTimer}
                        className="group absolute inset-0 w-20 h-20 bg-white/80 backdrop-blur-md border-2 border-gray-100 rounded-full flex items-center justify-center shadow-lg hover:border-red-200 hover:bg-red-50/50 transition-all active:scale-90 z-20"
                    >
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
      {/* DevTools injected outside the phone frame for correct positioning */}
      <DevTools 
        mode={mode}
        status={status}
        setTimeLeft={setTimeLeft}
        endTimeRef={endTimeRef}
        setAccumulatedTime={setAccumulatedTime}
        accumulatedTime={accumulatedTime}
        onForceComplete={handleTimerComplete}
        setHistory={setHistory}
        setUnlockedAchievements={setUnlockedAchievements}
      />

      <div id="app-scale-wrapper">
        <div className="iphone-frame">
          <div className={`iphone-screen ${customTheme ? 'bg-transparent' : 'bg-cream'}`}>
              
              {customTheme?.backgroundImage && (
                  <div className="absolute inset-0 z-0">
                      <img src={`data:image/png;base64,${customTheme.backgroundImage}`} alt="Background" className="w-full h-full object-cover opacity-90" />
                      <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px]"></div>
                  </div>
              )}

              {/* Header - iOS 18 Glass */}
              <header className="w-full flex justify-between items-center px-6 py-3 pt-10 z-20 bg-white/60 backdrop-blur-2xl sticky top-0 border-b border-white/20 transition-colors">
                  <div className="flex items-center gap-2.5">
                  <TomatoIcon className="w-9 h-9 filter drop-shadow-sm" />
                  <h1 className="text-lg font-black text-gray-800 tracking-tight">{t('app_title', lang)}</h1>
                  </div>
                  <button 
                  onClick={toggleLanguage}
                  className="text-[11px] font-bold text-gray-600 bg-white/50 border border-white/40 px-3 py-1.5 rounded-full shadow-sm hover:bg-white transition-all active:scale-95 backdrop-blur-md"
                  >
                  {lang === 'en' ? '中文' : 'EN'}
                  </button>
              </header>

              <main className={`flex-1 w-full relative no-scrollbar flex flex-col z-10 ${currentView === 'TIMER' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                  {showAchievementPopup && (
                      <div className="fixed top-28 z-[100] animate-bounce-in pointer-events-none left-1/2 transform -translate-x-1/2 w-full max-w-sm px-4 text-center">
                      <div className="bg-white/90 backdrop-blur-xl text-yellow-900 px-5 py-3 rounded-full shadow-glass border border-white/50 inline-flex items-center justify-center gap-2 font-black text-sm">
                          <span className="text-xl">🏆</span>
                          <span className="truncate">{t('ach_unlocked', lang)} {showAchievementPopup}</span>
                      </div>
                      </div>
                  )}
                  
                  {renderCurrentView()}
              </main>

              {/* Bottom Navigation - iOS 18 Glass */}
              <nav className="w-full bg-white/60 backdrop-blur-2xl border-t border-white/20 pb-4 pt-3 px-6 flex justify-between items-center z-30 shrink-0">
                  <button 
                  onClick={() => changeView('TIMER')}
                  className={`flex flex-col items-center flex-1 p-1 transition-all active:scale-95 ${currentView === 'TIMER' ? 'text-tomato-500 scale-105' : 'text-gray-400 hover:text-gray-500'}`}
                  >
                  <ClockIcon className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wide">{t('nav_timer', lang)}</span>
                  </button>
                  <button 
                  onClick={() => changeView('STATS')}
                  className={`flex flex-col items-center flex-1 p-1 transition-all active:scale-95 ${currentView === 'STATS' ? 'text-tomato-500 scale-105' : 'text-gray-400 hover:text-gray-500'}`}
                  >
                  <ChartIcon className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wide">{t('nav_stats', lang)}</span>
                  </button>
                  <button 
                  onClick={() => changeView('ACHIEVEMENTS')}
                  className={`flex flex-col items-center flex-1 p-1 transition-all active:scale-95 ${currentView === 'ACHIEVEMENTS' ? 'text-tomato-500 scale-105' : 'text-gray-400 hover:text-gray-500'}`}
                  >
                  <TrophyIcon className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wide">{t('nav_achievements', lang)}</span>
                  </button>
                  <button 
                  onClick={() => changeView('AI_THEME')}
                  className={`flex flex-col items-center flex-1 p-1 transition-all active:scale-95 ${currentView === 'AI_THEME' ? 'text-purple-500 scale-105' : 'text-gray-400 hover:text-gray-500'}`}
                  >
                  <MagicIcon className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wide">{t('nav_ai', lang)}</span>
                  </button>
              </nav>
          </div>
        </div>
      </div>
    </>
  );
};

export default App;