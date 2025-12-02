import React, { useState, useMemo, useEffect } from 'react';
import { SessionRecord, Language } from '../types';
import { t } from '../utils/i18n';
import { isSameDay, formatDuration, calculateSessionStreak, calculateDayStreak, getStartOfMonth, getEndOfMonth, addMonths, formatMonthYear, getDailyTomatoesInRange, getStartOfWeek, getDaysInMonth } from '../utils/timeUtils';
import { TomatoIcon, ClockIcon, FireIcon, HelpCircleIcon, XIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, TrophyIcon, ChartIcon, MagicIcon, ScrollIcon, ThreeTomatoesIcon, HistoryFancyIcon } from './Icons';
import { playClickSound, playActionSound } from '../utils/soundUtils';
import { generateStatsSummary } from '../utils/aiUtils';

interface StatsViewProps {
  history: SessionRecord[];
  lang: Language;
}

export const StatsView: React.FC<StatsViewProps> = ({ history, lang }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Monthly Navigation State
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const changeMonth = (delta: number) => {
    playClickSound();
    setCurrentMonthDate(addMonths(currentMonthDate, delta));
  }

  const toggleTooltip = (e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    setShowTooltip(!showTooltip);
  }

  // --- Layer 1: Today ---
  const todayStats = useMemo(() => {
    const today = new Date();
    const todayRecords = history.filter(r => isSameDay(new Date(r.timestamp), today));
    
    // Tomatoes
    const completed = todayRecords.filter(r => r.completed && r.type === 'TOMATO');
    const tomatoes = completed.length;
    
    // Focus Time
    const focusMinutes = todayRecords.reduce((acc, curr) => curr.completed ? acc + curr.durationMinutes : acc, 0);
    
    // Interruptions
    const interruptions = todayRecords.filter(r => !r.completed && r.type === 'TOMATO').length;

    // Streak (Session)
    const streak = calculateSessionStreak(history, today);

    return { tomatoes, focusMinutes, interruptions, streak };
  }, [history]);

  // --- Layer 2: Weekly (Bar Chart) ---
  const weeklyStats = useMemo(() => {
      const today = new Date();
      const startOfWeek = getStartOfWeek(today); 
      const days = [];
      let maxVal = 0;
      let totalWeekTomatoes = 0;
      
      for (let i = 0; i < 7; i++) {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          
          const count = history.filter(r => 
              isSameDay(new Date(r.timestamp), d) && 
              r.type === 'TOMATO' && 
              r.completed
          ).length;
          
          if (count > maxVal) maxVal = count;
          totalWeekTomatoes += count;
          
          days.push({
              date: d,
              count,
              dayLabelKey: ['day_m', 'day_t', 'day_w', 'day_th', 'day_f', 'day_s', 'day_su'][i],
              isToday: isSameDay(d, today)
          });
      }

      const dayIndex = (today.getDay() + 6) % 7; 
      const avgRaw = totalWeekTomatoes / (dayIndex + 1);
      const avg = parseFloat(avgRaw.toFixed(1));

      return { days, maxVal: Math.max(maxVal, 4), totalWeekTomatoes, avg }; 
  }, [history]);

  // --- Layer 3: Focus Hours (Golden Hour) ---
  const focusDistribution = useMemo(() => {
    const hours = new Array(24).fill(0);
    let morningCount = 0;   
    let afternoonCount = 0; 
    let eveningCount = 0;   
    let nightCount = 0;     
    
    history.forEach(r => {
        if (r.type === 'TOMATO' && r.completed) {
            const h = new Date(r.timestamp).getHours();
            hours[h]++;
            
            if (h >= 5 && h < 12) morningCount++;
            else if (h >= 12 && h < 18) afternoonCount++;
            else if (h >= 18 && h < 22) eveningCount++;
            else nightCount++;
        }
    });

    const maxVal = Math.max(...hours, 1);
    const bestHour = hours.indexOf(Math.max(...hours)); 
    const hasData = history.some(r => r.type === 'TOMATO' && r.completed);

    let adviceKey = 'advice_none';
    if (hasData) {
        if (morningCount >= afternoonCount && morningCount >= eveningCount && morningCount >= nightCount) adviceKey = 'advice_morning';
        else if (afternoonCount >= morningCount && afternoonCount >= eveningCount && afternoonCount >= nightCount) adviceKey = 'advice_afternoon';
        else if (eveningCount >= morningCount && eveningCount >= afternoonCount && eveningCount >= nightCount) adviceKey = 'advice_evening';
        else adviceKey = 'advice_night';
    }

    return { hours, maxVal, bestHour, adviceKey, hasData };
  }, [history]);

  // --- Layer 4: Monthly Report ---
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
    daysInMonth.forEach(d => { countsMap[d.toDateString()] = 0; });
    monthRecords.forEach(r => {
        const d = new Date(r.timestamp);
        countsMap[d.toDateString()]++;
    });

    daysInMonth.forEach(d => {
        const count = countsMap[d.toDateString()];
        if (count > maxChartVal) maxChartVal = count;
        chartData.push({ date: d, dayNum: d.getDate(), count });
    });

    const totalTomatoes = monthRecords.length;
    
    const today = new Date();
    let divider = daysInMonth.length;
    if (isSameDay(currentMonthDate, today) || (currentMonthDate.getMonth() === today.getMonth() && currentMonthDate.getFullYear() === today.getFullYear())) {
         divider = today.getDate();
    }
    const avgRaw = divider > 0 ? (totalTomatoes / divider) : 0;
    const avg = parseFloat(avgRaw.toFixed(1));

    let bestDayCount = 0;
    let bestDayDate = null;
    chartData.forEach(d => {
        if (d.count >= bestDayCount && d.count > 0) {
            bestDayCount = d.count;
            bestDayDate = d.date;
        }
    });

    let maxDayStreak = 0;
    let currentDayStreak = 0;
    chartData.forEach(d => {
        if (d.count > 0) {
            currentDayStreak++;
            maxDayStreak = Math.max(maxDayStreak, currentDayStreak);
        } else {
            currentDayStreak = 0;
        }
    });

    const allMonthRecords = history.filter(r => {
        const t = new Date(r.timestamp);
        return t >= startOfMonth && t <= endOfMonth && r.type === 'TOMATO';
    });
    
    let globalMaxStreak = 0;
    daysInMonth.forEach(day => {
        const streak = calculateSessionStreak(allMonthRecords, day);
        if (streak > globalMaxStreak) globalMaxStreak = streak;
    });

    return { 
        chartData, 
        maxChartVal: Math.max(maxChartVal, 5), 
        totalTomatoes, 
        avg, 
        bestDayCount, 
        bestDayDate, 
        maxDayStreak,
        maxSessionStreak: globalMaxStreak
    };

  }, [history, currentMonthDate]);


  // --- Layer 5: History ---
  const historyStats = useMemo(() => {
     const totalTomatoes = history.filter(r => r.completed && r.type === 'TOMATO').length;
     const dayStreak = calculateDayStreak(history);
     
     return { totalTomatoes, dayStreak };
  }, [history]);

  const handleGenerateSummary = async () => {
    setIsGeneratingAi(true);
    playActionSound();
    
    const context = `
        Total Tomatoes: ${historyStats.totalTomatoes}
        Day Streak: ${historyStats.dayStreak}
        Today: Tomatoes: ${todayStats.tomatoes}, Focus Time: ${todayStats.focusMinutes}m
        Month: Total: ${monthlyStats.totalTomatoes}, Avg: ${monthlyStats.avg}
    `;

    try {
        const result = await generateStatsSummary(context, lang);
        setAiSummary(result);
    } catch (e) {
        setAiSummary(t('stats_ai_error', lang) || "Error.");
    } finally {
        setIsGeneratingAi(false);
    }
  };


  return (
    <div className="w-full h-full flex flex-col p-4 animate-fade-in pb-24 overflow-y-auto no-scrollbar">
      {/* Live Clock Header - Smaller */}
      <div className="flex justify-between items-center mb-4 mt-1">
         <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-gray-800 tracking-tighter">{t('stats_title', lang)}</h2>
         </div>
         <div className="relative w-24 h-12 bg-amber-100 rounded-lg shadow-sm border border-amber-200 flex flex-col items-center justify-center overflow-hidden">
             <div className="relative z-10 flex flex-col items-center">
                 <span className="text-base font-black text-amber-900 leading-none mb-0.5">
                    {currentTime.toLocaleTimeString(lang === 'en' ? 'en-US' : 'zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                 </span>
                 <span className="text-[9px] font-bold uppercase tracking-wide text-amber-700 leading-none">
                    {currentTime.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })}
                 </span>
             </div>
         </div>
      </div>

      {/* 1. TODAY (Compact Cards h-24) */}
      <section className="mb-4">
        <h3 className="text-[10px] font-black text-gray-400 uppercase mb-2 px-1 tracking-widest">{t('stats_today_title', lang)}</h3>
        <div className="grid grid-cols-2 gap-2">
            
            {/* Tomato Card */}
            <div className="bg-rose-50 border border-rose-100 p-3 rounded-[20px] flex flex-col justify-between h-24 relative overflow-hidden group active:scale-95 transition-all shadow-sm">
                <div className="absolute -bottom-3 -right-3 text-tomato-500 opacity-30 transform rotate-12">
                    <TomatoIcon className="w-16 h-16" />
                </div>
                <div className="mt-auto relative z-10">
                    <div className="flex items-center">
                        <span className="text-3xl font-black text-tomato-600 tracking-tight leading-none block">{todayStats.tomatoes}</span>
                        <TomatoIcon className="w-4 h-4 ml-1 text-tomato-500/50" />
                    </div>
                    <span className="text-[9px] font-bold text-tomato-900/60 uppercase tracking-wide mt-1 block">{t('stats_today_tomatoes', lang)}</span>
                </div>
            </div>

            {/* Focus Card */}
            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-[20px] flex flex-col justify-between h-24 relative overflow-hidden group active:scale-95 transition-all shadow-sm">
                <div className="absolute -bottom-3 -right-3 text-indigo-500/10 transform rotate-12">
                    <ClockIcon className="w-16 h-16" />
                </div>
                <div className="mt-auto relative z-10">
                    <span className="text-3xl font-black text-indigo-600 tracking-tight leading-none block">{formatDuration(todayStats.focusMinutes)}</span>
                    <span className="text-[9px] font-bold text-indigo-900/60 uppercase tracking-wide mt-1 block">{t('stats_today_focus', lang)}</span>
                </div>
            </div>

            {/* Streak Card */}
            <div className="bg-[#FCCEB4] border border-orange-200 p-3 rounded-[20px] flex flex-col justify-between h-24 relative overflow-hidden group active:scale-95 transition-all shadow-sm">
                 <div className="absolute -bottom-3 -right-3 text-red-600 opacity-20 transform -rotate-6">
                    <ThreeTomatoesIcon className="w-16 h-12" />
                 </div>
                <div className="mt-auto relative z-10">
                    <div className="flex items-center">
                         <span className="text-3xl font-black text-white drop-shadow-sm tracking-tight leading-none block">{todayStats.streak}</span>
                         <TomatoIcon className="w-4 h-4 ml-1 text-white/50" />
                    </div>
                    <span className="text-[9px] font-bold text-orange-900/70 uppercase tracking-wide mt-1 block">{t('stats_today_streak', lang)}</span>
                </div>
            </div>

            {/* Broken Card */}
            <div className="bg-gray-300 border border-gray-200 p-3 rounded-[20px] flex flex-col justify-between h-24 relative overflow-hidden group active:scale-95 transition-all shadow-sm">
                <div className="absolute -bottom-3 -right-3 text-gray-500/10 transform rotate-12">
                    <XIcon className="w-16 h-16" />
                </div>
                <div className="mt-auto relative z-10">
                     <div className="flex items-end gap-1">
                        <span className="text-3xl font-black text-gray-700 leading-none">{todayStats.interruptions}</span>
                        <button onClick={toggleTooltip} className="text-gray-500 hover:text-gray-800 mb-0.5 transition-colors">
                            <HelpCircleIcon className="w-3 h-3" />
                        </button>
                     </div>
                     <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mt-1 block">{t('stats_today_interrupted', lang)}</span>
                </div>
                {showTooltip && (
                    <div className="absolute inset-0 bg-gray-800/95 p-2 flex items-center justify-center text-center z-20 cursor-pointer animate-fade-in rounded-[20px]" onClick={() => setShowTooltip(false)}>
                        <p className="text-white text-[9px] leading-tight font-bold">{t('tooltip_interrupted', lang)}</p>
                    </div>
                )}
            </div>
        </div>
      </section>

      {/* 2. WEEKLY REPORT */}
      <section className="mb-4">
        <div className="flex justify-between items-baseline mb-2 px-1">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('stats_week_title', lang)}</h3>
            <span className="text-[9px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200 flex items-center leading-none">
                {t('stats_week_avg', lang)}: <span className="font-black ml-1 text-sky-900">{weeklyStats.avg}</span>
                <TomatoIcon className="w-3 h-3 ml-0.5 text-sky-900/60" />
            </span>
        </div>
        
        <div className="bg-[#ABD7FB] p-3 rounded-[24px] border border-blue-200 shadow-sm">
            <div className="bg-[#E3F2FD] rounded-xl p-3 shadow-sm border border-blue-100/50 h-32">
                <div className="flex items-end justify-between h-full gap-1">
                    {weeklyStats.days.map((day, idx) => {
                        const heightPct = (day.count / weeklyStats.maxVal) * 100;
                        return (
                            <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group cursor-default">
                                <div className={`text-[9px] font-bold mb-0.5 transition-all ${day.count > 0 ? 'text-sky-900 opacity-100' : 'opacity-0'}`}>
                                    {day.count}
                                </div>
                                <div 
                                    className={`w-full rounded-sm transition-all duration-700 relative min-w-[4px] max-w-[14px] ${day.isToday ? 'bg-sky-600' : 'bg-sky-300'}`}
                                    style={{ height: `${Math.max(heightPct, 6)}%` }} 
                                ></div>
                                <div className={`mt-1 text-[8px] font-black uppercase ${day.isToday ? 'text-sky-700' : 'text-sky-400'}`}>
                                    {t(day.dayLabelKey, lang)}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
      </section>

      {/* 3. FOCUS HOURS */}
      <section className="mb-4">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('stats_focus_hours_title', lang)}</h3>
        <div className="bg-[#F3E282] rounded-[24px] p-3 border border-yellow-200 shadow-sm relative overflow-hidden">
             <div className="mb-3 flex items-center gap-2 relative z-10 px-1">
                 <div className="bg-white text-yellow-600 p-1.5 rounded-lg shadow-sm border border-yellow-100">
                     <ClockIcon className="w-4 h-4" />
                 </div>
                 <div>
                     <div className="text-[8px] font-bold text-yellow-800/60 uppercase tracking-wide mb-0.5">{t('stats_focus_hours_best', lang)}</div>
                     {focusDistribution.hasData ? (
                         <div className="text-base font-black text-yellow-900">
                             {String(focusDistribution.bestHour).padStart(2, '0')}:00 - {String(focusDistribution.bestHour + 1).padStart(2, '0')}:00
                         </div>
                     ) : (
                         <div className="text-base font-bold text-yellow-900/50">--:--</div>
                     )}
                 </div>
             </div>

             <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-sm border border-yellow-100 mb-2 relative z-10">
                <div className="flex items-end justify-between h-16 gap-[1px]">
                    {focusDistribution.hours.map((count, h) => {
                        const heightPct = focusDistribution.maxVal > 0 ? (count / focusDistribution.maxVal) * 100 : 0;
                        const isBest = h === focusDistribution.bestHour && count > 0;
                        return (
                            <div key={h} className="flex-1 flex flex-col justify-end h-full relative group">
                                <div 
                                    className={`w-full rounded-[1px] transition-all duration-500 ${isBest ? 'bg-yellow-500' : (count > 0 ? 'bg-yellow-300' : 'bg-gray-100')}`}
                                    style={{ height: `${Math.max(4, heightPct)}%` }}
                                ></div>
                            </div>
                        )
                    })}
                </div>
                 <div className="flex justify-between text-[7px] font-bold text-gray-400 mt-1 px-1">
                     <span>00</span>
                     <span>12</span>
                     <span>23</span>
                 </div>
             </div>
             
             <div className="p-2 bg-[#FFFDF0] rounded-lg text-[10px] font-bold text-yellow-900 text-center leading-relaxed relative z-10 border border-yellow-100 shadow-sm">
                 "{t(focusDistribution.adviceKey, lang)}"
             </div>
        </div>
      </section>

      {/* 4. MONTHLY REPORT */}
      <section className="mb-4">
         <div className="flex justify-between items-center mb-3 px-1">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('stats_month_title', lang)}</h3>
            <div className="flex items-center bg-white rounded-full p-0.5 border border-gray-100 shadow-sm scale-90 origin-right">
                <button 
                  onClick={() => changeMonth(-1)}
                  className="p-1 hover:bg-gray-50 rounded-full text-gray-400 active:scale-95 transition-all"
                >
                    <ChevronLeftIcon className="w-3 h-3" />
                </button>
                <span className="mx-2 text-[10px] font-black text-gray-700 min-w-[70px] text-center">
                    {formatMonthYear(currentMonthDate, lang)}
                </span>
                <button 
                  onClick={() => changeMonth(1)}
                  className="p-1 hover:bg-gray-50 rounded-full text-gray-400 active:scale-95 transition-all"
                  disabled={currentMonthDate > new Date()}
                >
                    <ChevronRightIcon className="w-3 h-3" />
                </button>
            </div>
         </div>
         
         <div className="bg-[#FF8F2E] rounded-[24px] p-3 border border-[#e57d24] shadow-sm text-[#5c2b18]">
             <div className="bg-[#FFCC97] rounded-xl p-3 shadow-sm border border-white/20 mb-3 overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <div className="flex items-end gap-[2px] h-20 min-w-[100%] w-max">
                        {monthlyStats.chartData.map((d, i) => {
                            const heightPct = (d.count / monthlyStats.maxChartVal) * 100;
                            const isBest = d.count === monthlyStats.bestDayCount && d.count > 0;
                            return (
                                <div key={i} className="w-3 flex flex-col justify-end h-full group relative flex-shrink-0">
                                    <div 
                                        className={`w-full rounded-[1px] transition-all duration-500 ${isBest ? 'bg-[#D95D28]' : (d.count > 0 ? 'bg-[#FF8F2E]' : 'bg-white/50')}`}
                                        style={{ height: `${Math.max(4, heightPct)}%` }}
                                    ></div>
                                </div>
                            )
                        })}
                    </div>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-2">
                 {/* Total */}
                 <div className="bg-[#FFCC97] p-2 rounded-xl flex flex-col items-center shadow-inner border border-white/10">
                     <div className="flex items-center">
                         <span className="text-xl font-black text-[#5c2b18]">{monthlyStats.totalTomatoes}</span>
                         <TomatoIcon className="w-3 h-3 ml-1 text-[#5c2b18]/60" />
                     </div>
                     <span className="text-[8px] font-bold opacity-70 uppercase tracking-wide mt-0.5 text-[#5c2b18]">{t('stats_month_total', lang)}</span>
                 </div>

                 {/* Avg */}
                 <div className="bg-[#FFCC97] p-2 rounded-xl flex flex-col items-center shadow-inner border border-white/10">
                     <div className="flex items-center">
                         <span className="text-xl font-black text-[#5c2b18]">{monthlyStats.avg}</span>
                         <TomatoIcon className="w-3 h-3 ml-1 text-[#5c2b18]/60" />
                     </div>
                     <span className="text-[8px] font-bold opacity-70 uppercase tracking-wide mt-0.5 text-[#5c2b18]">{t('stats_month_daily_avg', lang)}</span>
                 </div>

                 {/* Best Day */}
                 <div className="bg-[#FFCC97] p-2 rounded-xl flex flex-col items-center col-span-1 shadow-inner border border-white/10">
                     <div className="flex items-center">
                         <span className="text-xl font-black text-[#5c2b18]">{monthlyStats.bestDayCount}</span>
                         <TomatoIcon className="w-3 h-3 ml-1 text-[#5c2b18]/60" />
                     </div>
                     <div className="flex flex-col items-center mt-0.5">
                         <span className="text-[8px] font-bold opacity-70 uppercase tracking-wide leading-none text-[#5c2b18]">{t('stats_month_best_day', lang)}</span>
                         {monthlyStats.bestDayDate && (
                             <span className="text-[7px] font-bold opacity-100 mt-0.5 text-[#5c2b18]">
                                 {monthlyStats.bestDayDate.getMonth()+1}/{monthlyStats.bestDayDate.getDate()}
                             </span>
                         )}
                     </div>
                 </div>

                 {/* Streaks */}
                 <div className="flex flex-col gap-1.5 col-span-1">
                     <div className="bg-[#FFCC97] p-1.5 rounded-lg flex justify-between items-center px-2 border border-white/10 shadow-inner flex-1">
                         <span className="text-[7px] font-bold opacity-70 text-[#5c2b18]">{t('stats_month_max_streak_session', lang)}</span>
                         <div className="flex items-center">
                             <span className="text-base font-black text-[#5c2b18]">{monthlyStats.maxSessionStreak}</span>
                             <TomatoIcon className="w-2.5 h-2.5 ml-0.5 text-[#5c2b18]/60" />
                         </div>
                     </div>
                     <div className="bg-[#FFCC97] p-1.5 rounded-lg flex justify-between items-center px-2 border border-white/10 shadow-inner flex-1">
                         <span className="text-[7px] font-bold opacity-70 text-[#5c2b18]">{t('stats_month_max_streak_days', lang)}</span>
                         <span className="text-base font-black text-[#5c2b18]">{monthlyStats.maxDayStreak}</span>
                     </div>
                 </div>
             </div>
         </div>
      </section>

      {/* 5. HISTORY */}
      <section className="mb-4">
          <h3 className="text-[10px] font-black text-gray-400 uppercase mb-2 px-1 tracking-widest">{t('stats_history_title', lang)}</h3>
          <div className="bg-[#FF9BB3] p-4 rounded-[24px] flex justify-around items-center border border-pink-300 shadow-sm text-white">
              <div className="flex flex-col items-center gap-1">
                   <div className="text-pink-500 bg-white p-2 rounded-xl shadow-sm"><CalendarIcon className="w-4 h-4" /></div>
                  <span className="text-xl font-black text-white mt-1 drop-shadow-sm">{historyStats.dayStreak}</span>
                  <span className="text-[8px] font-bold text-white/80 uppercase tracking-wide">{t('stats_history_days', lang)}</span>
              </div>
               <div className="w-px h-10 bg-white/30"></div>
              <div className="flex flex-col items-center gap-1">
                   <div className="text-pink-500 bg-white p-2 rounded-xl shadow-sm"><HistoryFancyIcon className="w-4 h-4" /></div>
                   <div className="flex items-center mt-1">
                      <span className="text-xl font-black text-white drop-shadow-sm">{historyStats.totalTomatoes}</span>
                      <TomatoIcon className="w-3 h-3 ml-0.5 text-white/60" />
                   </div>
                  <span className="text-[8px] font-bold text-white/80 uppercase tracking-wide">{t('stats_history_count', lang)}</span>
              </div>
          </div>
      </section>

      {/* 6. AI SUMMARY */}
      <section>
          <h3 className="text-[10px] font-black text-gray-400 uppercase mb-2 px-1 tracking-widest">{t('stats_ai_title', lang)}</h3>
          <div className="bg-[#9F9DF3] p-4 rounded-[24px] border border-indigo-300 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

             <div className="flex flex-col items-center text-center relative z-10">
                 <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#9F9DF3] shadow-cartoon mb-3 border border-indigo-100 transform -rotate-6">
                     <MagicIcon className="w-5 h-5" />
                 </div>
                 
                 {aiSummary ? (
                     <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl w-full text-xs font-bold text-indigo-900 leading-relaxed text-left animate-fade-in border border-indigo-100 shadow-sm">
                         {aiSummary}
                     </div>
                 ) : (
                     <p className="text-[10px] font-bold text-white/90 mb-4 max-w-[200px] leading-relaxed">
                        {t('stats_ai_placeholder', lang)}
                     </p>
                 )}

                 {!aiSummary && (
                     <button
                        onClick={handleGenerateSummary}
                        disabled={isGeneratingAi}
                        className={`mt-2 px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-900/20 ${
                            isGeneratingAi ? 'bg-white/50 text-white cursor-not-allowed' : 'bg-white text-indigo-600 hover:bg-gray-50'
                        }`}
                     >
                        {isGeneratingAi ? t('stats_ai_generating', lang) : t('stats_ai_btn_generate', lang)}
                     </button>
                 )}
             </div>
          </div>
      </section>
    </div>
  );
};