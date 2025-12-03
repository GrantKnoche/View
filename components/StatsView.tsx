
import React, { useState, useMemo, useEffect } from 'react';
import { SessionRecord, Language } from '../types';
import { t } from '../utils/i18n';
import { isSameDay, formatDuration, calculateSessionStreak, calculateDayStreak, getStartOfMonth, getEndOfMonth, addMonths, formatMonthYear, getStartOfWeek, getDaysInMonth } from '../utils/timeUtils';
import { TomatoIcon, ClockIcon, HelpCircleIcon, XIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, HistoryFancyIcon, ThreeTomatoesIcon, MagicIcon } from './Icons';
import { playClickSound, playActionSound } from '../utils/soundUtils';
import { generateStatsSummary } from '../utils/aiUtils';

interface StatsViewProps {
  history: SessionRecord[];
  lang: Language;
}

export const StatsView: React.FC<StatsViewProps> = ({ history, lang }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Interactive Charts State
  const [hoveredWeekDay, setHoveredWeekDay] = useState<number | null>(null);
  
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

  // --- Layer 2: Weekly (Optimized) ---
  const weeklyStats = useMemo(() => {
      const today = new Date();
      const startOfWeek = getStartOfWeek(today); 
      const days = [];
      let maxVal = 0;
      let totalWeekTomatoes = 0;
      
      for (let i = 0; i < 7; i++) {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          
          // Calculate Focus Time (Minutes)
          const records = history.filter(r => 
              isSameDay(new Date(r.timestamp), d) && r.type === 'TOMATO' && r.completed
          );
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

      const dayIndex = (today.getDay() + 6) % 7; 
      const avgRaw = totalWeekTomatoes / (dayIndex + 1);
      const avg = parseFloat(avgRaw.toFixed(1));

      return { days, maxVal: Math.max(maxVal, 4), totalWeekTomatoes, avg }; 
  }, [history]);

  // --- Layer 3: Golden Hour (6 Buckets Logic) ---
  const goldenHourStats = useMemo(() => {
    // 6 Buckets: 
    // 0: Dawn (00-05), 1: Morning (06-10), 2: Noon (11-12), 
    // 3: Afternoon (13-16), 4: Evening (17-18), 5: Night (19-23)
    const buckets = [0, 0, 0, 0, 0, 0];
    const bucketLabels = [
        { en: 'Dawn', zh: '凌晨' },
        { en: 'Morn', zh: '早上' },
        { en: 'Noon', zh: '中午' },
        { en: 'Aftn', zh: '下午' },
        { en: 'Eve', zh: '傍晚' },
        { en: 'Night', zh: '晚上' },
    ];

    history.forEach(r => {
        if (r.type === 'TOMATO' && r.completed) {
            const h = new Date(r.timestamp).getHours();
            if (h >= 0 && h <= 5) buckets[0]++;
            else if (h >= 6 && h <= 10) buckets[1]++;
            else if (h >= 11 && h <= 12) buckets[2]++;
            else if (h >= 13 && h <= 16) buckets[3]++;
            else if (h >= 17 && h <= 18) buckets[4]++;
            else buckets[5]++;
        }
    });

    const maxVal = Math.max(...buckets, 1);
    const bestBucketIndex = buckets.indexOf(Math.max(...buckets)); 
    const hasData = history.some(r => r.type === 'TOMATO' && r.completed);

    // Simplified advice logic based on buckets
    let adviceKey = 'advice_none';
    if (hasData) {
       if (bestBucketIndex === 1) adviceKey = 'advice_morning'; // Morning
       else if (bestBucketIndex === 3) adviceKey = 'advice_afternoon'; // Afternoon
       else if (bestBucketIndex === 5 || bestBucketIndex === 0) adviceKey = 'advice_night'; // Night
       else adviceKey = 'advice_balanced';
    }

    return { buckets, bucketLabels, maxVal, bestBucketIndex, adviceKey, hasData };
  }, [history]);

  // --- Layer 4: Monthly Report (Tall) ---
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
    if (currentMonthDate.getMonth() === today.getMonth() && currentMonthDate.getFullYear() === today.getFullYear()) {
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

    return { chartData, maxChartVal: Math.max(maxChartVal, 5), totalTomatoes, avg, bestDayCount, bestDayDate };
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
        Weekly Avg: ${weeklyStats.avg}
        Best Time Bucket Index (0-5): ${goldenHourStats.bestBucketIndex} (0=Dawn, 1=Morning, 2=Noon, 3=Afternoon, 4=Eve, 5=Night)
    `;

    try {
        const result = await generateStatsSummary(context, lang);
        setAiSummary(result);
    } catch (e) {
        setAiSummary("Sorry, could not generate summary. Please check your API Key.");
    } finally {
        setIsGeneratingAi(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 animate-fade-in pb-32 overflow-y-auto no-scrollbar gap-4">
      
      {/* Clock */}
      <div className="flex justify-between items-center mt-1">
         <h2 className="text-2xl font-black text-gray-800 tracking-tighter">{t('stats_title', lang)}</h2>
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

      {/* 1. TODAY */}
      <section>
        <div className="grid grid-cols-2 gap-2">
            {/* Cards (Keeping existing Today style as it was okay, just ensure uniform height) */}
            <div className="bg-rose-50 border border-rose-100 p-3 rounded-[20px] h-24 relative overflow-hidden flex flex-col justify-between">
                <TomatoIcon className="absolute -bottom-3 -right-3 w-16 h-16 text-tomato-500 opacity-20 transform rotate-12" />
                <div className="relative z-10 mt-auto">
                    <span className="text-3xl font-black text-tomato-600 leading-none">{todayStats.tomatoes}</span>
                    <span className="text-[9px] font-bold text-tomato-900/60 uppercase block mt-1">{t('stats_today_tomatoes', lang)}</span>
                </div>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-[20px] h-24 relative overflow-hidden flex flex-col justify-between">
                <ClockIcon className="absolute -bottom-3 -right-3 w-16 h-16 text-indigo-500/10 transform rotate-12" />
                <div className="relative z-10 mt-auto">
                    <span className="text-3xl font-black text-indigo-600 leading-none">{formatDuration(todayStats.focusMinutes)}</span>
                    <span className="text-[9px] font-bold text-indigo-900/60 uppercase block mt-1">{t('stats_today_focus', lang)}</span>
                </div>
            </div>
            <div className="bg-[#FCCEB4] border border-orange-200 p-3 rounded-[20px] h-24 relative overflow-hidden flex flex-col justify-between">
                 <ThreeTomatoesIcon className="absolute -bottom-3 -right-3 w-16 h-12 text-red-600 opacity-20 transform -rotate-6" />
                <div className="relative z-10 mt-auto">
                     <span className="text-3xl font-black text-white drop-shadow-sm leading-none">{todayStats.streak}</span>
                    <span className="text-[9px] font-bold text-orange-900/70 uppercase block mt-1">{t('stats_today_streak', lang)}</span>
                </div>
            </div>
            <div className="bg-gray-300 border border-gray-200 p-3 rounded-[20px] h-24 relative overflow-hidden flex flex-col justify-between">
                <XIcon className="absolute -bottom-3 -right-3 w-16 h-16 text-gray-500/10 transform rotate-12" />
                <div className="relative z-10 mt-auto">
                     <div className="flex items-end gap-1">
                        <span className="text-3xl font-black text-gray-700 leading-none">{todayStats.interruptions}</span>
                        <HelpCircleIcon className="w-3 h-3 text-gray-500 mb-1" onClick={(e) => { e.stopPropagation(); setShowTooltip(!showTooltip); }}/>
                     </div>
                     <span className="text-[9px] font-bold text-gray-600 uppercase block mt-1">{t('stats_today_interrupted', lang)}</span>
                </div>
                {showTooltip && (
                    <div className="absolute inset-0 bg-gray-800/95 p-2 flex items-center justify-center text-center z-20 rounded-[20px]" onClick={() => setShowTooltip(false)}>
                        <p className="text-white text-[9px] leading-tight font-bold">{t('tooltip_interrupted', lang)}</p>
                    </div>
                )}
            </div>
        </div>
      </section>

      {/* 2. WEEKLY REPORT (Optimized Height & Interaction) */}
      <section>
        <div className="flex justify-between items-baseline mb-2 px-1">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('stats_week_title', lang)}</h3>
            <span className="text-[9px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">
                {t('stats_week_avg', lang)}: <span className="font-black text-sky-900">{weeklyStats.avg}</span>
            </span>
        </div>
        
        <div className="bg-[#ABD7FB] p-3 rounded-[24px] border border-blue-200 shadow-sm">
            {/* Increased Height to h-48 for better visibility */}
            <div className="bg-[#E3F2FD] rounded-xl p-3 shadow-sm border border-blue-100/50 h-48 relative">
                <div className="flex items-end justify-between h-full gap-2">
                    {weeklyStats.days.map((day, idx) => {
                        const heightPct = (day.count / weeklyStats.maxVal) * 100;
                        const isHovered = hoveredWeekDay === idx;
                        return (
                            <div 
                                key={idx} 
                                className="flex flex-col items-center flex-1 h-full justify-end group cursor-pointer relative"
                                onClick={() => setHoveredWeekDay(isHovered ? null : idx)}
                            >
                                {/* Tooltip on Click/Hover */}
                                {isHovered && (
                                    <div className="absolute -top-8 bg-blue-900 text-white text-[9px] px-2 py-1 rounded-md shadow-lg font-bold whitespace-nowrap z-20">
                                        {day.count} 🍅 ({day.mins}m)
                                    </div>
                                )}

                                <div 
                                    className={`w-full rounded-md transition-all duration-500 relative min-w-[8px] max-w-[20px] ${
                                        day.isToday ? 'bg-sky-600' : 'bg-sky-300 group-hover:bg-sky-400'
                                    }`}
                                    style={{ height: `${Math.max(heightPct, 4)}%` }} 
                                ></div>
                                <div className={`mt-2 text-[8px] font-black uppercase ${day.isToday ? 'text-sky-700' : 'text-sky-400'}`}>
                                    {t(day.dayLabelKey, lang)}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
      </section>

      {/* 3. GOLDEN HOUR (6 Buckets Logic) */}
      <section>
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('stats_focus_hours_title', lang)}</h3>
        <div className="bg-[#F3E282] rounded-[24px] p-4 border border-yellow-200 shadow-sm">
             <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-yellow-100 mb-3 h-40">
                <div className="flex items-end justify-between h-full gap-2">
                    {goldenHourStats.buckets.map((count, idx) => {
                        const heightPct = goldenHourStats.maxVal > 0 ? (count / goldenHourStats.maxVal) * 100 : 0;
                        const isBest = idx === goldenHourStats.bestBucketIndex && count > 0;
                        return (
                            <div key={idx} className="flex-1 flex flex-col justify-end h-full items-center gap-2">
                                <div className="text-[9px] font-bold text-yellow-800/50">{count > 0 ? count : ''}</div>
                                <div 
                                    className={`w-full max-w-[24px] rounded-t-md rounded-b-sm transition-all duration-500 ${isBest ? 'bg-yellow-500 shadow-md' : 'bg-yellow-200'}`}
                                    style={{ height: `${Math.max(4, heightPct)}%` }}
                                ></div>
                                <div className="text-[8px] font-bold text-gray-400 uppercase whitespace-nowrap">
                                    {lang === 'zh' ? goldenHourStats.bucketLabels[idx].zh : goldenHourStats.bucketLabels[idx].en}
                                </div>
                            </div>
                        )
                    })}
                </div>
             </div>
             
             <div className="p-3 bg-[#FFFDF0] rounded-xl text-[10px] font-bold text-yellow-900 text-center leading-relaxed border border-yellow-100 shadow-sm">
                 "{t(goldenHourStats.adviceKey, lang)}"
             </div>
        </div>
      </section>

      {/* 4. MONTHLY REPORT (Taller) */}
      <section>
         <div className="flex justify-between items-center mb-3 px-1">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('stats_month_title', lang)}</h3>
            <div className="flex items-center bg-white rounded-full p-0.5 border border-gray-100 shadow-sm scale-90 origin-right">
                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-50 rounded-full text-gray-400">
                    <ChevronLeftIcon className="w-3 h-3" />
                </button>
                <span className="mx-2 text-[10px] font-black text-gray-700 min-w-[70px] text-center">
                    {formatMonthYear(currentMonthDate, lang)}
                </span>
                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-50 rounded-full text-gray-400" disabled={currentMonthDate > new Date()}>
                    <ChevronRightIcon className="w-3 h-3" />
                </button>
            </div>
         </div>
         
         <div className="bg-[#FF8F2E] rounded-[24px] p-3 border border-[#e57d24] shadow-sm text-[#5c2b18]">
             {/* Chart Height increased */}
             <div className="bg-[#FFCC97] rounded-xl p-3 shadow-sm border border-white/20 mb-3 overflow-hidden h-40">
                <div className="overflow-x-auto no-scrollbar h-full flex items-end">
                    <div className="flex items-end gap-[3px] h-full min-w-[100%] w-max">
                        {monthlyStats.chartData.map((d, i) => {
                            const heightPct = (d.count / monthlyStats.maxChartVal) * 100;
                            const isBest = d.count === monthlyStats.bestDayCount && d.count > 0;
                            return (
                                <div key={i} className="w-4 flex flex-col justify-end h-full group relative flex-shrink-0">
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

             <div className="grid grid-cols-2 gap-3">
                 <div className="bg-[#FFCC97] p-2 rounded-xl flex flex-col items-center shadow-inner border border-white/10 h-20 justify-center">
                     <span className="text-2xl font-black text-[#5c2b18]">{monthlyStats.totalTomatoes}</span>
                     <span className="text-[8px] font-bold opacity-70 uppercase mt-1">{t('stats_month_total', lang)}</span>
                 </div>
                 <div className="bg-[#FFCC97] p-2 rounded-xl flex flex-col items-center shadow-inner border border-white/10 h-20 justify-center">
                     <span className="text-2xl font-black text-[#5c2b18]">{monthlyStats.avg}</span>
                     <span className="text-[8px] font-bold opacity-70 uppercase mt-1">{t('stats_month_daily_avg', lang)}</span>
                 </div>
             </div>
         </div>
      </section>

      {/* 5. HISTORY */}
      <section>
          <h3 className="text-[10px] font-black text-gray-400 uppercase mb-2 px-1 tracking-widest">{t('stats_history_title', lang)}</h3>
          <div className="bg-[#FF9BB3] p-5 rounded-[24px] flex justify-around items-center border border-pink-300 shadow-sm text-white h-32">
              <div className="flex flex-col items-center gap-1">
                   <div className="text-pink-500 bg-white p-2 rounded-xl shadow-sm"><CalendarIcon className="w-5 h-5" /></div>
                  <span className="text-2xl font-black text-white mt-1">{historyStats.dayStreak}</span>
                  <span className="text-[8px] font-bold text-white/80 uppercase">{t('stats_history_days', lang)}</span>
              </div>
               <div className="w-px h-12 bg-white/30"></div>
              <div className="flex flex-col items-center gap-1">
                   <div className="text-pink-500 bg-white p-2 rounded-xl shadow-sm"><HistoryFancyIcon className="w-5 h-5" /></div>
                   <span className="text-2xl font-black text-white mt-1">{historyStats.totalTomatoes}</span>
                  <span className="text-[8px] font-bold text-white/80 uppercase">{t('stats_history_count', lang)}</span>
              </div>
          </div>
      </section>

      {/* 6. AI SUMMARY (Taller) */}
      <section>
          <h3 className="text-[10px] font-black text-gray-400 uppercase mb-2 px-1 tracking-widest">{t('stats_ai_title', lang)}</h3>
          <div className="bg-[#9F9DF3] p-5 rounded-[24px] border border-indigo-300 shadow-sm relative overflow-hidden min-h-[180px] flex flex-col justify-center">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

             <div className="flex flex-col items-center text-center relative z-10">
                 <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#9F9DF3] shadow-cartoon mb-4 border border-indigo-100 transform -rotate-6">
                     <MagicIcon className="w-6 h-6" />
                 </div>
                 
                 {aiSummary ? (
                     <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl w-full text-xs font-bold text-indigo-900 leading-relaxed text-left animate-fade-in border border-indigo-100 shadow-sm min-h-[80px]">
                         {aiSummary}
                     </div>
                 ) : (
                     <p className="text-[11px] font-bold text-white/90 mb-4 max-w-[220px] leading-relaxed">
                        {t('stats_ai_placeholder', lang)}
                     </p>
                 )}

                 {!aiSummary && (
                     <button
                        onClick={handleGenerateSummary}
                        disabled={isGeneratingAi}
                        className={`mt-2 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-900/20 ${
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
