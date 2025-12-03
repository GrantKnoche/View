


import { Achievement, SessionRecord } from './types';
import { calculateDayStreak, calculateSessionStreak, isSameDay, getHourOfDay } from './utils/timeUtils';

export const TOMATO_DURATION_MINUTES = 25;
export const BASE_REST_MINUTES = 5;
export const BONUS_REST_MINUTES = 5; // The 'X' in the formula
export const ONE_MINUTE_SECONDS = 60;
export const INTERRUPTION_THRESHOLD_SECONDS = 120; // 2 Minutes

// Flow mode: How many minutes equal 1 tomato reward
export const FLOW_TOMATO_THRESHOLD_MINUTES = 25;

export const STORAGE_KEY_STATS = 'pomodoro_friends_stats_v1';
export const STORAGE_KEY_DATE = 'pomodoro_friends_date_v1';
export const STORAGE_KEY_HISTORY = 'pomodoro_friends_history_v2';
export const STORAGE_KEY_ACHIEVEMENTS = 'pomodoro_friends_achievements_v3'; // Version 3
export const STORAGE_KEY_LANG = 'pomodoro_friends_lang_v1';

// --- Achievement System Definition ---

export const ACHIEVEMENTS_LIST: Achievement[] = [
  // --- QUANTITY (Growth) ---
  {
    id: 'QTY_1',
    category: 'QUANTITY',
    rarity: 'COMMON',
    titleKey: 'ach_qty_1_title',
    descKey: 'ach_qty_1_desc',
    icon: 'ICON_SPROUT',
    condition: (history) => history.filter(h => h.type === 'TOMATO' && h.completed).length >= 1,
    progress: (history) => ({ current: history.filter(h => h.type === 'TOMATO' && h.completed).length, total: 1 })
  },
  {
    id: 'QTY_10',
    category: 'QUANTITY',
    rarity: 'COMMON',
    titleKey: 'ach_qty_10_title',
    descKey: 'ach_qty_10_desc',
    icon: 'ICON_BASKET',
    condition: (history) => history.filter(h => h.type === 'TOMATO' && h.completed).length >= 10,
    progress: (history) => ({ current: history.filter(h => h.type === 'TOMATO' && h.completed).length, total: 10 })
  },
  {
    id: 'QTY_50',
    category: 'QUANTITY',
    rarity: 'ADVANCED',
    titleKey: 'ach_qty_50_title',
    descKey: 'ach_qty_50_desc',
    icon: 'ICON_LEAF',
    condition: (history) => history.filter(h => h.type === 'TOMATO' && h.completed).length >= 50,
    progress: (history) => ({ current: history.filter(h => h.type === 'TOMATO' && h.completed).length, total: 50 })
  },
  {
    id: 'QTY_100',
    category: 'QUANTITY',
    rarity: 'RARE',
    titleKey: 'ach_qty_100_title',
    descKey: 'ach_qty_100_desc',
    icon: 'ICON_TOMATO',
    condition: (history) => history.filter(h => h.type === 'TOMATO' && h.completed).length >= 100,
    progress: (history) => ({ current: history.filter(h => h.type === 'TOMATO' && h.completed).length, total: 100 })
  },
  {
    id: 'QTY_500',
    category: 'QUANTITY',
    rarity: 'EPIC',
    titleKey: 'ach_qty_500_title',
    descKey: 'ach_qty_500_desc',
    icon: 'ICON_CROWN',
    condition: (history) => history.filter(h => h.type === 'TOMATO' && h.completed).length >= 500,
    progress: (history) => ({ current: history.filter(h => h.type === 'TOMATO' && h.completed).length, total: 500 })
  },
  {
    id: 'QTY_1000',
    category: 'QUANTITY',
    rarity: 'LEGENDARY',
    titleKey: 'ach_qty_1000_title',
    descKey: 'ach_qty_1000_desc',
    icon: 'ICON_TROPHY',
    condition: (history) => history.filter(h => h.type === 'TOMATO' && h.completed).length >= 1000,
    progress: (history) => ({ current: history.filter(h => h.type === 'TOMATO' && h.completed).length, total: 1000 })
  },

  // --- CONTINUITY (Streak & Focus) ---
  {
    id: 'CONT_SESSION_2',
    category: 'CONTINUITY',
    rarity: 'COMMON',
    titleKey: 'ach_cont_s2_title',
    descKey: 'ach_cont_s2_desc',
    icon: 'ICON_FIRE',
    condition: (history) => calculateSessionStreak(history, new Date()) >= 2,
    progress: (history) => ({ current: calculateSessionStreak(history, new Date()), total: 2 })
  },
  {
    id: 'CONT_SESSION_4',
    category: 'CONTINUITY',
    rarity: 'ADVANCED',
    titleKey: 'ach_cont_s4_title',
    descKey: 'ach_cont_s4_desc',
    icon: 'ICON_ZAP',
    condition: (history) => calculateSessionStreak(history, new Date()) >= 4,
    progress: (history) => ({ current: calculateSessionStreak(history, new Date()), total: 4 })
  },
  {
    id: 'CONT_SESSION_8',
    category: 'CONTINUITY',
    rarity: 'EPIC',
    titleKey: 'ach_cont_s8_title',
    descKey: 'ach_cont_s8_desc',
    icon: 'ICON_TARGET',
    condition: (history) => calculateSessionStreak(history, new Date()) >= 8,
    progress: (history) => ({ current: calculateSessionStreak(history, new Date()), total: 8 })
  },
  {
    id: 'CONT_DAY_3',
    category: 'CONTINUITY',
    rarity: 'COMMON',
    titleKey: 'ach_cont_d3_title',
    descKey: 'ach_cont_d3_desc',
    icon: 'ICON_SEED',
    condition: (history) => calculateDayStreak(history) >= 3,
    progress: (history) => ({ current: calculateDayStreak(history), total: 3 })
  },
  {
    id: 'CONT_DAY_7',
    category: 'CONTINUITY',
    rarity: 'ADVANCED',
    titleKey: 'ach_cont_d7_title',
    descKey: 'ach_cont_d7_desc',
    icon: 'ICON_TREE',
    condition: (history) => calculateDayStreak(history) >= 7,
    progress: (history) => ({ current: calculateDayStreak(history), total: 7 })
  },
  {
    id: 'CONT_DAY_14',
    category: 'CONTINUITY',
    rarity: 'RARE',
    titleKey: 'ach_cont_d14_title',
    descKey: 'ach_cont_d14_desc',
    icon: 'ICON_MEDAL',
    condition: (history) => calculateDayStreak(history) >= 14,
    progress: (history) => ({ current: calculateDayStreak(history), total: 14 })
  },
  {
    id: 'CONT_DAY_30',
    category: 'CONTINUITY',
    rarity: 'EPIC',
    titleKey: 'ach_cont_d30_title',
    descKey: 'ach_cont_d30_desc',
    icon: 'ICON_CALENDAR',
    condition: (history) => calculateDayStreak(history) >= 30,
    progress: (history) => ({ current: calculateDayStreak(history), total: 30 })
  },

  // --- HABIT & QUALITY ---
  {
    id: 'HABIT_EARLY',
    category: 'HABIT',
    rarity: 'RARE',
    titleKey: 'ach_habit_early_title',
    descKey: 'ach_habit_early_desc',
    icon: 'ICON_SUN',
    condition: (history) => history.some(h => {
        const hour = getHourOfDay(h.timestamp);
        return h.completed && hour >= 5 && hour < 8;
    }),
    progress: (history) => ({ current: history.some(h => {
        const hour = getHourOfDay(h.timestamp);
        return h.completed && hour >= 5 && hour < 8;
    }) ? 1 : 0, total: 1 })
  },
  {
    id: 'HABIT_NIGHT',
    category: 'HABIT',
    rarity: 'RARE',
    titleKey: 'ach_habit_night_title',
    descKey: 'ach_habit_night_desc',
    icon: 'ICON_MOON',
    condition: (history) => history.some(h => {
        const hour = getHourOfDay(h.timestamp);
        return h.completed && (hour >= 22 || hour < 2);
    }),
    progress: (history) => ({ current: history.some(h => {
        const hour = getHourOfDay(h.timestamp);
        return h.completed && (hour >= 22 || hour < 2);
    }) ? 1 : 0, total: 1 })
  },
  {
    id: 'QUALITY_ZERO_INT',
    category: 'HABIT',
    rarity: 'EPIC',
    titleKey: 'ach_qual_zero_title',
    descKey: 'ach_qual_zero_desc',
    icon: 'ICON_SHIELD',
    condition: (history) => {
        const today = new Date();
        const todays = history.filter(h => isSameDay(new Date(h.timestamp), today) && h.type === 'TOMATO');
        const completed = todays.filter(h => h.completed).length;
        const interrupted = todays.filter(h => !h.completed).length;
        // Condition: At least 3 tomatoes completed and 0 interruptions
        return completed >= 3 && interrupted === 0;
    },
    progress: (history) => {
        const today = new Date();
        const todays = history.filter(h => isSameDay(new Date(h.timestamp), today) && h.type === 'TOMATO');
        const completed = todays.filter(h => h.completed).length;
        const interrupted = todays.filter(h => !h.completed).length;
        const isFail = interrupted > 0;
        return { current: isFail ? 0 : Math.min(completed, 3), total: 3 };
    }
  },
  {
    id: 'GROWTH_3_TIMES',
    category: 'GROWTH',
    rarity: 'ADVANCED',
    titleKey: 'ach_growth_3_title',
    descKey: 'ach_growth_3_desc',
    icon: 'ICON_HEART',
    condition: (history) => {
        // Simple logic: Completed 3+ tomatoes today
        const today = new Date();
        return history.filter(h => isSameDay(new Date(h.timestamp), today) && h.completed).length >= 3;
    },
    progress: (history) => ({ current: history.filter(h => isSameDay(new Date(h.timestamp), new Date()) && h.completed).length, total: 3 })
  }
];
