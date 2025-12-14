
import React, { useEffect, useState, useMemo } from 'react';
import { UnlockedAchievement, Language, AchievementCategory } from '../types';
import { ACHIEVEMENTS_LIST } from '../constants';
import { getHistory } from '../utils/storageUtils';
import { t } from '../utils/i18n';
import { playClickSound } from '../utils/soundUtils';
import { 
  TrophyIcon, SproutIcon, BasketIcon, LeafIcon, TomatoIcon, CrownIcon, 
  FireIcon, ZapIcon, TargetIcon, SeedIcon, TreeIcon, MedalIcon, CalendarIcon, 
  SunIcon, MoonIcon, ShieldIcon, HeartIcon, MuseumIcon, HelpCircleIcon, MagicIcon
} from './Icons';

interface AchievementsViewProps {
  unlocked: UnlockedAchievement[];
  lang: Language;
}

// 7-Level Rainbow Palette (Claymorphism Style)
const LEVEL_THEMES: Record<number, string> = {
  1: 'bg-rose-50 border-rose-200 text-rose-800 icon-rose-500', 
  2: 'bg-orange-50 border-orange-200 text-orange-800 icon-orange-500', 
  3: 'bg-amber-50 border-amber-200 text-amber-800 icon-amber-500', // Yellow/Amber
  4: 'bg-emerald-50 border-emerald-200 text-emerald-800 icon-emerald-500',
  5: 'bg-cyan-50 border-cyan-200 text-cyan-800 icon-cyan-500',
  6: 'bg-blue-50 border-blue-200 text-blue-800 icon-blue-500',
  7: 'bg-purple-50 border-purple-200 text-purple-800 icon-purple-500',
};

// Fallback for icons
const ICON_MAP: Record<string, React.FC<{className?: string}>> = {
  'ICON_SPROUT': SproutIcon,
  'ICON_BASKET': BasketIcon,
  'ICON_LEAF': LeafIcon,
  'ICON_TOMATO': TomatoIcon,
  'ICON_CROWN': CrownIcon,
  'ICON_TROPHY': TrophyIcon,
  'ICON_FIRE': FireIcon,
  'ICON_ZAP': ZapIcon,
  'ICON_TARGET': TargetIcon,
  'ICON_SEED': SeedIcon,
  'ICON_TREE': TreeIcon,
  'ICON_MEDAL': MedalIcon,
  'ICON_CALENDAR': CalendarIcon,
  'ICON_SUN': SunIcon,
  'ICON_MOON': MoonIcon,
  'ICON_SHIELD': ShieldIcon,
  'ICON_HEART': HeartIcon,
  'ICON_MAGIC': MagicIcon,
};

