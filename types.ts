

export enum AppMode {
  POMODORO = 'POMODORO', // Countdown
  FLOW = 'FLOW',         // Count-up
}

export enum TimerStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  RESTING = 'RESTING',
  STREAK_PROTECTION = 'STREAK_PROTECTION', // New status: 2 minute warning to keep streak
  COMPLETED = 'COMPLETED'
}

export interface PomodoroConfig {
  tomatoesToComplete: number; // User selected batch size
}

export interface DailyStats {
  completedTomatoes: number;
  flowMinutes: number;
}

export type ThemeColor = 'red' | 'green' | 'blue';

export type Language = 'en' | 'zh';

// Added USER view
export type AppView = 'TIMER' | 'STATS' | 'ACHIEVEMENTS' | 'USER';

export interface SessionRecord {
  id: string;
  timestamp: number; // Date.now()
  type: 'TOMATO' | 'FLOW';
  durationMinutes: number;
  completed: boolean; // false if cancelled (pomodoro only)
}

// Achievement System Types
export type AchievementCategory = 'QUANTITY' | 'CONTINUITY' | 'HABIT' | 'GROWTH' | 'FUN';

export type AchievementRarity = 'COMMON' | 'ADVANCED' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface Achievement {
  id: string;
  category: AchievementCategory;
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7; // Rainbow Level: 1=Red, 7=Purple
  titleKey: string;
  descKey: string;
  icon: string; // Emoji or image char
  condition: (history: SessionRecord[]) => boolean;
  progress: (history: SessionRecord[]) => { current: number; total: number };
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
}

// UI Feedback States
export interface FeedbackState {
  type: 'REWARD' | 'BROKEN' | 'ENCOURAGE' | 'ERROR' | 'STREAK_LOST' | null;
  message?: string;
  extraData?: any;
}

export interface CustomTheme {
  backgroundImage: string;
  prompt: string;
}