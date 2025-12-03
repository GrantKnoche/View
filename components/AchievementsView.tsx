
import React, { useEffect, useState, useMemo } from 'react';
import { UnlockedAchievement, Language, AchievementCategory, AchievementRarity } from '../types';
import { ACHIEVEMENTS_LIST } from '../constants';
import { getHistory } from '../utils/storageUtils';
import { t } from '../utils/i18n';
import { playClickSound } from '../utils/soundUtils';
import { 
  TrophyIcon, SproutIcon, BasketIcon, LeafIcon, TomatoIcon, CrownIcon, 
  FireIcon, ZapIcon, TargetIcon, SeedIcon, TreeIcon, MedalIcon, CalendarIcon, 
  SunIcon, MoonIcon, ShieldIcon, HeartIcon, MuseumIcon
} from './Icons';

interface AchievementsViewProps {
  unlocked: UnlockedAchievement[];
  lang: Language;
}

// 1. Pastel Color Palettes for Rarity/Types
const RARITY_THEMES: Record<AchievementRarity, string> = {
  COMMON: 'bg-emerald-100 border-emerald-200 text-emerald-800 icon-emerald-500', // Green (Sprout)
  ADVANCED: 'bg-sky-100 border-sky-200 text-sky-800 icon-sky-500',       // Blue (Accumulation)
  RARE: 'bg-violet-100 border-violet-200 text-violet-800 icon-violet-500', // Purple (Special)
  EPIC: 'bg-amber-100 border-amber-200 text-amber-800 icon-amber-500',   // Gold (Master)
  LEGENDARY: 'bg-rose-100 border-rose-200 text-rose-800 icon-rose-500',  // Pink/Red (Legend)
};

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
};

export const AchievementsView: React.FC<AchievementsViewProps> = ({ unlocked, lang }) => {
  const unlockedIds = useMemo(() => new Set(unlocked.map(u => u.id)), [unlocked]);
  const [history, setHistory] = useState(getHistory());
  const [activeTab, setActiveTab] = useState<AchievementCategory | 'ALL'>('ALL');

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
      className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all active:scale-95 ${
        activeTab === id 
        ? 'bg-tomato-500 text-white shadow-md' 
        : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-full h-full flex flex-col animate-fade-in overflow-hidden bg-[#FAFAEE]">
      
      {/* Header & Tabs */}
      <div className="px-4 pt-2 pb-2 bg-white/80 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center justify-center gap-2 mb-1">
             <div className="w-8 h-8 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600 shadow-sm border border-yellow-200">
                <MuseumIcon className="w-5 h-5" />
             </div>
             <h2 className="text-lg font-black text-tomato-700">{t('ach_title', lang)}</h2>
        </div>
        
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 justify-center">
            <TabButton id="ALL" label={t('ach_tab_all', lang)} />
            <TabButton id="QUANTITY" label={t('ach_tab_quantity', lang)} />
            <TabButton id="CONTINUITY" label={t('ach_tab_continuity', lang)} />
            <TabButton id="HABIT" label={t('ach_tab_habit', lang)} />
        </div>
        
        <div className="text-center text-[9px] font-bold text-gray-400 mt-1">
            {unlocked.length} / {ACHIEVEMENTS_LIST.length} {t('ach_unlocked', lang)}
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 pb-24">
        <div className="grid grid-cols-2 gap-3">
          {displayedAchievements.map((ach) => {
            const isUnlocked = unlockedIds.has(ach.id);
            const progressData = ach.progress ? ach.progress(history) : null;
            const progressPct = progressData ? Math.min(100, (progressData.current / progressData.total) * 100) : 0;
            
            const IconComponent = ICON_MAP[ach.icon] || TrophyIcon;

            // Determine Theme classes based on Rarity or Locked state
            const themeClass = isUnlocked 
                ? RARITY_THEMES[ach.rarity] || RARITY_THEMES['COMMON']
                : 'bg-gray-100 border-gray-200 text-gray-400 grayscale';

            // Extract specific colors for icon background
            const iconBgClass = isUnlocked ? 'bg-white shadow-sm' : 'bg-gray-200';
            const iconColorClass = isUnlocked ? themeClass.match(/icon-(\w+-\d+)/)?.[0].replace('icon-', 'text-') : 'text-gray-400';

            return (
              <div 
                key={ach.id} 
                className={`relative flex flex-col p-3 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${themeClass} ${
                    isUnlocked ? 'scale-100 shadow-cartoon' : 'opacity-80'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${iconBgClass} ${isUnlocked ? 'scale-110' : 'scale-100'}`}>
                        <IconComponent className={`w-6 h-6 ${iconColorClass || ''}`} />
                    </div>
                    
                    {isUnlocked && (
                        <div className="bg-white/60 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider backdrop-blur-sm">
                            {t(`ach_rarity_${ach.rarity.toLowerCase()}`, lang)}
                        </div>
                    )}
                </div>

                <h3 className="font-black text-xs mb-1 leading-tight">
                    {t(ach.titleKey, lang)}
                </h3>
                <p className="text-[9px] font-bold opacity-70 leading-tight mb-2 min-h-[2.2em]">
                    {t(ach.descKey, lang)}
                </p>

                {/* Progress Bar */}
                {progressData && (
                  <div className="w-full mt-auto">
                      <div className="flex justify-between text-[8px] font-bold opacity-60 mb-1">
                          <span>{isUnlocked ? t('ach_unlocked', lang) : `${Math.floor(progressPct)}%`}</span>
                          <span>{progressData.current}/{progressData.total}</span>
                      </div>
                      <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-1000 rounded-full ${isUnlocked ? 'bg-current' : 'bg-gray-400'}`} 
                            style={{ width: `${progressPct}%` }}
                        ></div>
                      </div>
                  </div>
                )}
                
                {/* Legendary Shine Effect */}
                {isUnlocked && ach.rarity === 'LEGENDARY' && (
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