// Comprehensive Translations
const LOCAL_ACH_TRANS: Record<string, Record<Language, string>> = {
    // Quantity Milestones
    'ach_qty_1_title': { en: 'Tiny Sprout', zh: '萌芽的小番茄' },
    'ach_qty_5_title': { en: 'Baby Steps', zh: '小小起步' },
    'ach_qty_10_title': { en: 'First Basket', zh: '初学者的第一篮' },
    'ach_qty_30_title': { en: 'Getting Serious', zh: '渐入佳境' },
    'ach_qty_50_title': { en: 'Steady Growth', zh: '稳定成长' },
    'ach_qty_70_title': { en: 'Hard Worker', zh: '勤奋的番茄' },
    'ach_qty_100_title': { en: 'Tomato Expert', zh: '番茄达人' },
    'ach_qty_150_title': { en: 'Dedicated', zh: '专注之心' },
    'ach_qty_200_title': { en: 'Mastery', zh: '大师之路' },
    'ach_qty_300_title': { en: 'Focus Ninja', zh: '专注忍者' },
    'ach_qty_400_title': { en: 'Unstoppable', zh: '势不可挡' },
    'ach_qty_500_title': { en: 'Time Farmer', zh: '时间的耕耘者' },
    'ach_qty_600_title': { en: 'Veteran', zh: '身经百战' },
    'ach_qty_800_title': { en: 'Elite', zh: '精英番茄' },
    'ach_qty_1000_title': { en: 'Living Legend', zh: '专注传奇' },
    'ach_qty_1250_title': { en: 'Titan', zh: '泰坦巨人' },
    'ach_qty_1500_title': { en: 'Time Lord', zh: '时间领主' },
    'ach_qty_1750_title': { en: 'Demigod', zh: '半神' },
    'ach_qty_2000_title': { en: 'Grandmaster', zh: '一代宗师' },
    'ach_qty_3000_title': { en: 'Cosmic Focus', zh: '宇宙级专注' },
    'ach_qty_5000_title': { en: 'Eternal Flow', zh: '永恒心流' },

    'ach_qty_generic_desc': { en: 'Accumulate completed tomatoes.', zh: '累计完成番茄数量。' },

    // Streak (Session)
    'ach_streak_2': { en: 'Double Tap', zh: '双连击' },
    'ach_streak_3': { en: 'Hat Trick', zh: '帽子戏法' },
    'ach_streak_4': { en: 'On Fire', zh: '火力全开' },
    'ach_streak_5': { en: 'In The Zone', zh: '进入状态' },
    'ach_streak_6': { en: 'Flow Master', zh: '心流大师' },
    'ach_streak_7': { en: 'Unbreakable', zh: '坚不可摧' },
    'ach_streak_8': { en: 'Godlike', zh: '超神' },
    'ach_streak_desc': { en: 'Tomatoes in a row.', zh: '连续完成番茄。' },

    // Daily Ranks
    'ach_rank_4': { en: 'Sprout Rank', zh: '🌱 萌芽段位' },
    'ach_rank_8': { en: 'Ripe Rank', zh: '🍅 熟透段位' },
    'ach_rank_12': { en: 'Juicy Rank', zh: '🥫 多汁段位' },
    'ach_rank_16': { en: 'Infinity Rank', zh: '🚀 永动段位' },
    'ach_rank_desc': { en: 'Tomatoes in one day.', zh: '单日完成番茄数。' },

    // Habits
    'ach_habit_early_title': { en: 'Early Bird', zh: '🌅 早起鸟' },
    'ach_habit_early_desc': { en: 'Focus between 6:00-9:00.', zh: '一日之计在于晨，在 6:00-9:00 间完成专注。' },
    
    'ach_habit_night_title': { en: 'Night Owl', zh: '🦉 夜猫子' },
    'ach_habit_night_desc': { en: 'Focus between 23:00-04:00.', zh: '深夜是灵感的源泉，在 23:00-04:00 间完成专注。' },
    
    'ach_focus_master_title': { en: 'Absolute Defense', zh: '🛡️ 绝对防御' },
    'ach_focus_master_desc': { en: '>5 Tomatoes, 0 Interrupts.', zh: '今日完成超过 5 个番茄且 0 次中断，完美的专注力。' },

    // Fun Times
    'ach_weekend_title': { en: 'Weekend Warrior', zh: '📅 周末战士' },
    'ach_weekend_desc': { en: 'Weekend: >5 tomatoes.', zh: '周末也不忘自我提升，完成 5 个番茄。' },

    'ach_monday_title': { en: 'Monday Hero', zh: '💪 周一拯救者' },
    'ach_monday_desc': { en: 'Monday: >8 tomatoes.', zh: '战胜周一综合症，强势完成 8 个番茄。' },
};

// Helper to get translation with fallback
const getAchText = (key: string, lang: Language, contextVal?: number) => {
    let text = key;
    if (LOCAL_ACH_TRANS[key]) {
        text = LOCAL_ACH_TRANS[key][lang];
    } else {
        // Fallback to global t() if not found locally
        const globalT = t(key, lang);
        if (globalT !== key) text = globalT;
    }

    // Dynamic replacement for generic descriptions
    if (text === 'ach_qty_generic_desc' || key === 'ach_qty_generic_desc') {
        return lang === 'zh' ? `累计完成 ${contextVal} 个番茄。` : `Complete ${contextVal} tomatoes.`;
    }

    if (text === 'Tomatoes in a row.' || text === '连续完成番茄。') {
        return lang === 'zh' ? `连续完成 ${contextVal} 个番茄。` : `Complete ${contextVal} tomatoes in a row.`;
    }

    if (text === 'Tomatoes in one day.' || text === '单日完成番茄数。') {
        return lang === 'zh' ? `单日完成 ${contextVal} 个番茄。` : `Complete ${contextVal} tomatoes in one day.`;
    }

    return text;
};

