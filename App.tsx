import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TimerDisplay } from './components/TimerDisplay';
import { WheelPicker } from './components/WheelPicker';
import { StatsView } from './components/StatsView';
import { AchievementsView } from './components/AchievementsView';
import { AiThemeView } from './components/AiThemeView';
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
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS);
  const [elapsedTime, setElapsedTime] = useState(0); 
  
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

  // Refs for intervals
  const timerInterval = useRef<number | null>(null);

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
  
  // Calculate which tomato we are on (1, 2, 3...) based on time left
  const getCurrentTomatoIndex = () => {
    if (mode === AppMode.FLOW || status === TimerStatus.IDLE) return 1;
    const totalTime = config.tomatoesToComplete * TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS;
    const timeSpent = totalTime - timeLeft;
    // 0-25m = #1, 25-50m = #2
    return Math.min(Math.floor(timeSpent / (TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS)) + 1, config.tomatoesToComplete);
  };

  // --- Timer Logic ---

  const tick = useCallback(() => {
    if (mode === AppMode.FLOW) {
      setElapsedTime(prev => prev + 1);
      setTimeLeft(prev => prev + 1); // For display consistency
    } else {
      // Pomodoro Mode
      setTimeLeft(prev => {
        // Trigger Encouragement at exactly 2 minutes left (120 seconds)
        if (prev === 121) {
            playEncouragementSound();
            setFeedback({ type: 'ENCOURAGE' });
            setTimeout(() => setFeedback({ type: null }), 5000);
        }

        if (prev <= 1) {
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, status]); 

  useEffect(() => {
    if (status === TimerStatus.RUNNING || status === TimerStatus.RESTING) {
      timerInterval.current = window.setInterval(tick, 1000);
    } else {
      if (timerInterval.current) clearInterval(timerInterval.current);
    }
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [status, tick]);

  // --- Logic Handlers ---

  const handleSessionEnd = (type: 'TOMATO' | 'FLOW', durationMinutes: number, completed: boolean) => {
    // Save Record
    const newRecord: SessionRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      durationMinutes,
      completed
    };
    const updatedHistory = saveSessionRecord(newRecord);
    setHistory(updatedHistory);

    // Check Achievements (only on success or relevant updates)
    if (completed) {
        const newUnlocks = checkAndUnlockAchievements(updatedHistory);
        if (newUnlocks.length > 0) {
        setUnlockedAchievements(getUnlockedAchievements());
        // Show first new unlock as popup
        setShowAchievementPopup(t(newUnlocks[0].titleKey, lang));
        setTimeout(() => setShowAchievementPopup(null), 3000);
        }
    }
  };

  const handleTimerComplete = () => {
    if (isBreakPhase) {
      // Break Over -> Reset to Idle
      setIsBreakPhase(false);
      resetToIdle();
    } else {
      // Work Session Over
      playCompleteSound();
      
      // Save all tomatoes in the batch
      for (let i = 0; i < config.tomatoesToComplete; i++) {
          handleSessionEnd('TOMATO', TOMATO_DURATION_MINUTES, true);
      }

      // Calculate Dynamic Rest
      const N = config.tomatoesToComplete;
      const baseRest = N * BASE_REST_MINUTES;
      const bonusRest = Math.max(0, N - 1) * BONUS_REST_MINUTES;
      const totalRest = baseRest + bonusRest;

      setCurrentBreakDuration(totalRest);
      setIsBreakPhase(true);
      setStatus(TimerStatus.RESTING);
      setTimeLeft(totalRest * ONE_MINUTE_SECONDS);

      // Show Reward UI
      setFeedback({ 
        type: 'REWARD', 
        extraData: { bonus: bonusRest }
      });
      setTimeout(() => setFeedback({ type: null }), 4000);
    }
  };

  const startTimer = () => {
    playActionSound();
    if (mode === AppMode.POMODORO) {
      setIsBreakPhase(false);
      // Set total time based on batch size
      setTimeLeft(config.tomatoesToComplete * TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS);
      setStatus(TimerStatus.RUNNING);
    } else {
      setElapsedTime(0);
      setTimeLeft(0);
      setStatus(TimerStatus.RUNNING);
    }
    setFeedback({ type: null });
  };

  const cancelTimer = () => {
    playCancelSound();
    if (mode === AppMode.FLOW) {
       const flowMinutes = Math.floor(elapsedTime / 60);
       if (flowMinutes > 0) {
          handleSessionEnd('FLOW', flowMinutes, true);
       }
    } else {
      // Pomodoro cancelled logic
      const totalSeconds = config.tomatoesToComplete * TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS;
      const elapsedSeconds = totalSeconds - timeLeft;
      
      const oneTomatoSeconds = TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS;
      const completedCount = Math.floor(elapsedSeconds / oneTomatoSeconds);
      
      // 1. Save fully completed tomatoes
      for (let i = 0; i < completedCount; i++) {
        handleSessionEnd('TOMATO', TOMATO_DURATION_MINUTES, true);
      }
      
      // 2. Handle the current INTERRUPTED tomato
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
    setElapsedTime(0);
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
      <div className="w-full h-full flex flex-col items-center animate-fade-in relative overflow-y-auto overflow-x-hidden no-scrollbar pt-4 pb-20">
         {/* Decorative background blobs */}
         {!customTheme && (
           <>
            <div className="absolute top-0 right-0 w-32 h-32 bg-tomato-100 rounded-full mix-blend-multiply filter blur-2xl opacity-70 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-100 rounded-full mix-blend-multiply filter blur-2xl opacity-70 translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
           </>
         )}

        {/* Mode Switcher */}
        <div className={`flex bg-white/90 backdrop-blur-sm p-1 rounded-2xl shadow-inner border border-red-100 mb-2 relative z-10 transition-opacity duration-300 ${status === TimerStatus.IDLE ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <button 
              onClick={() => switchMode(AppMode.POMODORO)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 ${mode === AppMode.POMODORO ? 'bg-tomato-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {t('mode_countdown', lang)}
            </button>
            <button 
              onClick={() => switchMode(AppMode.FLOW)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 ${mode === AppMode.FLOW ? 'bg-blue-400 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {t('mode_flow', lang)}
            </button>
        </div>

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

        {/* Configuration (Only when Idle) */}
        {status === TimerStatus.IDLE && mode === AppMode.POMODORO && (
          <div className="w-full mb-4 z-10">
             <div className="bg-white/90 backdrop-blur-md rounded-3xl p-3 border border-orange-100 max-w-[160px] mx-auto shadow-cartoon-hover">
               <div className="text-center text-orange-800 font-bold mb-2 text-[10px] uppercase tracking-wide opacity-70">{t('header_session_setup', lang)}</div>
               <div className="flex justify-center scale-90">
                  <WheelPicker 
                    label={t('label_tomatoes', lang)}
                    min={1} max={8} 
                    value={config.tomatoesToComplete} 
                    onChange={(v) => {
                        setConfig({...config, tomatoesToComplete: v});
                        setTimeLeft(v * TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS);
                    }}
                  />
               </div>
               <div className="text-center mt-1 text-[10px] font-bold text-orange-400">
                  {config.tomatoesToComplete * TOMATO_DURATION_MINUTES} min
               </div>
             </div>
          </div>
        )}

        {/* Action Button - Smaller Size */}
        <div className="relative z-20 w-full flex justify-center mb-6">
          {status === TimerStatus.IDLE ? (
             <button 
                onClick={startTimer}
                className="group relative w-16 h-16 bg-tomato-500 rounded-full flex items-center justify-center shadow-cartoon transition-transform active:scale-90 active:shadow-cartoon-active hover:-translate-y-1"
             >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-full transition-opacity"></div>
                <PlayIcon className="text-white w-6 h-6 ml-0.5" />
             </button>
          ) : (
             <button 
                onClick={cancelTimer}
                className="group w-16 h-16 bg-white border-4 border-gray-200 rounded-full flex items-center justify-center shadow-cartoon hover:border-red-200 hover:bg-red-50 transition-all active:scale-90 active:shadow-cartoon-active"
             >
                <XIcon className="text-gray-400 group-hover:text-red-500 w-6 h-6 transition-colors" />
             </button>
          )}
        </div>
      </div>
    );
  };

  return (
      // The High-Realism iPhone Chassis
      <div className="iphone-frame">
        
        {/* The Clipped Screen Content Area */}
        <div className="iphone-screen">
            
            {/* Custom Background Layer */}
            {customTheme?.backgroundImage && (
                <div className="absolute inset-0 z-0">
                    <img src={`data:image/png;base64,${customTheme.backgroundImage}`} alt="Background" className="w-full h-full object-cover opacity-90" />
                    <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]"></div>
                </div>
            )}

            {/* Header - Compact */}
            <header className="w-full flex justify-between items-center px-5 py-3 pt-12 z-20 bg-white/80 backdrop-blur-sm sticky top-0 border-b border-transparent transition-colors">
                <div className="flex items-center gap-2">
                <TomatoIcon className="w-8 h-8 filter drop-shadow-sm" />
                <h1 className="text-base font-black text-gray-800 tracking-tight">{t('app_title', lang)}</h1>
                </div>
                <button 
                onClick={toggleLanguage}
                className="text-[10px] font-bold text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-full shadow-sm hover:bg-gray-50 transition-all active:scale-95"
                >
                {lang === 'en' ? '中文' : 'EN'}
                </button>
            </header>

            {/* Scrollable Content Area */}
            <main className={`flex-1 w-full relative overflow-y-auto no-scrollbar flex flex-col z-10 ${customTheme ? 'bg-transparent' : 'bg-cream rounded-t-[32px] shadow-inner'}`}>
                {/* Toast Notification - Smaller */}
                {showAchievementPopup && (
                    <div className="fixed top-24 z-[100] animate-bounce-in pointer-events-none left-1/2 transform -translate-x-1/2 w-full max-w-sm px-4 text-center">
                    <div className="bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full shadow-cartoon border-2 border-yellow-500 inline-flex items-center justify-center gap-2 font-black text-xs">
                        <span>🏆</span>
                        <span className="truncate">{t('ach_unlocked', lang)} {showAchievementPopup}</span>
                    </div>
                    </div>
                )}
                
                {renderCurrentView()}
            </main>

            {/* Bottom Navigation - Refined */}
            <nav className="w-full bg-white/90 backdrop-blur-md border-t border-gray-100 pb-6 pt-2 px-4 flex justify-between items-center z-30 shrink-0">
                <button 
                onClick={() => changeView('TIMER')}
                className={`flex flex-col items-center flex-1 p-1 transition-all active:scale-95 ${currentView === 'TIMER' ? 'text-tomato-500 scale-105' : 'text-gray-300 hover:text-gray-400'}`}
                >
                <ClockIcon className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-black uppercase tracking-wide">{t('nav_timer', lang)}</span>
                </button>
                <button 
                onClick={() => changeView('STATS')}
                className={`flex flex-col items-center flex-1 p-1 transition-all active:scale-95 ${currentView === 'STATS' ? 'text-tomato-500 scale-105' : 'text-gray-300 hover:text-gray-400'}`}
                >
                <ChartIcon className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-black uppercase tracking-wide">{t('nav_stats', lang)}</span>
                </button>
                <button 
                onClick={() => changeView('ACHIEVEMENTS')}
                className={`flex flex-col items-center flex-1 p-1 transition-all active:scale-95 ${currentView === 'ACHIEVEMENTS' ? 'text-tomato-500 scale-105' : 'text-gray-300 hover:text-gray-400'}`}
                >
                <TrophyIcon className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-black uppercase tracking-wide">{t('nav_achievements', lang)}</span>
                </button>
                <button 
                onClick={() => changeView('AI_THEME')}
                className={`flex flex-col items-center flex-1 p-1 transition-all active:scale-95 ${currentView === 'AI_THEME' ? 'text-purple-500 scale-105' : 'text-gray-300 hover:text-gray-400'}`}
                >
                <MagicIcon className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-black uppercase tracking-wide">{t('nav_ai', lang)}</span>
                </button>
            </nav>
        </div>
      </div>
  );
};

export default App;