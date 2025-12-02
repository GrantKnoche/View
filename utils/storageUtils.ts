import { SessionRecord, UnlockedAchievement, Achievement } from '../types';
import { STORAGE_KEY_HISTORY, STORAGE_KEY_ACHIEVEMENTS, ACHIEVEMENTS_LIST } from '../constants';

export const saveSessionRecord = (record: SessionRecord) => {
  const existingHistoryStr = localStorage.getItem(STORAGE_KEY_HISTORY);
  const history: SessionRecord[] = existingHistoryStr ? JSON.parse(existingHistoryStr) : [];
  history.push(record);
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  return history;
};

export const getHistory = (): SessionRecord[] => {
  const str = localStorage.getItem(STORAGE_KEY_HISTORY);
  return str ? JSON.parse(str) : [];
};

export const getUnlockedAchievements = (): UnlockedAchievement[] => {
  const str = localStorage.getItem(STORAGE_KEY_ACHIEVEMENTS);
  return str ? JSON.parse(str) : [];
};

export const checkAndUnlockAchievements = (fullHistory: SessionRecord[]): Achievement[] => {
  const unlocked = getUnlockedAchievements();
  const newlyUnlocked: Achievement[] = [];
  const unlockedIds = new Set(unlocked.map(u => u.id));

  ACHIEVEMENTS_LIST.forEach(ach => {
    if (!unlockedIds.has(ach.id)) {
      if (ach.condition(fullHistory)) {
        newlyUnlocked.push(ach);
        unlocked.push({ id: ach.id, unlockedAt: Date.now() });
      }
    }
  });

  if (newlyUnlocked.length > 0) {
    localStorage.setItem(STORAGE_KEY_ACHIEVEMENTS, JSON.stringify(unlocked));
  }

  return newlyUnlocked;
};
