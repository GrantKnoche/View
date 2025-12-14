

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './utils/supabaseClient';
import { TimerDisplay } from './components/TimerDisplay';
import { WheelPicker } from './components/WheelPicker';
import { StatsView } from './components/StatsView';
import { AchievementsView } from './components/AchievementsView';
import { UserPage } from './components/UserPage';
import { DevTools } from './components/DevTools';
import { Confetti } from './components/Confetti';
import { 
  TomatoIcon, PlayIcon, XIcon, ClockIcon, ChartIcon, TrophyIcon, CheckCircleIcon, UserIcon
} from './components/Icons';
import { AppMode, TimerStatus, PomodoroConfig, Language, AppView, SessionRecord, UnlockedAchievement, FeedbackState } from './types';
import { 
  TOMATO_DURATION_MINUTES,
  BASE_REST_MINUTES,
  BONUS_REST_MINUTES,
  ONE_MINUTE_SECONDS, 
  INTERRUPTION_THRESHOLD_SECONDS,
  STREAK_PROTECTION_SECONDS,
  STORAGE_KEY_LANG,
  STORAGE_KEY_HISTORY,
  ACHIEVEMENTS_LIST
} from './constants';
import { getHistory, saveSessionRecord, getUnlockedAchievements, checkAndUnlockAchievements } from './utils/storageUtils';
import { isSameDay } from './utils/timeUtils';
import { t } from './utils/i18n';
import { playCompleteSound, playClickSound, playActionSound, playCancelSound, initAudioContext, playEncouragementSound } from './utils/soundUtils';

// SEQUENCE PHASES
enum CompletionPhase {
  IDLE = 0,
  SUMMARY = 1,      // First popup: "Completed X Tomatoes"
  ACHIEVEMENT = 2,  // Second popup: "Achievement Unlocked" + Confetti
  DONE = 3          // Transition to Rest or Reset
}

const DAILY_LIMIT = 57;

