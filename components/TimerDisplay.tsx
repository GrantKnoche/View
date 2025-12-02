
import React from 'react';
import { TimerStatus, AppMode, Language, FeedbackState } from '../types';
import { formatTime } from '../utils/timeUtils';
import { t } from '../utils/i18n';
import { TOMATO_DURATION_MINUTES } from '../constants';
import { CheckCircleIcon, XIcon } from './Icons';

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
  
  let percentage = 0;
  
  if (mode === AppMode.POMODORO) {
    const singleDuration = TOMATO_DURATION_MINUTES * 60;
    const timeLeftInCurrent = timeRemaining % singleDuration;
    const effectiveTimeLeft = timeLeftInCurrent === 0 && timeRemaining > 0 ? singleDuration : timeLeftInCurrent;
    percentage = ((singleDuration - effectiveTimeLeft) / singleDuration) * 100;
    
    if (status === TimerStatus.RESTING) {
        percentage = ((totalDuration - timeRemaining) / totalDuration) * 100;
    }
  } else {
    // Flow mode: Liquid acts as a seconds ticker (0-60s loop) for visual liveliness
    percentage = ((totalDuration % 60) / 60) * 100; 
  }

  percentage = Math.min(100, Math.max(0, percentage));

  const isResting = status === TimerStatus.RESTING;
  const isBroken = feedback.type === 'BROKEN';
  const isReward = feedback.type === 'REWARD';
  const isCompleted = percentage >= 99.5 && mode === AppMode.POMODORO; // Only auto-complete visual in Pomodoro

  let containerClasses = "border-tomato-600 bg-tomato-100";
  if (isResting) containerClasses = "border-leaf-500 bg-leaf-100";
  if (isBroken) containerClasses = "border-gray-500 bg-gray-300 grayscale scale-95";

  let fillClasses = "bg-tomato-500";
  if (isResting) fillClasses = "bg-leaf-500";
  if (isBroken) fillClasses = "bg-gray-600";

  const transitionSpeed = isBroken ? 'duration-100' : 'duration-500';

  return (
    <div className="relative w-80 h-80 flex items-center justify-center">
      
      {/* Broken Overlay Badge */}
      {isBroken && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white/80 backdrop-blur-md px-5 py-4 rounded-3xl shadow-glass border border-white/40 animate-elastic-pop flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                   <XIcon className="w-7 h-7" />
                </div>
                <div className="text-gray-700 font-black text-base whitespace-nowrap px-2">{t('msg_broken', lang)}</div>
            </div>
        </div>
      )}

      {/* Completion / Reward Card Overlay */}
      {isReward && (
        <div className="absolute z-50 animate-elastic-pop top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[120%]">
             <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-glass border border-yellow-200 p-4 flex flex-col items-center gap-2">
                 <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-500">
                    <CheckCircleIcon className="w-7 h-7" />
                 </div>
                 <h3 className="text-base font-black text-gray-800 text-center leading-tight">
                    {t('card_tomato_complete', lang)}
                 </h3>
                 {feedback.extraData?.bonus > 0 && (
                     <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold">
                        {t('msg_reward_bonus', lang, { min: feedback.extraData.bonus })}
                     </div>
                 )}
             </div>
        </div>
      )}

      {/* External Ripple */}
      {(isCompleted || isReward) && (
        <>
            <div className="absolute inset-0 rounded-full bg-tomato-300 opacity-0 animate-ripple"></div>
            <div className="absolute inset-0 rounded-full bg-tomato-300 opacity-0 animate-ripple" style={{ animationDelay: '0.3s' }}></div>
        </>
      )}

      {/* Main Tomato Container - INCREASED SIZE w-64 h-64 (256px) */}
      <div className={`relative w-64 h-64 rounded-full overflow-hidden border-[6px] shadow-2xl transition-all ${transitionSpeed}
        ${containerClasses} 
        ${isReward ? 'animate-bulge' : ''}
        ${isBroken ? 'animate-cartoon-shake' : ''}
      `}>
        
        {/* Liquid Fill */}
        <div 
          className={`absolute bottom-0 left-0 right-0 w-full transition-all ease-in-out ${isBroken ? 'duration-100' : 'duration-1000'} ${fillClasses}`}
          style={{ height: `${percentage}%` }}
        >
             <div className="w-full h-2 bg-white opacity-20 absolute top-0"></div>
        </div>

        {/* Shine */}
        <div className="absolute top-6 left-8 w-16 h-8 bg-white opacity-30 rounded-full transform -rotate-45 pointer-events-none filter blur-sm"></div>
        
        {/* Content (Time) */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
            <span className={`text-6xl font-black text-white drop-shadow-md tracking-tighter tabular-nums font-mono transition-opacity ${isBroken ? 'opacity-50' : 'opacity-100'}`}>
              {formatTime(timeRemaining)}
            </span>

             {!isBroken && (
                <div className="absolute top-44 w-full flex justify-center">
                    <div className="text-xs font-bold text-white/90 bg-black/10 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                        {status === TimerStatus.IDLE && mode === AppMode.POMODORO && t('status_ready_focus', lang)}
                        {status === TimerStatus.IDLE && mode === AppMode.FLOW && t('status_ready_flow', lang)}
                        
                        {status === TimerStatus.RUNNING && mode === AppMode.POMODORO && t('status_tomato_batch', lang, { current: currentTomatoIndex, total: totalTomatoes })}
                        {status === TimerStatus.RUNNING && mode === AppMode.FLOW && t('status_flowing', lang)}
                        
                        {status === TimerStatus.RESTING && t('status_relax', lang)}
                    </div>
                </div>
             )}

            <div className="absolute bottom-10 text-[10px] font-bold text-white/80 uppercase tracking-widest drop-shadow-sm px-4">
                {feedback.type === 'ENCOURAGE' && <span className="animate-bounce inline-block text-yellow-200">{t('msg_almost_there', lang)}</span>}
            </div>
        </div>
      </div>

      {/* Stem */}
      <div className={`absolute top-6 left-1/2 transform -translate-x-1/2 z-20 transition-all duration-300 ${isBroken ? 'grayscale brightness-50' : ''}`}>
         <div className={`w-10 h-8 rounded-full flex items-center justify-center shadow-lg transition-colors ${isResting ? 'bg-leaf-600' : 'bg-leaf-500'}`}>
            <div className={`w-2 h-8 rounded-full absolute -top-5 ${isResting ? 'bg-leaf-700' : 'bg-leaf-600'}`}></div>
            <div className={`w-10 h-4 rounded-full absolute top-2 rotate-12 ${isResting ? 'bg-leaf-600' : 'bg-leaf-500'}`}></div>
            <div className={`w-10 h-4 rounded-full absolute top-2 -rotate-12 ${isResting ? 'bg-leaf-600' : 'bg-leaf-500'}`}></div>
         </div>
      </div>

    </div>
  );
};
