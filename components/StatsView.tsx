
import React, { useState, useMemo, useEffect } from 'react';
import { SessionRecord, Language } from '../types';
import { t } from '../utils/i18n';
import { isSameDay, formatDuration, calculateSessionStreak, calculateDayStreak, getStartOfMonth, getEndOfMonth, addMonths, formatMonthYear, getStartOfWeek, getDaysInMonth, isSameMonth } from '../utils/timeUtils';
import { TomatoIcon, ClockIcon, XIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, HistoryFancyIcon, ThreeTomatoesIcon } from './Icons';
import { playClickSound } from '../utils/soundUtils';
import { AISummary } from './AISummary';

interface StatsViewProps {
  history: SessionRecord[];
  lang: Language;
}

// --- Helpers ---

// ISO Week Number Helper
const getWeekNumber = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const formatHeaderDate = (date: Date, lang: Language) => {
    const weekNum = getWeekNumber(date);
    if (lang === 'zh') {
        const m = date.getMonth() + 1;
        const d = date.getDate();
        const w = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
        return `${m}月${d}日 第${weekNum}周 周${w}`;
    } else {
        const m = date.toLocaleDateString('en-US', { month: 'short' });
        const d = date.getDate();
        const w = date.toLocaleDateString('en-US', { weekday: 'short' });
        return `${m} ${d}, W${weekNum} ${w}`;
    }
};

const formatWeekRangeWithNum = (start: Date, end: Date, lang: Language) => {
    const wNum = getWeekNumber(start);
    const startStr = `${start.getMonth() + 1}.${start.getDate()}`;
    const endStr = `${end.getMonth() + 1}.${end.getDate()}`;
    
    if (lang === 'zh') {
        return `第${wNum}周: ${startStr} - ${endStr}`;
    }
    return `W${wNum}: ${startStr} - ${endStr}`;
};

// Internal reusable Tooltip Content Component to keep JSX clean
const TooltipContent = ({ content, subContent }: { content: string, subContent?: string }) => (
    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
        <div className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg shadow-xl font-bold flex flex-col items-center gap-0.5 border border-white/10">
            <span className="opacity-90 font-nunito leading-none">{content}</span>
            {subContent && <span className="text-[10px] opacity-70 font-normal font-nunito leading-none mt-0.5">{subContent}</span>}
        </div>
        {/* Triangle Arrow */}
        <div className="w-2 h-2 bg-gray-800 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
    </div>
);

// Rank Helper
const getRankInfo = (count: number, lang: Language) => {
    if (count < 4) return { label: lang === 'zh' ? '萌芽小番茄' : 'Sprout', range: '0-3' };
    if (count < 8) return { label: lang === 'zh' ? '青涩果实' : 'Green Fruit', range: '4-7' };
    if (count < 12) return { label: lang === 'zh' ? '熟透红番茄' : 'Red Tomato', range: '8-11' };
    if (count < 16) return { label: lang === 'zh' ? '爆浆多汁王' : 'Juicy King', range: '12-15' };
    return { label: lang === 'zh' ? '番茄永动机' : 'Infinity', range: '16+' };
};