const App = () => {
  // --- State ---
  const [lang, setLang] = useState<Language>('en');
  const [currentView, setCurrentView] = useState<AppView>('TIMER');
  
  const [mode, setMode] = useState<AppMode>(AppMode.POMODORO);
  const [status, setStatus] = useState<TimerStatus>(TimerStatus.IDLE);
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);

  // Timer State (Visual)
  const [timeLeft, setTimeLeft] = useState(TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS);
  const [elapsedTime, setElapsedTime] = useState(0); 
  
  // Timer Accuracy Refs (Target Timestamp Pattern)
  const endTimeRef = useRef<number | null>(null);   // For Countdown (Pomodoro/Rest/Protection)
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
  const [completedTomatoesInSession, setCompletedTomatoesInSession] = useState(0); // For Rest Calculation
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

  // --- Supabase Auth & Sync ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (err) {
        console.warn('Supabase session check skipped or failed:', err);
      }
    };
    
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // On Login: Fetch History from Cloud and Replace Local
      if (currentUser) {
          try {
             const { data, error } = await supabase.from('pomodoro_logs').select('*');
             if (error) {
               console.error('Error fetching logs:', error);
               setFeedback({ 
                   type: 'ERROR', 
                   message: lang === 'zh' ? `同步失败: ${error.message}` : `Sync Error: ${error.message}` 
               });
               setTimeout(() => setFeedback({ type: null }), 5000);
             } else if (data) {
                // Map DB snake_case to CamelCase if needed, or assume schema matches
                const remoteHistory: SessionRecord[] = data.map((d: any) => ({
                    id: d.id,
                    timestamp: Number(d.timestamp), // Ensure number
                    type: d.type,
                    durationMinutes: d.duration_minutes,
                    completed: d.completed
                }));
                
                // Sync State
                setHistory(remoteHistory);
                // Sync LocalStorage (Offline backup)
                localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(remoteHistory));
                
                // CRITICAL FIX: Recalculate Achievements based on the new sync data
                // This ensures badges are restored on new devices!
                checkAndUnlockAchievements(remoteHistory);
                setUnlockedAchievements(getUnlockedAchievements());
                
                console.log("✅ Data & Achievements synced");
             }
          } catch (e) {
             console.error('Sync failed', e);
          }
      }
    });

    return () => subscription.unsubscribe();
  }, [lang]);

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
    
    // Protection Mode Logic
    if (status === TimerStatus.STREAK_PROTECTION) {
         if (endTimeRef.current !== null) {
            const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
            setTimeLeft(remaining);
            if (remaining <= 0) {
                // PROTECTION EXPIRED -> STREAK BROKEN
                handleProtectionExpired();
            }
         }
         return;
    }

    if (mode === AppMode.FLOW && status === TimerStatus.RUNNING) {
      if (startTimeRef.current !== null) {
        const currentSegment = Math.floor((now - startTimeRef.current) / 1000);
        const total = accumulatedTime + currentSegment;
        setElapsedTime(total);
        setTimeLeft(total); 
      }
    } else {
      // Countdown (Pomodoro or Rest)
      if (endTimeRef.current !== null) {
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
        setTimeLeft(remaining);
        
        // Encouragement logic
        if (mode === AppMode.POMODORO && !isBreakPhase && status === TimerStatus.RUNNING) {
            if (remaining === 120 && !encourageTriggeredRef.current) {
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
    if (status === TimerStatus.RUNNING || status === TimerStatus.RESTING || status === TimerStatus.STREAK_PROTECTION) {
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
             if (status === TimerStatus.RUNNING || status === TimerStatus.RESTING || status === TimerStatus.STREAK_PROTECTION) tick();
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status, tick]);

  // --- DATA LOGIC: Local + Cloud ---
  const handleSessionEnd = (type: 'TOMATO' | 'FLOW', durationMinutes: number, completed: boolean) => {
    const newRecord: SessionRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(), 
      type,
      durationMinutes,
      completed
    };
    
    // 1. Save Local
    const updatedHistory = saveSessionRecord(newRecord);
    setHistory(updatedHistory);
    
    // 2. Save Cloud (Fixed Logic)
    // We must check auth status explicitly at the moment of save to ensure we have a valid user.
    supabase.auth.getUser().then(({ data: { user: currentUser }, error }) => {
        if (error || !currentUser) {
            console.log('Skipping cloud save: User not logged in.');
            return;
        }

        supabase.from('pomodoro_logs').insert({
            id: newRecord.id,
            user_id: currentUser.id,
            timestamp: newRecord.timestamp,
            type: newRecord.type,
            duration_minutes: newRecord.durationMinutes,
            completed: newRecord.completed
        }).then(({ error: insertError }) => {
            if (insertError) {
              console.error("Cloud Save Failed:", insertError);
            }
        });
    });
    
    // 3. Achievements
    if (completed) {
        const newUnlocks = checkAndUnlockAchievements(updatedHistory);
        if (newUnlocks.length > 0) {
           setUnlockedAchievements(getUnlockedAchievements());
           return newUnlocks[0]; 
        }
    }
    return null;
  };

  const resetToIdle = (clearFeedback = true) => {
    setStatus(TimerStatus.IDLE);
    setIsBreakPhase(false);
    setElapsedTime(0);
    setAccumulatedTime(0);
    startTimeRef.current = null;
    endTimeRef.current = null;
    pausedTimeRemainingRef.current = null;
    
    // If resetting from Protection/Broken Flow, ensure we are back to neutral
    if (mode === AppMode.POMODORO) {
        setTimeLeft(config.tomatoesToComplete * TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS);
    } else {
        setTimeLeft(0);
    }
    
    if (clearFeedback) setFeedback({ type: null });
    setCompletionPhase(CompletionPhase.IDLE);
  };

  const handleProtectionExpired = () => {
    if (timerInterval.current) clearInterval(timerInterval.current);
    playCancelSound();
    setFeedback({ type: 'STREAK_LOST' });
    // Visual feedback delay before truly idling
    setTimeout(() => {
        resetToIdle();
    }, 2500);
  };

  const handleTimerComplete = () => {
    if (timerInterval.current) clearInterval(timerInterval.current);

    // Case 1: Rest Completed -> Enter Streak Protection
    if (isBreakPhase) {
      setIsBreakPhase(false);
      setStatus(TimerStatus.STREAK_PROTECTION);
      
      const durationSeconds = STREAK_PROTECTION_SECONDS;
      setTimeLeft(durationSeconds);
      endTimeRef.current = Date.now() + (durationSeconds * 1000);
      
      playActionSound(); 
      return;
    }

    // Case 2: Pomodoro Completed
    const today = new Date();
    const todayCompletedCount = history.filter(r => 
      isSameDay(new Date(r.timestamp), today) && r.type === 'TOMATO' && r.completed
    ).length;

    if (todayCompletedCount >= DAILY_LIMIT) {
        playCancelSound(); 
        setFeedback({ 
            type: 'BROKEN', 
            message: lang === 'zh' ? '今日能量已达上限' : 'Daily Energy Limit Reached' 
        });
        setTimeout(() => {
             resetToIdle(true);
        }, 2500);
        return;
    }

    playCompleteSound();
    
    let unlocked = null;
    let tomatoesToAdd = config.tomatoesToComplete;
    
    const spaceLeft = DAILY_LIMIT - todayCompletedCount;
    const effectiveToAdd = Math.min(tomatoesToAdd, spaceLeft);

    for (let i = 0; i < effectiveToAdd; i++) {
        const u = handleSessionEnd('TOMATO', TOMATO_DURATION_MINUTES, true);
        if (u) unlocked = u;
    }
    
    if (unlocked) {
        setTempAchievementUnlock({ id: unlocked.id, unlockedAt: Date.now() });
    } else {
        setTempAchievementUnlock(null);
    }
    
    // Set for rest calculation
    setCompletedTomatoesInSession(config.tomatoesToComplete);
    setCompletionPhase(CompletionPhase.SUMMARY);
  };

  // --- Sequence Transition Logic ---
  useEffect(() => {
      let timer: number;

      if (completionPhase === CompletionPhase.SUMMARY) {
          timer = window.setTimeout(() => {
              if (tempAchievementUnlock) {
                  setCompletionPhase(CompletionPhase.ACHIEVEMENT);
              } else {
                  setCompletionPhase(CompletionPhase.DONE);
              }
          }, 2000);
      }
      else if (completionPhase === CompletionPhase.ACHIEVEMENT) {
          timer = window.setTimeout(() => {
              setCompletionPhase(CompletionPhase.DONE);
          }, 2000);
      }
      else if (completionPhase === CompletionPhase.DONE) {
           // Both modes now trigger Rest Phase logic if tomatoes were completed
           const N = completedTomatoesInSession;
           
           if (N >= 1) {
             const totalRest = (N * BASE_REST_MINUTES) + (Math.max(0, N - 1) * BONUS_REST_MINUTES);
             setCurrentBreakDuration(totalRest);
             setIsBreakPhase(true);
             setStatus(TimerStatus.RESTING);
             
             const totalRestSeconds = totalRest * ONE_MINUTE_SECONDS;
             setTimeLeft(totalRestSeconds);
             endTimeRef.current = Date.now() + (totalRestSeconds * 1000);
           } else {
             // Should only happen if logic failed or cancelled with <1 tomato (but completion logic usually implies >=1)
             resetToIdle();
           }
           
           setCompletionPhase(CompletionPhase.IDLE);
           setFeedback({ type: null });
           setTempAchievementUnlock(null);
      }

      return () => { if (timer) clearTimeout(timer); };
  }, [completionPhase, tempAchievementUnlock, completedTomatoesInSession]);


  const startTimer = () => {
    setFeedback({ type: null });
    setCompletionPhase(CompletionPhase.IDLE);

    const today = new Date();
    const todayCount = history.filter(r => isSameDay(new Date(r.timestamp), today) && r.type === 'TOMATO' && r.completed).length;
    
    if (todayCount >= DAILY_LIMIT) {
        setFeedback({ 
            type: 'BROKEN', 
            message: lang === 'zh' ? '今日能量已达上限' : 'Daily Energy Limit Reached' 
        });
        playCancelSound();
        setTimeout(() => setFeedback({ type: null }), 2000);
        return;
    }

    playActionSound();
    const now = Date.now();
    
    // If starting from Protection Mode, we maintain streak!
    if (status === TimerStatus.STREAK_PROTECTION) {
        // Just proceed to setup new timer
    }

    if (status === TimerStatus.PAUSED) {
        if (mode === AppMode.POMODORO) {
             const remaining = pausedTimeRemainingRef.current || timeLeft;
             setTimeLeft(remaining);
             endTimeRef.current = now + (remaining * 1000);
        } else {
            startTimeRef.current = now;
        }
        setStatus(TimerStatus.RUNNING);
        return;
    }

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
  };

  const requestCancelTimer = () => {
    // If in Protection mode, canceling means giving up the streak
    if (status === TimerStatus.STREAK_PROTECTION) {
        handleProtectionExpired();
        return;
    }

    if (isBreakPhase || status === TimerStatus.RESTING) {
      // Cancel Rest -> Skip to Protection
      if (timerInterval.current) clearInterval(timerInterval.current);
      playActionSound(); 
      setIsBreakPhase(false);
      setStatus(TimerStatus.STREAK_PROTECTION);
      const durationSeconds = STREAK_PROTECTION_SECONDS;
      setTimeLeft(durationSeconds);
      endTimeRef.current = Date.now() + (durationSeconds * 1000);
      return;
    }

    if (timerInterval.current) clearInterval(timerInterval.current);
    
    if (mode === AppMode.FLOW) {
        const flowSeconds = elapsedTime;
        const flowMinutes = Math.floor(flowSeconds / 60);

        // Logic: Flow < 2 mins => Ignored (Reset)
        if (flowSeconds < INTERRUPTION_THRESHOLD_SECONDS) {
            playActionSound();
            resetToIdle(true);
            return;
        }

        // Logic: Flow >= 25 mins => Complete N tomatoes & Rest
        if (flowMinutes >= 25) {
             const tomatoesEarned = Math.floor(flowMinutes / 25);
             const today = new Date();
             const todayCount = history.filter(r => isSameDay(new Date(r.timestamp), today) && r.type === 'TOMATO' && r.completed).length;
             const spaceLeft = Math.max(0, DAILY_LIMIT - todayCount);
             const effectiveToAdd = Math.min(tomatoesEarned, spaceLeft);

             if (effectiveToAdd > 0) {
                 let unlocked = null;
                 for(let i=0; i<effectiveToAdd; i++) {
                     const u = handleSessionEnd('TOMATO', 25, true); // Log each 25min block
                     if (u) unlocked = u;
                 }
                 
                 // Trigger completion sequence
                 setCompletedTomatoesInSession(effectiveToAdd);
                 // We don't update Config UI for flow results, just internal logic
                 playCompleteSound();
                 if (unlocked) setTempAchievementUnlock({ id: unlocked.id, unlockedAt: Date.now() });
                 else setTempAchievementUnlock(null);
                 setCompletionPhase(CompletionPhase.SUMMARY);
             } else {
                  // Limit reached
                  playCancelSound(); 
                  setFeedback({ 
                      type: 'BROKEN', 
                      message: lang === 'zh' ? '今日能量已达上限' : 'Daily Energy Limit Reached' 
                  });
                  setTimeout(() => resetToIdle(true), 2000);
             }
             return;
        } 
        else {
            // Logic: 2 min <= Flow < 25 min => Interrupted
            playCancelSound();
            handleSessionEnd('TOMATO', flowMinutes, false);
            setFeedback({ 
                type: 'BROKEN', 
                message: lang === 'zh' ? '番茄被打断 💔' : 'Tomato Interrupted 💔' 
            });
            setTimeout(() => resetToIdle(), 1500);
            return;
        }
    } 
    else {
        // POMODORO MODE
        const durationSeconds = config.tomatoesToComplete * TOMATO_DURATION_MINUTES * 60;
        const currentElapsedForStats = Math.max(0, durationSeconds - timeLeft);

        if (currentElapsedForStats < INTERRUPTION_THRESHOLD_SECONDS) {
            playActionSound(); 
            resetToIdle(true); 
            return;
        }

        playCancelSound(); 
        
        // Save whatever full tomatoes were done if multi-batch (not typical for cancellation but safe logic)
        const completed = Math.floor(currentElapsedForStats / (TOMATO_DURATION_MINUTES * 60));
        const today = new Date();
        const todayCount = history.filter(r => isSameDay(new Date(r.timestamp), today) && r.type === 'TOMATO' && r.completed).length;
        const spaceLeft = Math.max(0, DAILY_LIMIT - todayCount);
        const effectiveToAdd = Math.min(completed, spaceLeft);

        for (let i = 0; i < effectiveToAdd; i++) handleSessionEnd('TOMATO', TOMATO_DURATION_MINUTES, true);
        
        const currentFractionElapsed = currentElapsedForStats % (TOMATO_DURATION_MINUTES * 60);
        // If the current fractional tomato was running > 2 mins, count as broken
        if (currentFractionElapsed >= INTERRUPTION_THRESHOLD_SECONDS) {
            handleSessionEnd('TOMATO', Math.floor(currentFractionElapsed / 60), false);
        }

        setFeedback({ type: 'BROKEN' });
        setTimeout(() => resetToIdle(), 1500);
    }
  };

  const switchMode = (newMode: AppMode) => {
    playClickSound();
    if (status !== TimerStatus.IDLE && status !== TimerStatus.STREAK_PROTECTION) return;
    
    // Allow mode switch during protection, it maintains protection until start
    setMode(newMode);
    
    if (newMode === AppMode.POMODORO) {
        setTimeLeft(config.tomatoesToComplete * TOMATO_DURATION_MINUTES * ONE_MINUTE_SECONDS);
        // Keep picker value
    } else {
        setTimeLeft(0);
    }
  };

  const changeView = (view: AppView) => { playClickSound(); setCurrentView(view); }

  // --- DEV TOOLS HANDLERS ---
  const handleDevSetCountdown = (totalSeconds: number) => {
    if (mode === AppMode.POMODORO && status !== TimerStatus.RESTING && status !== TimerStatus.STREAK_PROTECTION) {
      setTimeLeft(totalSeconds);
      endTimeRef.current = Date.now() + (totalSeconds * 1000);
    } else if (status === TimerStatus.RESTING || status === TimerStatus.STREAK_PROTECTION) {
       setTimeLeft(totalSeconds);
       endTimeRef.current = Date.now() + (totalSeconds * 1000);
    }
  };

  const handleDevAddFlowTime = (seconds: number) => {
    if (mode === AppMode.FLOW) {
      const now = Date.now();
      if (startTimeRef.current === null) startTimeRef.current = now;
      startTimeRef.current = startTimeRef.current - (seconds * 1000);
      const newTotal = elapsedTime + seconds;
      setElapsedTime(newTotal);
      setTimeLeft(newTotal);
    }
  };

  const handleDevInjectHistory = (records: SessionRecord[]) => {
    let updatedHistory = history;
    records.forEach(record => {
      updatedHistory = saveSessionRecord(record);
      // Inject to cloud if user is logged in
      if (user) {
         supabase.from('pomodoro_logs').insert({
            id: record.id,
            user_id: user.id,
            timestamp: record.timestamp,
            type: record.type,
            duration_minutes: record.durationMinutes,
            completed: record.completed
         });
      }
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
    if (currentView === 'USER') return <UserPage user={user} lang={lang} />;
    
    return (
      <div className="w-full h-full flex flex-col items-center animate-fade-in relative overflow-hidden pt-4 pb-4 justify-between">
         <div className="absolute top-12 right-0 w-48 h-48 bg-tomato-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
         <div className="absolute bottom-32 left-0 w-48 h-48 bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

        {/* Mode Switcher */}
        <div className="flex flex-col justify-end items-center pb-2 h-12 shrink-0">
             <div className={`flex bg-white/60 backdrop-blur-xl p-1 rounded-2xl shadow-sm border border-white/20 relative z-10 transition-opacity duration-300 ${status === TimerStatus.IDLE || status === TimerStatus.STREAK_PROTECTION ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button onClick={() => switchMode(AppMode.POMODORO)} className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 ${mode === AppMode.POMODORO ? 'bg-white text-tomato-500 shadow-sm' : 'text-gray-500 hover:bg-white/30'}`}>{t('mode_countdown', lang)}</button>
                <button onClick={() => switchMode(AppMode.FLOW)} className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 ${mode === AppMode.FLOW ? 'bg-white text-blue-500 shadow-sm' : 'text-gray-500 hover:bg-white/30'}`}>{t('mode_flow', lang)}</button>
            </div>
        </div>

        {/* Center: Timer & Picker */}
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
                    timeRemaining={mode === AppMode.POMODORO || status === TimerStatus.RESTING || status === TimerStatus.STREAK_PROTECTION ? timeLeft : elapsedTime}
                    totalDuration={status === TimerStatus.STREAK_PROTECTION ? STREAK_PROTECTION_SECONDS : (isBreakPhase ? currentBreakDuration * 60 : config.tomatoesToComplete * TOMATO_DURATION_MINUTES * 60)}
                    status={status} mode={mode} currentTomatoIndex={getCurrentTomatoIndex()} totalTomatoes={config.tomatoesToComplete} lang={lang} feedback={feedback}
                />
            </div>

            {/* Picker Container */}
            <div className="relative w-full h-[220px] flex items-center justify-center shrink-0">
                <div className={`absolute inset-0 transition-all duration-500 flex flex-col items-center justify-center ${
                    (status === TimerStatus.IDLE || status === TimerStatus.STREAK_PROTECTION) && mode === AppMode.POMODORO 
                    ? 'opacity-100 translate-y-0 pointer-events-auto' 
                    : 'opacity-0 translate-y-4 pointer-events-none'
                }`}>
                    <WheelPicker 
                        min={1} max={8} 
                        value={config.tomatoesToComplete} 
                        onChange={(v) => {
                            if (status === TimerStatus.IDLE || status === TimerStatus.STREAK_PROTECTION) {
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
                {status === TimerStatus.IDLE || status === TimerStatus.STREAK_PROTECTION ? (
                    <button onClick={startTimer} className={`group absolute inset-0 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 hover:-translate-y-1 z-20 border-2 border-white/20 ${status === TimerStatus.STREAK_PROTECTION ? 'bg-amber-400 shadow-amber-500/30' : 'bg-tomato-500 shadow-tomato-500/30'}`}>
                        <PlayIcon className="text-white w-9 h-9 ml-1" />
                    </button>
                ) : (
                    <button onClick={requestCancelTimer} className="group absolute inset-0 w-20 h-20 bg-white/80 backdrop-blur-md border-2 border-gray-100 rounded-full flex items-center justify-center shadow-lg hover:border-red-200 hover:bg-red-50/50 transition-all active:scale-90 z-20">
                        <XIcon className="text-gray-400 group-hover:text-red-500 w-8 h-8 transition-colors" />
                    </button>
                )}
            </div>
             {/* REMOVED LOCAL FEEDBACK TOAST FROM HERE */}
        </div>

      </div>
    );
  };

  return (
    <>
      <div id="app-scale-wrapper">
        <div className="iphone-frame">
          <div className="iphone-screen bg-cream relative z-0">
              
              {/* GLOBAL ERROR / FEEDBACK TOAST - MOVED HERE FOR VISIBILITY */}
              {feedback.message && (
                <div className="absolute top-20 left-0 w-full z-[999] flex justify-center pointer-events-none px-4">
                     <div className={`text-white text-sm font-bold py-3 px-6 rounded-2xl shadow-2xl animate-bounce-in pointer-events-auto flex items-center gap-2 border border-white/20 backdrop-blur-md ${
                         feedback.type === 'ERROR' || feedback.type === 'STREAK_LOST' || feedback.type === 'BROKEN' ? 'bg-red-500/90' : 'bg-gray-800/90'
                     }`}>
                         {(feedback.type === 'ERROR' || feedback.type === 'BROKEN') && <span>⚠️</span>}
                         {feedback.type === 'STREAK_LOST' && <span>💔</span>}
                         {feedback.message}
                     </div>
                </div>
              )}

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
                            {completedTomatoesInSession > 1 
                                ? t('card_session_complete', lang, { count: completedTomatoesInSession })
                                : t('card_tomato_complete', lang)
                            }
                         </p>
                         {/* Show Bonus if applicable */}
                         {completedTomatoesInSession > 1 && (
                             <div className="bg-orange-100 text-orange-600 px-4 py-1.5 rounded-full text-xs font-black border border-orange-200 mt-2">
                                {t('msg_reward_bonus', lang, { min: Math.max(0, completedTomatoesInSession - 1) * BONUS_REST_MINUTES })}
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

              <nav className="w-full bg-white/60 backdrop-blur-2xl border-t border-white/20 pb-4 pt-3 px-6 flex justify-between items-center z-30 shrink-0 gap-2">
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
                  <button onClick={() => changeView('USER')} className={`flex flex-col items-center flex-1 p-1 transition-all active:scale-95 ${currentView === 'USER' ? 'text-tomato-500 scale-105' : 'text-gray-400 hover:text-gray-500'}`}>
                  <UserIcon className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wide">{t('nav_user', lang)}</span>
                  </button>
              </nav>
          </div>
        </div>
      </div>
      
      {/* DEV TOOLS - Preserved */}
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