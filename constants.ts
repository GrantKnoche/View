


import { Achievement, SessionRecord } from './types';
import { calculateDayStreak, calculateSessionStreak, isSameDay, getHourOfDay } from './utils/timeUtils';

export const TOMATO_DURATION_MINUTES = 25;
export const BASE_REST_MINUTES = 5;
export const BONUS_REST_MINUTES = 5; // The 'X' in the formula
export const ONE_MINUTE_SECONDS = 60;
export const INTERRUPTION_THRESHOLD_SECONDS = 120; // 2 Minutes
export const STREAK_PROTECTION_SECONDS = 120; // 2 Minutes to keep streak

// Flow mode: How many minutes equal 1 tomato reward
export const FLOW_TOMATO_THRESHOLD_MINUTES = 25;

export const STORAGE_KEY_STATS = 'pomodoro_friends_stats_v1';
export const STORAGE_KEY_DATE = 'pomodoro_friends_date_v1';
export const STORAGE_KEY_HISTORY = 'pomodoro_friends_history_v2';
export const STORAGE_KEY_ACHIEVEMENTS = 'pomodoro_friends_achievements_v4'; // Bumped version for new system
export const STORAGE_KEY_LANG = 'pomodoro_friends_lang_v1';

// --- Achievement System Definition ---

const QUANTITY_MILESTONES = [
  { val: 1, lvl: 1 }, { val: 5, lvl: 1 }, { val: 10, lvl: 1 },
  { val: 30, lvl: 2 }, { val: 50, lvl: 2 }, { val: 70, lvl: 2 },
  { val: 100, lvl: 3 }, { val: 150, lvl: 3 }, { val: 200, lvl: 3 },
  { val: 300, lvl: 4 }, { val: 400, lvl: 4 }, { val: 600, lvl: 4 },
  { val: 800, lvl: 5 }, { val: 1000, lvl: 5 }, { val: 1250, lvl: 5 },
  { val: 1500, lvl: 6 }, { val: 1750, lvl: 6 }, { val: 2000, lvl: 6 },
  { val: 3000, lvl: 7 }, { val: 5000, lvl: 7 }
] as const;

const quantityAchievements: Achievement[] = QUANTITY_MILESTONES.map((m) => ({
  id: `QTY_${m.val}`,
  category: 'QUANTITY',
  level: m.lvl as any,
  titleKey: `ach_qty_${m.val}_title`,
  descKey: `ach_qty_generic_desc`,
  icon: m.val >= 1000 ? 'ICON_CROWN' : (m.val >= 100 ? 'ICON_TROPHY' : 'ICON_TOMATO'),
  condition: (history) => history.filter(h => h.type === 'TOMATO' && h.completed).length >= m.val,
  progress: (history) => ({ current: history.filter(h => h.type === 'TOMATO' && h.completed).length, total: m.val })
}));

const CONTINUITY_LIST: Achievement[] = [
  // Session Streaks
  { id: 'CONT_S_2', category: 'CONTINUITY', level: 1, titleKey: 'ach_streak_2', descKey: 'ach_streak_desc', icon: 'ICON_FIRE', 
    condition: (h) => calculateSessionStreak(h, new Date()) >= 2, progress: (h) => ({ current: calculateSessionStreak(h, new Date()), total: 2 }) },
  { id: 'CONT_S_3', category: 'CONTINUITY', level: 2, titleKey: 'ach_streak_3', descKey: 'ach_streak_desc', icon: 'ICON_FIRE', 
    condition: (h) => calculateSessionStreak(h, new Date()) >= 3, progress: (h) => ({ current: calculateSessionStreak(h, new Date()), total: 3 }) },
  { id: 'CONT_S_4', category: 'CONTINUITY', level: 3, titleKey: 'ach_streak_4', descKey: 'ach_streak_desc', icon: 'ICON_ZAP', 
    condition: (h) => calculateSessionStreak(h, new Date()) >= 4, progress: (h) => ({ current: calculateSessionStreak(h, new Date()), total: 4 }) },
  { id: 'CONT_S_5', category: 'CONTINUITY', level: 4, titleKey: 'ach_streak_5', descKey: 'ach_streak_desc', icon: 'ICON_ZAP', 
    condition: (h) => calculateSessionStreak(h, new Date()) >= 5, progress: (h) => ({ current: calculateSessionStreak(h, new Date()), total: 5 }) },
  { id: 'CONT_S_6', category: 'CONTINUITY', level: 5, titleKey: 'ach_streak_6', descKey: 'ach_streak_desc', icon: 'ICON_TARGET', 
    condition: (h) => calculateSessionStreak(h, new Date()) >= 6, progress: (h) => ({ current: calculateSessionStreak(h, new Date()), total: 6 }) },
  { id: 'CONT_S_7', category: 'CONTINUITY', level: 6, titleKey: 'ach_streak_7', descKey: 'ach_streak_desc', icon: 'ICON_TARGET', 
    condition: (h) => calculateSessionStreak(h, new Date()) >= 7, progress: (h) => ({ current: calculateSessionStreak(h, new Date()), total: 7 }) },
  { id: 'CONT_S_8', category: 'CONTINUITY', level: 7, titleKey: 'ach_streak_8', descKey: 'ach_streak_desc', icon: 'ICON_CROWN', 
    condition: (h) => calculateSessionStreak(h, new Date()) >= 8, progress: (h) => ({ current: calculateSessionStreak(h, new Date()), total: 8 }) },

  // Daily Ranks (Tomatoes per day)
  { id: 'RANK_4', category: 'GROWTH', level: 2, titleKey: 'ach_rank_4', descKey: 'ach_rank_desc', icon: 'ICON_SPROUT',
    condition: (h) => { const today = new Date(); return h.filter(r => isSameDay(new Date(r.timestamp), today) && r.completed).length >= 4 },
    progress: (h) => ({ current: h.filter(r => isSameDay(new Date(r.timestamp), new Date()) && r.completed).length, total: 4 }) },
  { id: 'RANK_8', category: 'GROWTH', level: 4, titleKey: 'ach_rank_8', descKey: 'ach_rank_desc', icon: 'ICON_TOMATO',
    condition: (h) => { const today = new Date(); return h.filter(r => isSameDay(new Date(r.timestamp), today) && r.completed).length >= 8 },
    progress: (h) => ({ current: h.filter(r => isSameDay(new Date(r.timestamp), new Date()) && r.completed).length, total: 8 }) },
  { id: 'RANK_12', category: 'GROWTH', level: 6, titleKey: 'ach_rank_12', descKey: 'ach_rank_desc', icon: 'ICON_BASKET',
    condition: (h) => { const today = new Date(); return h.filter(r => isSameDay(new Date(r.timestamp), today) && r.completed).length >= 12 },
    progress: (h) => ({ current: h.filter(r => isSameDay(new Date(r.timestamp), new Date()) && r.completed).length, total: 12 }) },
  { id: 'RANK_16', category: 'GROWTH', level: 7, titleKey: 'ach_rank_16', descKey: 'ach_rank_desc', icon: 'ICON_MAGIC',
    condition: (h) => { const today = new Date(); return h.filter(r => isSameDay(new Date(r.timestamp), today) && r.completed).length >= 16 },
    progress: (h) => ({ current: h.filter(r => isSameDay(new Date(r.timestamp), new Date()) && r.completed).length, total: 16 }) },
];

