
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
      const startOfWeek = getStartOfWeek(today); // Returns Monday
      const days = [];
      let maxVal = 0;
      let totalWeekTomatoes = 0;
      
      // Generate Mon-Sun data
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

      const dayIndex = (today.getDay() + 6) % 7; // Mon=0, Sun=6
      // Only divide by days passed so far
      const avgRaw = totalWeekTomatoes / (dayIndex + 1);
      // Logic: if it's a whole number (e.g. 2.0), show 2. If 2.5, show 2.5
      const avg = parseFloat(avgRaw.toFixed(1));

      return { days, maxVal: Math.max(maxVal, 4), totalWeekTomatoes, avg }; 
  }, [history]);

  // --- Layer 3: Focus Hours (Golden Hour) ---
  const focusDistribution = useMemo(() => {
    const hours = new Array(24).fill(0);
    let morningCount = 0;   // 5 - 12
    let afternoonCount = 0; // 12 - 18
    let eveningCount = 0;   // 18 - 22
    let nightCount = 0;     // 22 - 5
    
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

  // --- Layer 4: Monthly Report (Detailed) ---
  const monthlyStats = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentMonthDate);
    const chartData = [];
    let maxChartVal = 0;

    // Filter history for this month ONLY ONCE
    const startOfMonth = getStartOfMonth(currentMonthDate);
    const endOfMonth = getEndOfMonth(currentMonthDate);
    const monthRecords = history.filter(r => {
         const t = new Date(r.timestamp);
         return t >= startOfMonth && t <= endOfMonth && r.type === 'TOMATO' && r.completed;
    });

    // 1. Chart Data Calculation
    const countsMap: Record<string, number> = {};
    
    // Initialize map
    daysInMonth.forEach(d => {
        countsMap[d.toDateString()] = 0;
    });

    // Fill map
    monthRecords.forEach(r => {
        const d = new Date(r.timestamp);
        countsMap[d.toDateString()]++;
    });

    // Build Chart Array
    daysInMonth.forEach(d => {
        const count = countsMap[d.toDateString()];
        if (count > maxChartVal) maxChartVal = count;
        chartData.push({
            date: d,
            dayNum: d.getDate(),
            count
        });
    });

    // 2. Metrics Calculation
    const totalTomatoes = monthRecords.length;
    
    // Average: Divide by days passed in month (if current) or total days (if past)
    const today = new Date();
    let divider = daysInMonth.length;
    if (isSameDay(currentMonthDate, today) || (currentMonthDate.getMonth() === today.getMonth() && currentMonthDate.getFullYear() === today.getFullYear())) {
         divider = today.getDate();
    }
    const avgRaw = divider > 0 ? (totalTomatoes / divider) : 0;
    const avg = parseFloat(avgRaw.toFixed(1));

    // Best Day
    let bestDayCount = 0;
    let bestDayDate = null;
    chartData.forEach(d => {
        if (d.count >= bestDayCount && d.count > 0) {
            bestDayCount = d.count;
            bestDayDate = d.date;
        }
    });

    // Longest Streak (Continuous Days with at least 1 tomato)
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

    // Max Session Streak (Global Max for the month)
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
    
    // Prepare Data Context
    const context = `
        Total Tomatoes (All Time): ${historyStats.totalTomatoes}
        Current Day Streak: ${historyStats.dayStreak}
        
        Today:
        - Tomatoes: ${todayStats.tomatoes}
        - Focus Time: ${todayStats.focusMinutes}m
        - Session Streak: ${todayStats.streak}
        
        This Month:
        - Total: ${monthlyStats.totalTomatoes}
        - Daily Avg: ${monthlyStats.avg}
        - Best Day: ${monthlyStats.bestDayCount}
    `;

    try {
        const result = await generateStatsSummary(context, lang);
        setAiSummary(result);
    } catch (e) {
        setAiSummary(t('stats_ai_error', lang) || "Error generating summary.");
    } finally {
        setIsGeneratingAi(false);
    }
  };


  return (
    <div className="w-full h-full flex flex-col p-4 animate-fade-in pb-32 overflow-y-auto no-scrollbar">
      {/* Live Clock Header */}
      <div className="flex justify-between items-center mb-6 mt-2">
         <div className="flex items-center gap-2">
            <h2 className="text-3xl font-black text-gray-800 tracking-tighter">{t('stats_title', lang)}</h2>
         </div>
         {/* Styled Clock - Cleaned */}
         <div className="relative w-28 h-14 bg-amber-100 rounded-lg shadow-sm border border-amber-200 flex flex-col items-center justify-center overflow-hidden">
             <div className="relative z-10 flex flex-col items-center">
                 <span className="text-lg font-black text-amber-900 leading-none mb-0.5">
                    {currentTime.toLocaleTimeString(lang === 'en' ? 'en-US' : 'zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                 </span>
                 <span className="text-[9px] font-bold uppercase tracking-wide text-amber-700 leading-none">
                    {currentTime.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })}
                 </span>
             </div>
         </div>
      </div>

      {/* 1. TODAY (Uniform Grid) */}
      <section className="mb-6">
        <h3 className="text-xs font-black text-gray-400 uppercase mb-3 px-1 tracking-widest">{t('stats_today_title', lang)}</h3>
        <div className="grid grid-cols-2 gap-3">
            
            {/* Tomato Card (Red Theme) */}
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-[24px] flex flex-col justify-between h-32 relative overflow-hidden group transition-all active:scale-95 shadow-sm hover:shadow-md">
                {/* Watermark Logo - Updated to slightly transparent */}
                <div className="absolute -bottom-4 -right-4 text-tomato-500 opacity-30 transform rotate-12">
                    <TomatoIcon className="w-24 h-24" />
                </div>
                
                <div className="mt-auto relative z-10">
                    <div className="flex items-center">
                        <span className="text-4xl font-black text-tomato-600 tracking-tight leading-none block">{todayStats.tomatoes}</span>
                        <TomatoIcon className="w-5 h-5 ml-1 text-tomato-500/50" />
                    </div>
                    <span className="text-[10px] font-bold text-tomato-900/60 uppercase tracking-wide mt-1 block">{t('stats_today_tomatoes', lang)}</span>
                </div>
            </div>

            {/* Focus Card (Indigo Theme) */}
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-[24px] flex flex-col justify-between h-32 relative overflow-hidden group transition-all active:scale-95 shadow-sm hover:shadow-md">
                {/* Watermark Logo */}
                <div className="absolute -bottom-4 -right-4 text-indigo-500/10 transform rotate-12">
                    <ClockIcon className="w-24 h-24" />
                </div>

                <div className="mt-auto relative z-10">
                    <span className="text-4xl font-black text-indigo-600 tracking-tight leading-none block">{formatDuration(todayStats.focusMinutes)}</span>
                    <span className="text-[10px] font-bold text-indigo-900/60 uppercase tracking-wide mt-1 block">{t('stats_today_focus', lang)}</span>
                </div>
            </div>

            {/* Streak Card (UPDATED COLOR #FCCEB4) */}
            <div className="bg-[#FCCEB4] border border-orange-200 p-4 rounded-[24px] flex flex-col justify-between h-32 relative overflow-hidden group transition-all active:scale-95 shadow-sm hover:shadow-md">
                 {/* Watermark Logo - Three Tomatoes - Updated to Red but Watermark */}
                 <div className="absolute -bottom-4 -right-4 text-red-600 opacity-20 transform -rotate-6">
                    <ThreeTomatoesIcon className="w-24 h-16" />
                 </div>

                <div className="mt-auto relative z-10">
                    <div className="flex items-center">
                         <span className="text-4xl font-black text-white drop-shadow-sm tracking-tight leading-none block">{todayStats.streak}</span>
                         <TomatoIcon className="w-5 h-5 ml-1 text-white/50" />
                    </div>
                    <span className="text-[10px] font-bold text-orange-900/70 uppercase tracking-wide mt-1 block">{t('stats_today_streak', lang)}</span>
                </div>
            </div>

            {/* Broken Card (Light Gray Theme #E5E7EB - bg-gray-300) */}
            <div className="bg-gray-300 border border-gray-200 p-4 rounded-[24px] flex flex-col justify-between h-32 relative overflow-hidden group transition-all active:scale-95 shadow-sm hover:shadow-md">
                {/* Watermark Logo */}
                <div className="absolute -bottom-4 -right-4 text-gray-500/10 transform rotate-12">
                    <XIcon className="w-24 h-24" />
                </div>
                
                <div className="mt-auto relative z-10">
                     <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-gray-700 leading-none">{todayStats.interruptions}</span>
                        <button onClick={toggleTooltip} className="text-gray-500 hover:text-gray-800 mb-1 transition-colors">
                            <HelpCircleIcon className="w-4 h-4" />
                        </button>
                     </div>
                     <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide mt-1 block">{t('stats_today_interrupted', lang)}</span>
                </div>
                
                {showTooltip && (
                    <div 
                        className="absolute inset-0 bg-gray-800/95 p-3 flex items-center justify-center text-center z-20 cursor-pointer animate-fade-in rounded-[24px]"
                        onClick={() => setShowTooltip(false)}
                    >
                        <p className="text-white text-[10px] leading-tight font-bold">{t('tooltip_interrupted', lang)}</p>
                    </div>
                )}
            </div>
        </div>
      </section>

      {/* 2. WEEKLY REPORT (UPDATED COLOR #ABD7FB) */}
      <section className="mb-6">
        <div className="flex justify-between items-baseline mb-3 px-1">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('stats_week_title', lang)}</h3>
            {/* Adjusted Alignment */}
            <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-3 py-1 rounded-full border border-sky-200 flex items-center leading-none">
                {t('stats_week_avg', lang)}: <span className="font-black ml-1 text-sky-900 leading-none pt-[1px]">{weeklyStats.avg}</span>
                <TomatoIcon className="w-3 h-3 ml-1 text-sky-900/60 self-center" />
            </span>
        </div>
        
        {/* Container: #ABD7FB */}
        <div className="bg-[#ABD7FB] p-4 rounded-[32px] border border-blue-200 shadow-sm">
            {/* Chart: Lighter #E3F2FD */}
            <div className="bg-[#E3F2FD] rounded-2xl p-4 shadow-sm border border-blue-100/50 h-40">
                <div className="flex items-end justify-between h-full gap-2">
                    {weeklyStats.days.map((day, idx) => {
                        const heightPct = (day.count / weeklyStats.maxVal) * 100;
                        return (
                            <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group cursor-default">
                                {/* Number label */}
                                <div className={`text-[10px] font-bold mb-1 transition-all ${day.count > 0 ? 'text-sky-900 opacity-100' : 'opacity-0'}`}>
                                    {day.count}
                                </div>
                                {/* Bar */}
                                <div 
                                    className={`w-full rounded-md transition-all duration-700 relative min-w-[6px] max-w-[18px] ${
                                        day.isToday ? 'bg-sky-600' : 'bg-sky-300'
                                    }`}
                                    style={{ height: `${Math.max(heightPct, 6)}%` }} 
                                ></div>
                                {/* Axis Label */}
                                <div className={`mt-2 text-[9px] font-black uppercase ${day.isToday ? 'text-sky-700' : 'text-sky-400'}`}>
                                    {t(day.dayLabelKey, lang)}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
      </section>

      {/* 3. FOCUS HOURS (UPDATED COLOR #F3E282 - Pastel Gold) */}
      <section className="mb-6">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">{t('stats_focus_hours_title', lang)}</h3>
        
        <div className="bg-[#F3E282] rounded-[32px] p-4 border border-yellow-200 shadow-sm relative overflow-hidden">
             
             {/* Header */}
             <div className="mb-4 flex items-center gap-3 relative z-10 px-2">
                 <div className="bg-white text-yellow-600 p-2 rounded-xl shadow-sm border border-yellow-100">
                     <ClockIcon className="w-5 h-5" />
                 </div>
                 <div>
                     <div className="text-[9px] font-bold text-yellow-800/60 uppercase tracking-wide mb-0.5">{t('stats_focus_hours_best', lang)}</div>
                     {focusDistribution.hasData ? (
                         <div className="text-lg font-black text-yellow-900">
                             {String(focusDistribution.bestHour).padStart(2, '0')}:00 - {String(focusDistribution.bestHour + 1).padStart(2, '0')}:00
                         </div>
                     ) : (
                         <div className="text-lg font-bold text-yellow-900/50">--:--</div>
                     )}
                 </div>
             </div>

             {/* Chart Container (White) */}
             <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-yellow-100 mb-3 relative z-10">
                <div className="flex items-end justify-between h-20 gap-[2px]">
                    {focusDistribution.hours.map((count, h) => {
                        const heightPct = focusDistribution.maxVal > 0 ? (count / focusDistribution.maxVal) * 100 : 0;
                        const isBest = h === focusDistribution.bestHour && count > 0;
                        return (
                            <div key={h} className="flex-1 flex flex-col justify-end h-full relative group">
                                <div 
                                    className={`w-full rounded-sm transition-all duration-500 ${isBest ? 'bg-yellow-500' : (count > 0 ? 'bg-yellow-300' : 'bg-gray-100')}`}
                                    style={{ height: `${Math.max(4, heightPct)}%` }}
                                ></div>
                            </div>
                        )
                    })}
                </div>
                 {/* X Axis Hint */}
                 <div className="flex justify-between text-[8px] font-bold text-gray-400 mt-1 px-1">
                     <span>00:00</span>
                     <span>12:00</span>
                     <span>23:00</span>
                 </div>
             </div>
             
             {/* Advice Box (Lightest: #FFFDF0) */}
             <div className="p-3 bg-[#FFFDF0] rounded-xl text-xs font-bold text-yellow-900 text-center leading-relaxed relative z-10 border border-yellow-100 mx-1 shadow-sm">
                 "{t(focusDistribution.adviceKey, lang)}"
             </div>
        </div>
      </section>

      {/* 4. MONTHLY REPORT (UPDATED COLOR #FF8F2E - Vibrant Orange) */}
      <section className="mb-6">
         <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('stats_month_title', lang)}</h3>
            <div className="flex items-center bg-white rounded-full p-1 border border-gray-100 shadow-sm">
                <button 
                  onClick={() => changeMonth(-1)}
                  className="p-1.5 hover:bg-gray-50 rounded-full text-gray-400 active:scale-95 transition-all"
                >
                    <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <span className="mx-2 text-xs font-black text-gray-700 min-w-[80px] text-center">
                    {formatMonthYear(currentMonthDate, lang)}
                </span>
                <button 
                  onClick={() => changeMonth(1)}
                  className="p-1.5 hover:bg-gray-50 rounded-full text-gray-400 active:scale-95 transition-all"
                  disabled={currentMonthDate > new Date()}
                >
                    <ChevronRightIcon className="w-4 h-4" />
                </button>
            </div>
         </div>
         
         {/* Container: #FF8F2E (Vibrant Orange) */}
         <div className="bg-[#FF8F2E] rounded-[32px] p-4 border border-[#e57d24] shadow-sm text-[#5c2b18]">
             {/* 1. Monthly Chart (Inner: #FFCC97 Peachy Orange) */}
             <div className="bg-[#FFCC97] rounded-2xl p-4 shadow-sm border border-white/20 mb-4 overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <div className="flex items-end gap-1 h-28 min-w-[100%] w-max">
                        {monthlyStats.chartData.map((d, i) => {
                            const heightPct = (d.count / monthlyStats.maxChartVal) * 100;
                            const isBest = d.count === monthlyStats.bestDayCount && d.count > 0;
                            return (
                                <div key={i} className="w-4 flex flex-col justify-end h-full group relative flex-shrink-0">
                                    <div 
                                        className={`w-full rounded-sm transition-all duration-500 ${isBest ? 'bg-[#D95D28]' : (d.count > 0 ? 'bg-[#FF8F2E]' : 'bg-white/50')}`}
                                        style={{ height: `${Math.max(4, heightPct)}%` }}
                                    ></div>
                                </div>
                            )
                        })}
                    </div>
                </div>
             </div>

             {/* 2. Core Metrics Grid (Updated to #FFCC97) */}
             <div className="grid grid-cols-2 gap-3">
                 
                 {/* Total */}
                 <div className="bg-[#FFCC97] p-3 rounded-2xl flex flex-col items-center shadow-inner border border-white/10">
                     <div className="flex items-center">
                         <span className="text-2xl font-black text-[#5c2b18]">{monthlyStats.totalTomatoes}</span>
                         <TomatoIcon className="w-4 h-4 ml-1 text-[#5c2b18]/60" />
                     </div>
                     <span className="text-[9px] font-bold opacity-70 uppercase tracking-wide mt-1 text-[#5c2b18]">{t('stats_month_total', lang)}</span>
                 </div>

                 {/* Avg */}
                 <div className="bg-[#FFCC97] p-3 rounded-2xl flex flex-col items-center shadow-inner border border-white/10">
                     <div className="flex items-center">
                         <span className="text-2xl font-black text-[#5c2b18]">{monthlyStats.avg}</span>
                         <TomatoIcon className="w-4 h-4 ml-1 text-[#5c2b18]/60" />
                     </div>
                     <span className="text-[9px] font-bold opacity-70 uppercase tracking-wide mt-1 text-[#5c2b18]">{t('stats_month_daily_avg', lang)}</span>
                 </div>

                 {/* Best Day */}
                 <div className="bg-[#FFCC97] p-3 rounded-2xl flex flex-col items-center col-span-1 shadow-inner border border-white/10">
                     <div className="flex items-center">
                         <span className="text-2xl font-black text-[#5c2b18]">{monthlyStats.bestDayCount}</span>
                         <TomatoIcon className="w-4 h-4 ml-1 text-[#5c2b18]/60" />
                     </div>
                     <div className="flex flex-col items-center mt-1">
                         <span className="text-[9px] font-bold opacity-70 uppercase tracking-wide leading-none text-[#5c2b18]">{t('stats_month_best_day', lang)}</span>
                         {monthlyStats.bestDayDate && (
                             <span className="text-[8px] font-bold opacity-100 mt-1 text-[#5c2b18]">
                                 {monthlyStats.bestDayDate.getMonth()+1}月{monthlyStats.bestDayDate.getDate()}日
                             </span>
                         )}
                     </div>
                 </div>

                 {/* Streaks Container */}
                 <div className="flex flex-col gap-2 col-span-1">
                     <div className="bg-[#FFCC97] p-2 rounded-xl flex justify-between items-center px-3 border border-white/10 shadow-inner flex-1">
                         <span className="text-[8px] font-bold opacity-70 text-[#5c2b18]">{t('stats_month_max_streak_session', lang)}</span>
                         <div className="flex items-center">
                             <span className="text-lg font-black text-[#5c2b18]">{monthlyStats.maxSessionStreak}</span>
                             <TomatoIcon className="w-3 h-3 ml-0.5 text-[#5c2b18]/60" />
                         </div>
                     </div>
                     <div className="bg-[#FFCC97] p-2 rounded-xl flex justify-between items-center px-3 border border-white/10 shadow-inner flex-1">
                         <span className="text-[8px] font-bold opacity-70 text-[#5c2b18]">{t('stats_month_max_streak_days', lang)}</span>
                         <span className="text-lg font-black text-[#5c2b18]">{monthlyStats.maxDayStreak}</span>
                     </div>
                 </div>

             </div>
         </div>
      </section>

      {/* 5. HISTORY (UPDATED COLOR #FF9BB3) */}
      <section className="mb-6">
          <h3 className="text-xs font-black text-gray-400 uppercase mb-3 px-1 tracking-widest">{t('stats_history_title', lang)}</h3>
          <div className="bg-[#FF9BB3] p-6 rounded-[32px] flex justify-around items-center border border-pink-300 shadow-sm text-white">
              
              <div className="flex flex-col items-center gap-2">
                   <div className="text-pink-500 bg-white p-3 rounded-2xl shadow-sm"><CalendarIcon className="w-5 h-5" /></div>
                  <span className="text-2xl font-black text-white mt-1 drop-shadow-sm">{historyStats.dayStreak}</span>
                  <span className="text-[9px] font-bold text-white/80 uppercase tracking-wide">{t('stats_history_days', lang)}</span>
              </div>

               <div className="w-px h-16 bg-white/30"></div>

              <div className="flex flex-col items-center gap-2">
                   {/* Optimized Logo: Detailed Scroll/Book style */}
                   <div className="text-pink-500 bg-white p-3 rounded-2xl shadow-sm"><HistoryFancyIcon className="w-5 h-5" /></div>
                   <div className="flex items-center mt-1">
                      <span className="text-2xl font-black text-white drop-shadow-sm">{historyStats.totalTomatoes}</span>
                      <TomatoIcon className="w-4 h-4 ml-1 text-white/60" />
                   </div>
                  <span className="text-[9px] font-bold text-white/80 uppercase tracking-wide">{t('stats_history_count', lang)}</span>
              </div>

          </div>
      </section>

      {/* 6. AI SUMMARY (UPDATED COLOR #9F9DF3) */}
      <section>
          <h3 className="text-xs font-black text-gray-400 uppercase mb-3 px-1 tracking-widest">{t('stats_ai_title', lang)}</h3>
          <div className="bg-[#9F9DF3] p-6 rounded-[32px] border border-indigo-300 shadow-sm relative overflow-hidden">
             
             {/* Decorative Background */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

             <div className="flex flex-col items-center text-center relative z-10">
                 <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#9F9DF3] shadow-cartoon mb-5 border border-indigo-100 transform -rotate-6">
                     <MagicIcon className="w-7 h-7" />
                 </div>
                 
                 {aiSummary ? (
                     <div className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl w-full text-sm font-bold text-indigo-900 leading-7 text-left animate-fade-in border border-indigo-100 shadow-sm">
                         {aiSummary}
                     </div>
                 ) : (
                     <p className="text-xs font-bold text-white/90 mb-6 max-w-[220px] leading-relaxed">
                        {t('stats_ai_placeholder', lang)}
                     </p>
                 )}

                 {!aiSummary && (
                     <button
                        onClick={handleGenerateSummary}
                        disabled={isGeneratingAi}
                        className={`mt-4 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-900/20 ${
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
