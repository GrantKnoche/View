


import React from 'react';
import { TimerStatus, AppMode, Language, FeedbackState } from '../types';
import { formatTime } from '../utils/timeUtils';
import { t } from '../utils/i18n';
import { TOMATO_DURATION_MINUTES } from '../constants';

interface TimerDisplayProps {
  timeRemaining: number;
  totalDuration: number;
  status: TimerStatus;
  mode: AppMode;
  currentTomatoIndex: number; // 1-based index of current tomato in batch
  totalTomatoes: number;     // Batch size
  lang: Language;
  feedback: FeedbackState;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ 
  timeRemaining, 
  totalDuration, 
  status, 
  mode,
  currentTomatoIndex,
  totalTomatoes,
  lang,
  feedback
}) => {
  
  // --- Progress Logic ---
  let percentage = 0;
  
  if (status === TimerStatus.STREAK_PROTECTION) {
      // 2 minutes countdown (120s)
      percentage = ((120 - timeRemaining) / 120) * 100;
  } else if (mode === AppMode.POMODORO) {
    const singleDuration = TOMATO_DURATION_MINUTES * 60;
    const timeLeftInCurrent = timeRemaining % singleDuration;
    // Fix 0% flash at start of next tomato
    const effectiveTimeLeft = timeLeftInCurrent === 0 && timeRemaining > 0 ? singleDuration : timeLeftInCurrent;
    percentage = ((singleDuration - effectiveTimeLeft) / singleDuration) * 100;
    
    if (status === TimerStatus.RESTING) {
        percentage = ((totalDuration - timeRemaining) / totalDuration) * 100;
    }
  } else {
    // Flow mode: Liquid acts as a seconds ticker (0-60s loop) for visual liveliness
    percentage = ((timeRemaining % 60) / 60) * 100; 
  }

  percentage = Math.min(100, Math.max(0, percentage));

  // --- State Flags ---
  const isResting = status === TimerStatus.RESTING;
  const isStreakProtection = status === TimerStatus.STREAK_PROTECTION;
  const isBroken = feedback.type === 'BROKEN';
  const isPaused = status === TimerStatus.PAUSED;
  const isReward = feedback.type === 'REWARD';
  const isRestEnding = isResting && timeRemaining <= 10 && timeRemaining > 0;
  const isStreakLost = feedback.type === 'STREAK_LOST';

  // --- Claymorphism Styles ---
  
  // 1. Container (The Shell)
  const clayShadow = "shadow-[inset_-10px_-10px_20px_rgba(0,0,0,0.05),inset_10px_10px_20px_rgba(255,255,255,0.6),10px_20px_30px_rgba(0,0,0,0.1)]";
  
  let bgClass = "bg-[#FF9F9F]"; // Pastel Red
  if (isResting) bgClass = "bg-[#A7F3D0]"; // Pastel Green
  if (isStreakProtection) bgClass = "bg-[#FDE68A]"; // Pastel Yellow/Orange for Warning
  if (isBroken || isPaused || isStreakLost) bgClass = "bg-gray-200";

  // 2. Liquid (The Fill) - Slightly darker tone of the container
  let fillClass = "bg-[#FF6B6B]"; // Vibrant Pastel Red
  if (isResting) fillClass = "bg-[#6EE7B7]"; // Vibrant Pastel Green
  if (isStreakProtection) fillClass = "bg-[#F59E0B]"; // Vibrant Orange
  if (isBroken || isPaused || isStreakLost) fillClass = "bg-gray-300";

  // 3. Status Badge (Glassy Pill)
  let statusBadgeClasses = "text-white/90 bg-black/10";
  if (status === TimerStatus.RUNNING && mode === AppMode.POMODORO) {
      statusBadgeClasses = "text-[#7F1D1D] bg-white/40 border border-white/50";
  }
  if (isResting) {
      statusBadgeClasses = "text-[#064E3B] bg-white/40 border border-white/50";
  }
  if (isStreakProtection) {
      statusBadgeClasses = "text-[#78350F] bg-white/40 border border-white/50 animate-pulse";
  }

  const transitionSpeed = isBroken || isStreakLost ? 'duration-100' : 'duration-1000';

  return (
    <div className="relative w-80 h-80 flex items-center justify-center">
      
      {/* Main 3D Clay Container - INCREASED SIZE w-64 h-64 (256px) */}
      <div className={`relative w-64 h-64 rounded-full overflow-hidden transition-all ease-in-out ${transitionSpeed}
        ${bgClass} 
        ${clayShadow}
        ${isReward ? 'scale-105 shadow-[0_0_50px_rgba(255,200,200,0.6)]' : ''}
        ${isBroken || isStreakLost ? 'grayscale' : ''}
        ${isRestEnding ? 'animate-pulse' : ''} 
      `}>
        
        {/* Liquid Fill (Clipped inside) */}
        <div 
          className={`absolute bottom-0 left-0 right-0 w-full transition-all ease-in-out ${isBroken || isStreakLost ? 'duration-100' : 'duration-1000'} ${fillClass}`}
          style={{ height: `${percentage}%`, opacity: 0.8 }}
        >
             {/* Subtle Surface Line */}
             <div className="w-full h-1 bg-white opacity-30 absolute top-0"></div>
        </div>

        {/* Specular Highlight (The 'Glossy' Look) */}
        <div className="absolute top-8 left-10 w-20 h-10 bg-gradient-to-br from-white to-transparent opacity-40 rounded-full transform -rotate-45 pointer-events-none filter blur-[2px]"></div>
        <div className="absolute bottom-8 right-10 w-8 h-8 bg-white opacity-10 rounded-full pointer-events-none filter blur-[4px]"></div>
        
        {/* Content (Time & Status) */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
            
            {/* Timer Digits */}
            <span className={`text-[4rem] leading-none font-black text-white drop-shadow-sm tracking-tight tabular-nums font-[Nunito] transition-opacity ${isBroken || isPaused || isStreakLost ? 'opacity-20 blur-sm' : 'opacity-100'}`}>
              {formatTime(timeRemaining)}
            </span>

             {/* Status Pill */}
             {!isBroken && !isPaused && !isStreakLost && (
                <div className="absolute top-[65%] w-full flex justify-center">
                    <div className={`text-xs font-bold px-4 py-1.5 rounded-full backdrop-blur-md shadow-sm transition-colors duration-500 ${statusBadgeClasses}`}>
                        {status === TimerStatus.IDLE && mode === AppMode.POMODORO && t('status_ready_focus', lang)}
                        {status === TimerStatus.IDLE && mode === AppMode.FLOW && t('status_ready_flow', lang)}
                        
                        {status === TimerStatus.RUNNING && mode === AppMode.POMODORO && t('status_tomato_batch', lang, { current: currentTomatoIndex, total: totalTomatoes })}
                        {status === TimerStatus.RUNNING && mode === AppMode.FLOW && t('status_flowing', lang)}
                        
                        {status === TimerStatus.RESTING && t('status_relax', lang)}
                        {status === TimerStatus.STREAK_PROTECTION && t('status_streak_protection', lang)}
                    </div>
                </div>
             )}
             
             {/* Interruption Overlay */}
             {(isBroken || isStreakLost) && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-50">
                     <span className="text-xl font-black text-white tracking-wide uppercase drop-shadow-md animate-cartoon-shake text-center px-4 leading-tight">
                         {isStreakLost ? t('msg_streak_lost', lang) : t('msg_broken', lang)} 💔
                     </span>
                 </div>
             )}
             
             {isPaused && !isBroken && !isStreakLost && (
                 <div className="absolute top-[65%] w-full flex justify-center">
                     <div className="text-xs font-black px-4 py-1.5 rounded-full bg-white/20 text-white border border-white/20 uppercase tracking-widest">
                         Paused
                     </div>
                 </div>
             )}

            {/* Encouragement Text */}
            <div className="absolute bottom-8 text-[10px] font-bold text-white/90 uppercase tracking-widest px-4">
                {feedback.type === 'ENCOURAGE' && <span className="animate-bounce inline-block">{t('msg_almost_there', lang)}</span>}
            </div>
        </div>
      </div>

      {/* Stem (Leaf) - Adapts color */}
      <div className={`absolute top-5 left-1/2 transform -translate-x-1/2 z-0 transition-all duration-1000 ${isBroken || isPaused || isStreakLost ? 'grayscale brightness-150' : ''}`}>
         <div className={`w-8 h-6 rounded-full flex items-center justify-center shadow-sm transition-colors duration-1000 ${isResting ? 'bg-[#34D399]' : (isStreakProtection ? 'bg-[#F59E0B]' : 'bg-[#6EE7B7]')}`}>
            <div className={`w-1.5 h-6 rounded-full absolute -top-4 transition-colors duration-1000 ${isResting ? 'bg-[#10B981]' : (isStreakProtection ? 'bg-[#D97706]' : 'bg-[#34D399]')}`}></div>
            <div className={`w-8 h-3 rounded-full absolute top-1 rotate-12 transition-colors duration-1000 ${isResting ? 'bg-[#059669]' : (isStreakProtection ? 'bg-[#B45309]' : 'bg-[#34D399]')}`}></div>
            <div className={`w-8 h-3 rounded-full absolute top-1 -rotate-12 transition-colors duration-1000 ${isResting ? 'bg-[#059669]' : (isStreakProtection ? 'bg-[#B45309]' : 'bg-[#34D399]')}`}></div>
         </div>
      </div>

    </div>
  );
};