const HABIT_LIST: Achievement[] = [
  {
    id: 'HABIT_EARLY', category: 'HABIT', level: 3, titleKey: 'ach_habit_early_title', descKey: 'ach_habit_early_desc', icon: 'ICON_SUN',
    // 06:00 - 09:00 (Exclusive of 9, inclusive of 6) & count > 0
    condition: (history) => history.some(h => { const hr = getHourOfDay(h.timestamp); return h.completed && hr >= 6 && hr < 9; }),
    progress: (history) => ({ current: history.some(h => { const hr = getHourOfDay(h.timestamp); return h.completed && hr >= 6 && hr < 9; }) ? 1 : 0, total: 1 })
  },
  {
    id: 'HABIT_NIGHT', category: 'HABIT', level: 3, titleKey: 'ach_habit_night_title', descKey: 'ach_habit_night_desc', icon: 'ICON_MOON',
    // 23:00 - 04:00 & count > 0
    condition: (history) => history.some(h => { const hr = getHourOfDay(h.timestamp); return h.completed && (hr >= 23 || hr < 4); }),
    progress: (history) => ({ current: history.some(h => { const hr = getHourOfDay(h.timestamp); return h.completed && (hr >= 23 || hr < 4); }) ? 1 : 0, total: 1 })
  },
  {
    id: 'HABIT_FOCUS_MASTER', category: 'HABIT', level: 5, titleKey: 'ach_focus_master_title', descKey: 'ach_focus_master_desc', icon: 'ICON_SHIELD',
    condition: (history) => {
        // Scan all days to find ANY day with > 5 completed and 0 broken
        const days: Record<string, { comp: number; broken: number }> = {};
        history.forEach(r => {
             if (r.type !== 'TOMATO') return;
             const k = new Date(r.timestamp).toDateString();
             if (!days[k]) days[k] = { comp: 0, broken: 0 };
             if (r.completed) days[k].comp++;
             else days[k].broken++;
        });
        return Object.values(days).some(d => d.comp > 5 && d.broken === 0);
    },
    progress: (history) => ({ current: 0, total: 1 }) // Binary
  }
];

const FUN_LIST: Achievement[] = [
  {
    id: 'FUN_WEEKEND', category: 'FUN', level: 3, titleKey: 'ach_weekend_title', descKey: 'ach_weekend_desc', icon: 'ICON_CALENDAR',
    // (day === 0 || day === 6) && todayCount > 5
    condition: (history) => {
        const days: Record<string, { count: number; day: number }> = {};
        history.forEach(r => {
             if (r.type !== 'TOMATO' || !r.completed) return;
             const d = new Date(r.timestamp);
             const k = d.toDateString();
             if (!days[k]) days[k] = { count: 0, day: d.getDay() };
             days[k].count++;
        });
        return Object.values(days).some(d => (d.day === 0 || d.day === 6) && d.count > 5);
    },
    progress: (h) => ({ current: 0, total: 1 })
  },
  {
    id: 'FUN_MONDAY', category: 'FUN', level: 4, titleKey: 'ach_monday_title', descKey: 'ach_monday_desc', icon: 'ICON_LEAF',
    // day === 1 && todayCount > 8
    condition: (history) => {
        const days: Record<string, { count: number; day: number }> = {};
        history.forEach(r => {
             if (r.type !== 'TOMATO' || !r.completed) return;
             const d = new Date(r.timestamp);
             const k = d.toDateString();
             if (!days[k]) days[k] = { count: 0, day: d.getDay() };
             days[k].count++;
        });
        return Object.values(days).some(d => d.day === 1 && d.count > 8);
    },
    progress: (h) => ({ current: 0, total: 1 })
  }
];

export const ACHIEVEMENTS_LIST: Achievement[] = [
  ...quantityAchievements,
  ...CONTINUITY_LIST,
  ...HABIT_LIST,
  ...FUN_LIST
];