export const AchievementsView: React.FC<AchievementsViewProps> = ({ unlocked, lang }) => {
  const unlockedIds = useMemo(() => new Set(unlocked.map(u => u.id)), [unlocked]);
  const [history, setHistory] = useState(getHistory());
  const [activeTab, setActiveTab] = useState<AchievementCategory | 'ALL'>('ALL');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const displayedAchievements = useMemo(() => {
    return ACHIEVEMENTS_LIST.filter(ach => 
      activeTab === 'ALL' || ach.category === activeTab
    );
  }, [activeTab]);

  const changeTab = (tab: AchievementCategory | 'ALL') => {
      playClickSound();
      setActiveTab(tab);
  }

  const TabButton = ({ id, label }: { id: AchievementCategory | 'ALL', label: string }) => (
    <button
      onClick={() => changeTab(id)}
      className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all active:scale-95 whitespace-nowrap ${
        activeTab === id 
        ? 'bg-tomato-500 text-white shadow-clay-btn' 
        : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100 shadow-sm'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-full h-full flex flex-col animate-fade-in overflow-hidden bg-[#FAFAEE] relative">
      
      {/* Help Modal */}
      {showHelp && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6" onClick={() => setShowHelp(false)}>
              <div className="bg-white rounded-[32px] p-6 shadow-2xl max-w-xs animate-bounce-in" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black text-xl text-gray-800">
                          {lang === 'zh' ? '🌈 彩虹成就等级' : '🌈 Rainbow Ranks'}
                      </h3>
                      <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600"><div className="w-8 h-8 border-2 border-gray-200 rounded-full flex items-center justify-center font-bold text-sm">✕</div></button>
                  </div>
                  <div className="space-y-3 text-sm font-bold font-nunito">
                      <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-rose-400 border border-black/10"></div><span>Lv 1: {lang === 'zh' ? '红色 (入门)' : 'Red (Starter)'}</span></div>
                      <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-orange-400 border border-black/10"></div><span>Lv 2: {lang === 'zh' ? '橙色 (进阶)' : 'Orange'}</span></div>
                      <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-yellow-400 border border-black/10"></div><span>Lv 3: {lang === 'zh' ? '黄色 (优秀)' : 'Yellow'}</span></div>
                      <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-emerald-400 border border-black/10"></div><span>Lv 4: {lang === 'zh' ? '绿色 (卓越)' : 'Green'}</span></div>
                      <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-cyan-400 border border-black/10"></div><span>Lv 5: {lang === 'zh' ? '青色 (大师)' : 'Cyan'}</span></div>
                      <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-blue-400 border border-black/10"></div><span>Lv 6: {lang === 'zh' ? '蓝色 (宗师)' : 'Blue'}</span></div>
                      <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-purple-400 border border-black/10"></div><span>Lv 7: {lang === 'zh' ? '紫色 (传奇)' : 'Legendary'}</span></div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                     <p className="text-xs font-bold text-gray-500 mb-1">{lang === 'zh' ? '🎈 趣味时间 (Fun Times)' : '🎈 Fun Times'}</p>
                     <p className="text-xs text-gray-400 leading-relaxed">
                       {lang === 'zh' 
                         ? '在特定的时间（如周末、周一）完成挑战，解锁特殊奖励！' 
                         : 'Complete challenges at specific times (e.g. Weekends, Mondays) to unlock special rewards!'}
                     </p>
                  </div>
              </div>
          </div>
      )}

      {/* Header & Tabs */}
      <div className="px-5 pt-4 pb-4 bg-white/80 backdrop-blur-md z-10 sticky top-0 shadow-sm">
        <div className="flex items-center justify-center gap-2 mb-3 relative">
             <div className="w-10 h-10 bg-yellow-100 rounded-2xl flex items-center justify-center text-yellow-600 shadow-sm border border-yellow-200">
                <MuseumIcon className="w-6 h-6" />
             </div>
             <h2 className="text-xl font-black text-tomato-700 tracking-tight">{t('ach_title', lang)}</h2>
             
             {/* Help Button */}
             <button onClick={() => setShowHelp(true)} className="absolute right-0 top-2 text-gray-400 hover:text-tomato-500 transition-colors">
                 <HelpCircleIcon className="w-6 h-6" />
             </button>
        </div>
        
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 justify-start md:justify-center">
            <TabButton id="ALL" label={t('ach_tab_all', lang)} />
            <TabButton id="QUANTITY" label={t('ach_tab_quantity', lang)} />
            <TabButton id="CONTINUITY" label={t('ach_tab_continuity', lang)} />
            <TabButton id="HABIT" label={t('ach_tab_habit', lang)} />
            <TabButton id="GROWTH" label={lang === 'zh' ? '成长' : 'Growth'} />
            <TabButton id="FUN" label={lang === 'zh' ? '趣味' : 'Fun'} />
        </div>
        
        <div className="text-center text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-wide">
            {unlocked.length} / {ACHIEVEMENTS_LIST.length} {t('ach_unlocked', lang)}
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-5 pb-24">
        <div className="grid grid-cols-2 gap-4">
          {displayedAchievements.map((ach) => {
            const isUnlocked = unlockedIds.has(ach.id);
            const progressData = ach.progress ? ach.progress(history) : { current: 0, total: 1 };
            const progressPct = Math.min(100, (progressData.current / progressData.total) * 100);
            
            const IconComponent = ICON_MAP[ach.icon] || TrophyIcon;

            // Determine Theme classes based on Level or Locked state
            const level = ach.level || 1;
            const themeClass = isUnlocked 
                ? LEVEL_THEMES[level] || LEVEL_THEMES[1]
                : 'bg-gray-100 border-gray-200 text-gray-400 grayscale';

            // Extract specific colors for icon background
            const iconBgClass = isUnlocked ? 'bg-white shadow-sm' : 'bg-gray-200';
            const iconColorClass = isUnlocked ? themeClass.match(/icon-(\w+-\d+)/)?.[0].replace('icon-', 'text-') : 'text-gray-400';

            // Get Translated Title/Desc
            const title = getAchText(ach.titleKey, lang);
            const desc = getAchText(ach.descKey, lang, progressData.total);
            
            return (
              <div 
                key={ach.id} 
                className={`relative flex flex-col p-4 rounded-[24px] border-2 transition-all duration-300 overflow-hidden ${themeClass} ${
                    isUnlocked ? 'scale-100 shadow-cartoon' : 'opacity-80'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform ${iconBgClass} ${isUnlocked ? 'scale-110' : 'scale-100'}`}>
                        <IconComponent className={`w-7 h-7 ${iconColorClass || ''}`} />
                    </div>
                    
                    {isUnlocked && (
                        <div className="bg-white/60 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-sm border border-white/40">
                            Lv.{ach.level}
                        </div>
                    )}
                </div>

                <h3 className="font-black text-base mb-1.5 leading-tight tracking-tight">
                    {title}
                </h3>
                <p className="text-sm font-bold opacity-70 leading-snug mb-3 min-h-[3em]">
                    {desc}
                </p>

                {/* Progress Bar */}
                <div className="w-full mt-auto">
                    <div className="flex justify-between text-[10px] font-bold opacity-60 mb-1.5">
                        <span>{isUnlocked ? t('ach_unlocked', lang) : `${Math.floor(progressPct)}%`}</span>
                        <span>{progressData.current}/{progressData.total}</span>
                    </div>
                    <div className="w-full h-2 bg-black/5 rounded-full overflow-hidden">
                      <div 
                          className={`h-full transition-all duration-1000 rounded-full ${isUnlocked ? 'bg-current' : 'bg-gray-400'}`} 
                          style={{ width: `${progressPct}%` }}
                      ></div>
                    </div>
                </div>
                
                {/* Shine Effect for Level 6 & 7 */}
                {isUnlocked && ach.level >= 6 && (
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-50 animate-pulse"></div>
                    </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
