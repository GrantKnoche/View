

import { SessionRecord } from "../types";
import { Language } from "../types";

/**
 * Formats seconds into MM:SS string
 */
export const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Get today's date string for storage key (YYYY-MM-DD)
 */
export const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Format minutes into Xh Ym
 */
export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

// Date helpers for stats
export const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

export const getStartOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
  return new Date(date.setDate(diff));
};

export const isSameWeek = (d1: Date, d2: Date) => {
    const oneJan = new Date(d1.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((d1.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    const week1 = Math.ceil((d1.getDay() + 1 + numberOfDays) / 7);

    const oneJan2 = new Date(d2.getFullYear(), 0, 1);
    const numberOfDays2 = Math.floor((d2.getTime() - oneJan2.getTime()) / (24 * 60 * 60 * 1000));
    const week2 = Math.ceil((d2.getDay() + 1 + numberOfDays2) / 7);
    
    return d1.getFullYear() === d2.getFullYear() && week1 === week2;
};

export const isSameMonth = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
};

export const getHourOfDay = (timestamp: number): number => {
    return new Date(timestamp).getHours();
};

/**
 * Calculate the streak of consecutive days with at least 1 completed tomato.
 */
export const calculateDayStreak = (history: SessionRecord[]): number => {
  if (history.length === 0) return 0;
  
  // Get all unique dates with completed tomatoes
  const completedDates = new Set(
    history
      .filter(h => h.completed && h.type === 'TOMATO')
      .map(h => new Date(h.timestamp).toDateString())
  );

  let streak = 0;
  const today = new Date();
  
  // Check today first. If no tomato today, check yesterday to start streak.
  let checkDate = new Date(today);
  
  while (true) {
    if (completedDates.has(checkDate.toDateString())) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      if (isSameDay(checkDate, today)) {
         checkDate.setDate(checkDate.getDate() - 1);
         continue;
      }
      break;
    }
  }
  return streak;
};

/**
 * Calculate longest streak of completed tomatoes within a specific day (or current session)
 */
export const calculateSessionStreak = (history: SessionRecord[], dateCheck: Date): number => {
  const daysRecords = history
    .filter(h => isSameDay(new Date(h.timestamp), dateCheck) && h.type === 'TOMATO')
    .sort((a, b) => a.timestamp - b.timestamp);

  let maxStreak = 0;
  let currentStreak = 0;

  for (const record of daysRecords) {
    if (record.completed) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  return maxStreak;
};


// --- MONTHLY HELPERS ---

export const getStartOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const getEndOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

export const formatMonthYear = (d: Date, lang: Language) => {
  if (lang === 'zh') {
    return `${d.getFullYear()}年 ${d.getMonth() + 1}月`;
  }
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export const getDailyTomatoesInRange = (history: SessionRecord[], start: Date, end: Date) => {
  // Normalize dates
  const s = new Date(start); s.setHours(0,0,0,0);
  const e = new Date(end); e.setHours(23,59,59,999);
  
  const records = history.filter(r => {
    const t = new Date(r.timestamp);
    return t >= s && t <= e && r.type === 'TOMATO' && r.completed;
  });

  const counts: Record<string, number> = {};
  records.forEach(r => {
    const key = new Date(r.timestamp).toDateString();
    counts[key] = (counts[key] || 0) + 1;
  });
  
  return counts;
};

export const getDaysInMonth = (d: Date) => {
    const date = new Date(d.getFullYear(), d.getMonth(), 1);
    const days = [];
    while (date.getMonth() === d.getMonth()) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return days;
};