export const StatsView: React.FC<StatsViewProps> = ({ history, lang }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showStreakTooltip, setShowStreakTooltip] = useState(false);
  const [showRankOverlay, setShowRankOverlay] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Navigation States
  const [currentWeekBase, setCurrentWeekBase] = useState(new Date());
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const changeMonth = (delta: number) => {
    playClickSound();
    setCurrentMonthDate(prev => addMonths(prev, delta));
  }

  const changeWeek = (delta: number) => {
    playClickSound();
    const newDate = new Date(currentWeekBase);
    newDate.setDate(newDate.getDate() + (delta * 7));
    setCurrentWeekBase(newDate);
  }

  // --- Layer 1: Today ---
  const todayStats = useMemo(() => {
    const today = new Date();
    const todayRecords = history.filter(r => isSameDay(new Date(r.timestamp), today));
    const completed = todayRecords.filter(r => r.completed && r.type === 'TOMATO');
    return {
      tomatoes: completed.length,
      focusMinutes: todayRecords.reduce((acc, curr) => curr.completed ? acc + curr.durationMinutes : acc, 0),
      interruptions: todayRecords.filter(r => !r.completed && r.type === 'TOMATO').length,
      streak: calculateSessionStreak(history, today)
    };
  }, [history]);

  // --- Layer 2: Weekly ---
  const weeklyStats = useMemo(() => {
      const startOfWeek = getStartOfWeek(currentWeekBase); 
      const today = new Date();
      
      const days = [];
      let maxVal = 0;
      let totalWeekTomatoes = 0;

      // Generate 7 days
      for (let i = 0; i < 7; i++) {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          const records = history.filter(r => isSameDay(new Date(r.timestamp), d) && r.type === 'TOMATO' && r.completed);
          const count = records.length;
          const mins = records.reduce((acc, r) => acc + r.durationMinutes, 0);
          
          if (count > maxVal) maxVal = count;
          totalWeekTomatoes += count;
          
          days.push({
              date: d,
              count,
              mins,
              dayLabelKey: ['day_m', 'day_t', 'day_w', 'day_th', 'day_f', 'day_s', 'day_su'][i],
              isToday: isSameDay(d, today)
          });
      }
      
      // Calculate Average (Dynamic Divisor)
      let divisor = 7;
      const startOfWeekTime = new Date(startOfWeek);
      startOfWeekTime.setHours(0,0,0,0);
      const todayTime = new Date(today);
      todayTime.setHours(0,0,0,0);

      const currentWeekStart = getStartOfWeek(todayTime);
      currentWeekStart.setHours(0,0,0,0);

      // 1. If it's the current week: Divide by days passed (including today)
      if (startOfWeekTime.getTime() === currentWeekStart.getTime()) {
          const msDiff = todayTime.getTime() - startOfWeekTime.getTime();
          const daysPassed = Math.floor(msDiff / (1000 * 60 * 60 * 24)) + 1;
          divisor = Math.max(1, Math.min(7, daysPassed));
      } 
      // 2. If it's a future week: Divide by 1 (result 0)
      else if (startOfWeekTime.getTime() > todayTime.getTime()) {
          divisor = 1;
      }

      const avg = parseFloat((totalWeekTomatoes / divisor).toFixed(1));

      return { 
          days, 
          maxVal: Math.max(maxVal, 1), 
          avg, 
          startOfWeek, 
          endOfWeek: days[6].date 
      }; 
  }, [history, currentWeekBase]);

  // --- Layer 3: Golden Hour ---
  const goldenHourStats = useMemo(() => {
    const bucketDefs = [
        { labelEn: 'Night', labelZh: '深夜', min: 0, max: 5, time: '00:00-05:59', cap: 15 },
        { labelEn: 'Morning', labelZh: '早上', min: 6, max: 10, time: '06:00-10:59', cap: 12 },
        { labelEn: 'Noon', labelZh: '中午', min: 11, max: 12, time: '11:00-12:59', cap: 5 },
        { labelEn: 'Afternoon', labelZh: '下午', min: 13, max: 17, time: '13:00-17:59', cap: 12 },
        { labelEn: 'Night', labelZh: '晚上', min: 18, max: 23, time: '18:00-23:59', cap: 15 },
    ];
    
    const buckets = [0, 0, 0, 0, 0];
    const today = new Date();
    const recordsToAnalyze = history.filter(r => isSameDay(new Date(r.timestamp), today));
    
    recordsToAnalyze.forEach(r => {
        if (r.type === 'TOMATO' && r.completed) {
            const h = new Date(r.timestamp).getHours();
            if (h >= 0 && h <= 5) buckets[0]++;
            else if (h >= 6 && h <= 10) buckets[1]++;
            else if (h >= 11 && h <= 12) buckets[2]++;
            else if (h >= 13 && h <= 17) buckets[3]++;
            else if (h >= 18 && h <= 23) buckets[4]++;
        }
    });

    const rawMax = Math.max(...buckets);
    const maxValInDataset = Math.max(rawMax, 1);
    const bestBucketIndex = buckets.indexOf(rawMax); 
    const hasData = recordsToAnalyze.some(r => r.type === 'TOMATO' && r.completed);

    // Calculate current active bucket
    const currentHour = currentTime.getHours();
    let currentBucketIndex = -1;
    if (currentHour >= 0 && currentHour <= 5) currentBucketIndex = 0;
    else if (currentHour >= 6 && currentHour <= 10) currentBucketIndex = 1;
    else if (currentHour >= 11 && currentHour <= 12) currentBucketIndex = 2;
    else if (currentHour >= 13 && currentHour <= 17) currentBucketIndex = 3;
    else if (currentHour >= 18 && currentHour <= 23) currentBucketIndex = 4;

    let adviceKey = 'advice_none';
    if (hasData) {
       if (bestBucketIndex === 1) adviceKey = 'advice_morning';
       else if (bestBucketIndex === 3) adviceKey = 'advice_afternoon';
       else if (bestBucketIndex === 4 || bestBucketIndex === 0) adviceKey = 'advice_night';
       else adviceKey = 'advice_balanced';
    }

    return { buckets, bucketDefs, maxValInDataset, bestBucketIndex, adviceKey, currentBucketIndex };
  }, [history, currentTime]);

  // --- Layer 4: Monthly ---
  const monthlyStats = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentMonthDate);
    const chartData = [];
    let maxChartVal = 0; 
    const startOfMonth = getStartOfMonth(currentMonthDate);
    const endOfMonth = getEndOfMonth(currentMonthDate);
    const monthRecords = history.filter(r => {
         const t = new Date(r.timestamp);
         return t >= startOfMonth && t <= endOfMonth && r.type === 'TOMATO' && r.completed;
    });
    
    const countsMap: Record<string, number> = {};
    monthRecords.forEach(r => {
        const key = new Date(r.timestamp).toDateString();
        countsMap[key] = (countsMap[key] || 0) + 1;
    });

    const today = new Date();

    daysInMonth.forEach(d => {
        const count = countsMap[d.toDateString()] || 0;
        if (count > maxChartVal) maxChartVal = count;
        chartData.push({ 
            date: d, 
            count,
            isToday: isSameDay(d, today)
        });
    });

    let bestDayCount = 0;
    let bestDayDate = null;
    chartData.forEach(d => {
        if (d.count >= bestDayCount && d.count > 0) {
            bestDayCount = d.count;
            bestDayDate = d.date;
        }
    });

    const totalTomatoes = monthRecords.length;
    
    // Monthly Avg Logic
    const isCurrentMonth = isSameMonth(currentMonthDate, today);
    const isFuture = currentMonthDate > today && !isCurrentMonth;
    
    let divisor = daysInMonth.length;
    
    if (isCurrentMonth) {
        divisor = today.getDate(); // Divide by today's date (e.g. 4th)
    } else if (isFuture) {
        divisor = 1; // Future
    }

    const avg = parseFloat((totalTomatoes / divisor).toFixed(1));

    return { chartData, maxChartVal: Math.max(maxChartVal, 1), totalTomatoes, avg, bestDayCount, bestDayDate };
  }, [history, currentMonthDate]);


  // AI Context
  const aiContextString = `
    Total Tomatoes: ${history.length}
    Today: Tomatoes: ${todayStats.tomatoes}, Focus: ${todayStats.focusMinutes}m
    Weekly Avg: ${weeklyStats.avg}
  `;

  const rankInfo = getRankInfo(todayStats.tomatoes, lang);

  return (
    <>
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap');
        .font-fredoka { font-family: 'Fredoka', sans-serif; }
        .font-nunito { font-family: 'Nunito', sans-serif; }
    `}</style>
    <div className="w-full h-full flex flex-col p-5 animate-fade-in pb-32 overflow-y-auto no-scrollbar gap-5 font-nunito">
      
      {/* Clock Header */}
      <div className="flex justify-between items-center mt-2">
         <h2 className="text-2xl font-black text-gray-800 tracking-tighter">{t('stats_title', lang)}</h2>
         
         <div className="relative min-w-[150px] h-16 bg-amber-100 rounded-2xl shadow-sm border border-amber-200 flex flex-col items-center justify-center overflow-hidden px-3">
             <div className="relative z-10 flex flex-col items-center">
                 <span className="text-3xl font-black text-amber-900 leading-none mb-0.5 font-fredoka">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                 </span>
                 <span className="text-xs font-bold text-amber-700 leading-none font-nunito opacity-80 mt-1">
                    {formatHeaderDate(currentTime, lang)}
                 </span>
             </div>
         </div>
      </div>

      {/* 1. TODAY */}
      <section>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">{t('stats_today_title', lang)}</h3>
        <div className="grid grid-cols-2 gap-3">
            
            {/* Tomatoes Card */}
            <div className="relative h-32">
                {/* Background Layer (Clipped for decoration) */}
                <div className="absolute inset-0 bg-rose-50 border border-rose-100 rounded-[24px] overflow-hidden">
                    <TomatoIcon className="absolute -bottom-4 -right-4 w-20 h-20 text-tomato-500 opacity-20 transform rotate-12" />
                </div>
                
                {/* Rank Watermark - POSITION FIXED at Right Side */}
                <div className="absolute top-1/2 right-4 transform -translate-y-1/2 z-0 pointer-events-none text-right">
                    <span className="text-2xl font-fredoka font-semibold text-rose-950/20 select-none whitespace-nowrap block leading-none">
                        {rankInfo.label}
                    </span>
                    <span className="text-[10px] font-bold text-rose-950/10 uppercase tracking-widest block mt-1">
                        RANK
                    </span>
                </div>
                
                {/* Content Layer */}
                <div className="relative z-10 p-4 h-full flex flex-col justify-end">
                    <div className="flex items-center gap-1.5">
                        <span className="text-5xl font-black text-tomato-600 leading-none font-fredoka">{todayStats.tomatoes}</span>
                        {/* Help Icon */}
                        <div 
                            className="w-5 h-5 bg-rose-200/80 rounded-full flex items-center justify-center text-xs font-bold text-rose-700 cursor-pointer hover:bg-rose-300 transition-colors shadow-sm backdrop-blur-sm mt-1"
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                setShowRankOverlay(true); 
                                if(showTooltip) setShowTooltip(false);
                                if(showStreakTooltip) setShowStreakTooltip(false);
                            }}
                        >
                            ?
                        </div>
                    </div>
                    <span className="text-xs font-bold text-tomato-900/60 uppercase block mt-1.5 font-nunito">{t('stats_today_tomatoes', lang)}</span>
                </div>

                {/* RANK OVERLAY */}
                {showRankOverlay && (
                    <div 
                        className="absolute top-0 left-0 w-full z-50 bg-gray-900/95 backdrop-blur-md p-5 rounded-[24px] shadow-2xl flex flex-col justify-center animate-fade-in border border-white/10" 
                        style={{ height: 'auto', minHeight: '100%' }}
                        onClick={(e) => { e.stopPropagation(); setShowRankOverlay(false); }}
                    >
                        <ul className="text-[10px] space-y-2 font-bold text-white/90 w-full font-nunito">
                            <li className="flex justify-between items-center border-b border-white/20 pb-1 mb-2 text-[9px] text-white/50 uppercase tracking-wider">
                                <span>Rank</span><span>Qty</span>
                            </li>
                            <li className="flex justify-between"><span>🌱 {lang === 'zh' ? '萌芽小番茄' : 'Sprout'}</span> <span className="opacity-60">0-3</span></li>
                            <li className="flex justify-between"><span>🍏 {lang === 'zh' ? '青涩果实' : 'Green Fruit'}</span> <span className="opacity-60">4-7</span></li>
                            <li className="flex justify-between"><span>🍅 {lang === 'zh' ? '熟透红番茄' : 'Red Tomato'}</span> <span className="opacity-60">8-11</span></li>
                            <li className="flex justify-between"><span>🥫 {lang === 'zh' ? '爆浆多汁王' : 'Juicy King'}</span> <span className="opacity-60">12-15</span></li>
                            <li className="flex justify-between"><span>🚀 {lang === 'zh' ? '番茄永动机' : 'Infinity'}</span> <span className="opacity-60">16+</span></li>
                        </ul>
                    </div>
                )}
            </div>
            
            {/* Focus Card */}
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-[24px] h-32 relative overflow-hidden flex flex-col justify-between">
                <ClockIcon className="absolute -bottom-4 -right-4 w-20 h-20 text-indigo-500/10 transform rotate-12" />
                <div className="relative z-10 mt-auto">
                    <span className="text-5xl font-black text-indigo-600 leading-none font-fredoka">{formatDuration(todayStats.focusMinutes)}</span>
                    <span className="text-xs font-bold text-indigo-900/60 uppercase block mt-1.5 font-nunito">{t('stats_today_focus', lang)}</span>
                </div>
            </div>
            
            {/* Streak Card */}
            <div className="bg-[#FCCEB4] border border-orange-200 p-4 rounded-[24px] h-32 relative overflow-hidden flex flex-col justify-between" onClick={() => setShowStreakTooltip(false)}>
                 <ThreeTomatoesIcon className="absolute -bottom-4 -right-4 w-20 h-16 text-red-600 opacity-20 transform -rotate-6" />
                <div className="relative z-10 mt-auto">
                     <div className="flex items-center gap-1.5">
                        <span className="text-5xl font-black text-white drop-shadow-sm leading-none font-fredoka">{todayStats.streak}</span>
                        {/* Streak Help Icon */}
                        <div 
                            className="w-5 h-5 bg-orange-500/20 rounded-full flex items-center justify-center text-xs font-bold text-white/90 cursor-pointer hover:bg-orange-500/40 transition-colors shadow-sm mt-1 border border-white/20"
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                setShowStreakTooltip(!showStreakTooltip); 
                                if(showRankOverlay) setShowRankOverlay(false);
                                if(showTooltip) setShowTooltip(false);
                            }}
                        >
                            ?
                        </div>
                     </div>
                    <span className="text-xs font-bold text-orange-900/70 uppercase block mt-1.5 font-nunito">{t('stats_today_streak', lang)}</span>
                </div>
                {/* Streak Tooltip */}
                {showStreakTooltip && (
                    <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm p-3 flex flex-col justify-center text-left z-20 rounded-[24px] overflow-y-auto no-scrollbar" onClick={(e) => { e.stopPropagation(); setShowStreakTooltip(false); }}>
                         {lang === 'zh' ? (
                            <div className="text-white text-[9px] leading-relaxed font-nunito space-y-2">
                                <div>
                                    <span className="text-orange-300 font-bold">连续规则：</span>
                                    在休息结束后的黄色“保持连击”倒计时内，开启并完成新的专注。
                                </div>
                                <div>
                                    <span className="text-red-300 font-bold">中断条件(归零)：</span>
                                    <ul className="list-disc list-inside opacity-90 pl-1 mt-0.5">
                                       <li><span className="text-white/70">超时：</span>倒计时结束前未开始。</li>
                                       <li><span className="text-white/70">中断：</span>任务放弃或心流&lt;25分。</li>
                                    </ul>
                                </div>
                            </div>
                         ) : (
                             <div className="text-white text-[9px] leading-relaxed font-nunito space-y-2">
                                <div>
                                    <span className="text-orange-300 font-bold">Streak Rule:</span>
                                    Start & complete next session within the yellow "Streak Protection" countdown.
                                </div>
                                <div>
                                    <span className="text-red-300 font-bold">Broken (Reset) If:</span>
                                    <ul className="list-disc list-inside opacity-90 pl-1 mt-0.5">
                                       <li><span className="text-white/70">Timeout:</span> Not started in time.</li>
                                       <li><span className="text-white/70">Broken:</span> Cancelled / Flow &lt; 25m.</li>
                                    </ul>
                                </div>
                            </div>
                         )}
                    </div>
                )}
            </div>
            
            {/* Interruptions Card */}
            <div className="bg-gray-300 border border-gray-200 p-4 rounded-[24px] h-32 relative overflow-hidden flex flex-col justify-between">
                <XIcon className="absolute -bottom-4 -right-4 w-20 h-20 text-gray-500/10 transform rotate-12" />
                <div className="relative z-10 mt-auto">
                     <div className="flex items-center gap-1.5">
                        <span className="text-5xl font-black text-gray-700 leading-none font-fredoka">{todayStats.interruptions}</span>
                        <div 
                            className="w-5 h-5 bg-gray-400/50 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:bg-gray-500 transition-colors shadow-sm mt-1"
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                setShowTooltip(!showTooltip); 
                                if(showRankOverlay) setShowRankOverlay(false);
                                if(showStreakTooltip) setShowStreakTooltip(false);
                            }}
                        >
                            ?
                        </div>
                     </div>
                     <span className="text-xs font-bold text-gray-600 uppercase block mt-1.5 font-nunito">{t('stats_today_interrupted', lang)}</span>
                </div>
                {showTooltip && (
                    <div className="absolute inset-0 bg-gray-800/95 p-4 flex items-center justify-center text-center z-20 rounded-[24px]" onClick={(e) => { e.stopPropagation(); setShowTooltip(false); }}>
                        <p className="text-white text-xs leading-tight font-bold font-nunito">
                            {lang === 'zh' ? '倒计时 > 2分钟或心流 > 2分钟放弃时记入' : 'Counted if cancelled after 2 mins (Countdown or Flow).'}
                        </p>
                    </div>
                )}
            </div>
        </div>
      </section>

      {/* 2. WEEKLY REPORT */}
      <section>
        <div className="flex justify-between items-end mb-3 px-1">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-0.5">{t('stats_week_title', lang)}</h3>
            
            <div className="flex items-center gap-2">
                 {/* Week Navigator */}
                <div className="flex items-center bg-sky-100/50 rounded-full p-0.5 border border-sky-200/50 shadow-sm scale-100 origin-right">
                    <button onClick={() => changeWeek(-1)} className="p-1.5 hover:bg-sky-200/50 rounded-full text-sky-400 transition-colors">
                        <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    <span className="mx-2 text-[10px] font-black text-sky-700 min-w-[110px] text-center font-nunito">
                        {formatWeekRangeWithNum(weeklyStats.startOfWeek, weeklyStats.endOfWeek, lang)}
                    </span>
                    <button onClick={() => changeWeek(1)} className="p-1.5 hover:bg-sky-200/50 rounded-full text-sky-400 transition-colors">
                        <ChevronRightIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* Avg Badge */}
                <div className="flex items-center gap-1.5 bg-sky-100/50 px-2.5 py-1 rounded-full border border-sky-200/50">
                     <span className="text-[10px] font-bold text-sky-700">{t('stats_week_avg', lang)}</span>
                     <span className="text-xs font-black text-sky-900 font-fredoka">{weeklyStats.avg}</span>
                </div>
            </div>
        </div>
        
        {/* Weekly Chart Container */}
        <div className="bg-[#ABD7FB] p-4 rounded-[32px] border border-blue-200 shadow-sm relative z-10 pt-5">
            <div className="bg-[#E3F2FD] rounded-2xl p-4 shadow-sm border border-blue-100/50 h-72 relative pt-8 flex items-end justify-between gap-3">
                {weeklyStats.days.map((day, idx) => {
                    const heightPct = weeklyStats.maxVal > 0 ? (day.count / weeklyStats.maxVal) * 100 : 0;
                    const dateStr = day.date.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric' });
                    const isMax = day.count === weeklyStats.maxVal && day.count > 0;
                    
                    let barClass = 'bg-sky-300';
                    if (isMax) barClass = 'bg-sky-500';
                    if (day.isToday) barClass += ' ring-4 ring-sky-600 ring-offset-2 ring-offset-[#E3F2FD]';

                    return (
                        <div key={idx} className="flex-1 h-full flex flex-col items-center justify-end group relative cursor-pointer">
                            {/* 1. Tooltip - Sibling of Bar, Absolute to Wrapper */}
                            <TooltipContent 
                                content={lang === 'zh' ? `日期: ${dateStr}` : `Date: ${dateStr}`}
                                subContent={lang === 'zh' ? `番茄: ${day.count}` : `Tomatoes: ${day.count}`}
                            />
                            
                            {/* 2. Bar - Centered via items-center */}
                            <div 
                                className={`w-full max-w-[24px] rounded-lg transition-all duration-500 ${barClass} group-hover:brightness-95`}
                                style={{ height: heightPct === 0 ? '6px' : `${heightPct}%`, opacity: heightPct === 0 ? 0.2 : 1 }}
                            ></div>

                            {/* 3. Label */}
                            <div className={`mt-3 text-[10px] font-black uppercase font-nunito ${day.isToday ? 'text-sky-700' : 'text-sky-400'}`}>
                                {t(day.dayLabelKey, lang)}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
      </section>

      {/* 3. GOLDEN HOUR */}
      <section>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">{t('stats_focus_hours_title', lang)}</h3>
        <div className="bg-[#F3E282] rounded-[32px] p-5 border border-yellow-200 shadow-sm relative z-0">
             
             <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-yellow-100 mb-4 h-72 pt-8 flex items-end justify-between gap-3">
                {goldenHourStats.buckets.map((count, idx) => {
                    const def = goldenHourStats.bucketDefs[idx];
                    const heightPct = goldenHourStats.maxValInDataset > 0 ? (count / goldenHourStats.maxValInDataset) * 100 : 0;
                    
                    const isMax = count === goldenHourStats.maxValInDataset && count > 0;
                    const isCurrent = idx === goldenHourStats.currentBucketIndex;

                    let barClass = 'bg-yellow-300';
                    if (isMax) barClass = 'bg-yellow-500 shadow-sm';
                    if (isCurrent) barClass += ' ring-4 ring-yellow-600 ring-offset-2 ring-offset-white';

                    return (
                        <div key={idx} className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer">
                            {/* 0. Top Label */}
                            <div className="text-[10px] font-bold text-yellow-800/50 font-fredoka mb-1.5">{count > 0 ? count : ''}</div>
                            
                            {/* 1. Tooltip */}
                            <TooltipContent 
                                content={`${count} 🍅`}
                                subContent={lang === 'zh' ? `上限: ${def.cap}` : `Limit: ${def.cap}`}
                            />

                            {/* 2. Bar */}
                            <div 
                                className={`w-full max-w-[28px] rounded-t-lg rounded-b-md transition-all duration-500 ${barClass} group-hover:brightness-95`}
                                style={{ height: heightPct === 0 ? '6px' : `${heightPct}%`, opacity: heightPct === 0 ? 0.2 : 1 }}
                            ></div>
                            
                            {/* 3. Bottom Label */}
                            <div className="relative w-full text-center mt-2">
                                <div className={`text-[9px] font-bold uppercase whitespace-nowrap font-nunito ${isCurrent ? 'text-yellow-700' : 'text-gray-400'}`}>
                                    {lang === 'zh' ? def.labelZh : def.labelEn}
                                </div>
                            </div>
                        </div>
                    )
                })}
             </div>
             <div className="p-3 bg-[#FFFDF0] rounded-2xl text-xs font-bold text-yellow-900 text-center leading-relaxed border border-yellow-100 shadow-sm font-nunito">
                 "{t(goldenHourStats.adviceKey, lang)}"
             </div>
        </div>
      </section>

      {/* 4. MONTHLY REPORT */}
      <section>
         <div className="flex justify-between items-center mb-3 px-1">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('stats_month_title', lang)}</h3>
            <div className="flex items-center bg-[#FFCC97] rounded-full p-0.5 border border-[#5c2b18]/10 shadow-sm scale-100 origin-right">
                <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-[#FFB770] rounded-full text-[#5c2b18]/60 transition-colors">
                    <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <span className="mx-3 text-[10px] font-black text-[#5c2b18] min-w-[70px] text-center font-nunito">
                    {formatMonthYear(currentMonthDate, lang)}
                </span>
                <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-[#FFB770] rounded-full text-[#5c2b18]/60 transition-colors">
                    <ChevronRightIcon className="w-4 h-4" />
                </button>
            </div>
         </div>
         
         <div className="bg-[#FF8F2E] rounded-[32px] p-4 border border-[#e57d24] shadow-sm text-[#5c2b18] relative z-0 pt-5">
             <div className="bg-[#FFCC97] rounded-2xl p-4 shadow-sm border border-white/20 mb-4 overflow-visible h-72 pt-8 flex items-end justify-between gap-[2px]">
                {monthlyStats.chartData.map((d, i) => {
                    const heightPct = monthlyStats.maxChartVal > 0 ? (d.count / monthlyStats.maxChartVal) * 100 : 0;
                    const dateStr = d.date.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric' });
                    const isMax = d.count === monthlyStats.maxChartVal && d.count > 0;
                    
                    let barClass = d.count > 0 ? 'bg-[#ff9c45]' : 'bg-white/40';
                    if (isMax) barClass = 'bg-[#D95D28]';
                    if (d.isToday) barClass += ' ring-2 ring-[#5c2b18] ring-offset-1 z-10';

                    return (
                        <div key={i} className="flex-1 h-full flex flex-col justify-end items-center group relative hover:opacity-100 opacity-90 cursor-pointer">
                            {/* 1. Tooltip */}
                            <TooltipContent 
                                content={lang === 'zh' ? `日期: ${dateStr}` : `Date: ${dateStr}`}
                                subContent={lang === 'zh' ? `番茄: ${d.count}` : `Tomatoes: ${d.count}`}
                            />

                            {/* 2. Bar */}
                            <div 
                                className={`w-full min-w-[3px] rounded-t-[2px] transition-all duration-300 relative ${barClass} group-hover:brightness-110`}
                                style={{ height: heightPct === 0 ? '3px' : `${heightPct}%` }}
                            ></div>
                        </div>
                    )
                })}
             </div>

             <div className="grid grid-cols-3 gap-3">
                 <div className="bg-[#FFCC97] p-3 rounded-2xl flex flex-col items-center shadow-inner border border-white/10 h-20 justify-center">
                     <span className="text-2xl font-black text-[#5c2b18] font-fredoka">{monthlyStats.totalTomatoes}</span>
                     <span className="text-[10px] font-bold opacity-70 uppercase mt-1 font-nunito">{t('stats_month_total', lang)}</span>
                 </div>
                 
                 <div className="bg-[#FFCC97] p-3 rounded-2xl flex flex-col items-center shadow-inner border border-white/10 h-20 justify-center">
                     <span className="text-2xl font-black text-[#5c2b18] font-fredoka">{monthlyStats.avg}</span>
                     <span className="text-[10px] font-bold opacity-70 uppercase mt-1 font-nunito">{t('stats_month_daily_avg', lang)}</span>
                 </div>

                 <div className="bg-[#FFCC97] p-3 rounded-2xl flex flex-col items-center shadow-inner border border-white/10 h-20 justify-center overflow-hidden">
                     {monthlyStats.bestDayDate ? (
                         <>
                            <span className="text-2xl font-black text-[#5c2b18] leading-none font-fredoka">
                                {monthlyStats.bestDayCount} <span className="text-xs opacity-60">🍅</span>
                            </span>
                            <span className="text-xs font-bold opacity-70 uppercase mt-1 truncate w-full text-center px-1 font-nunito">
                                {monthlyStats.bestDayDate.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })}
                            </span>
                             <span className="text-[8px] font-bold opacity-50 uppercase mt-0 font-nunito">{t('stats_month_best_day', lang)}</span>
                         </>
                     ) : (
                         <span className="text-xs opacity-50">-</span>
                     )}
                 </div>
             </div>
         </div>
      </section>

      {/* 5. HISTORY */}
      <section>
          <h3 className="text-xs font-black text-gray-400 uppercase mb-3 px-1 tracking-widest">{t('stats_history_title', lang)}</h3>
          <div className="bg-[#FF9BB3] p-5 rounded-[32px] flex justify-around items-center border border-pink-300 shadow-sm text-white h-28">
              <div className="flex flex-col items-center gap-1.5">
                   <div className="text-pink-500 bg-white p-2 rounded-2xl shadow-sm"><CalendarIcon className="w-5 h-5" /></div>
                  <span className="text-3xl font-black text-white mt-0.5 font-fredoka">{calculateDayStreak(history)}</span>
                  <span className="text-[9px] font-bold text-white/80 uppercase font-nunito">{t('stats_history_days', lang)}</span>
              </div>
               <div className="w-px h-12 bg-white/30"></div>
              <div className="flex flex-col items-center gap-1.5">
                   <div className="text-pink-500 bg-white p-2 rounded-2xl shadow-sm"><HistoryFancyIcon className="w-5 h-5" /></div>
                   <span className="text-3xl font-black text-white mt-0.5 font-fredoka">{history.filter(r=>r.completed && r.type==='TOMATO').length}</span>
                  <span className="text-[9px] font-bold text-white/80 uppercase font-nunito">{t('stats_history_count', lang)}</span>
              </div>
          </div>
      </section>

      {/* 6. AI SUMMARY */}
      <AISummary statsContext={aiContextString} lang={lang} />

    </div>
    </>
  );
};
