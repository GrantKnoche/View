

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

const RARITY_STYLES: Record<AchievementRarity, string> = {
  COMMON: 'border-slate-200 bg-slate-50',
  ADVANCED: 'border-sky-200 bg-sky-50',
  RARE: 'border-purple-200 bg-purple-50',
  EPIC: 'border-amber-300 bg-amber-50',
  LEGENDARY: 'border-rose-400 bg-rose-50 shadow-lg',
};

const RARITY_TEXT_COLORS: Record<AchievementRarity, string> = {
  COMMON: 'text-slate-500',
  ADVANCED: 'text-sky-600',
  RARE: 'text-purple-600',
  EPIC: 'text-amber-600',
  LEGENDARY: 'text-rose-600',
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

  // Filter achievements
  const displayedAchievements = useMemo(() => {
    return ACHIEVEMENTS_LIST.filter(ach => 
      activeTab === 'ALL' || ach.category === activeTab
    );
  }, [activeTab]);

  const changeTab = (tab: AchievementCategory | 'ALL') => {
      playClickSound();
      setActiveTab(tab);
  }

  // Tab Button Component
  const TabButton = ({ id, label }: { id: AchievementCategory | 'ALL', label: string }) => (
    <button
      onClick={() => changeTab(id)}
      className={`px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
        activeTab === id 
        ? 'bg-tomato-500 text-white shadow-md' 
        : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-full h-full flex flex-col animate-fade-in overflow-hidden">
      
      {/* Header & Tabs */}
      <div className="px-6 pt-4 pb-2 bg-white z-10">
        <div className="flex items-center justify-center gap-3 mb-4">
             {/* Updated Header Icon to Museum Style */}
             <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center text-yellow-600 shadow-sm border border-yellow-200">
                <MuseumIcon className="w-7 h-7" />
             </div>
             <h2 className="text-2xl font-black text-tomato-700">{t('ach_title', lang)}</h2>
        </div>
        
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 justify-center">
            <TabButton id="ALL" label={t('ach_tab_all', lang)} />
            <TabButton id="QUANTITY" label={t('ach_tab_quantity', lang)} />
            <TabButton id="CONTINUITY" label={t('ach_tab_continuity', lang)} />
            <TabButton id="HABIT" label={t('ach_tab_habit', lang)} />
        </div>
        
        {/* Progress Summary */}
        <div className="text-center text-xs font-bold text-gray-400 mt-2">
            {unlocked.length} / {ACHIEVEMENTS_LIST.length} {t('ach_unlocked', lang)}
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayedAchievements.map((ach) => {
            const isUnlocked = unlockedIds.has(ach.id);
            const progressData = ach.progress ? ach.progress(history) : null;
            const progressPct = progressData ? Math.min(100, (progressData.current / progressData.total) * 100) : 0;
            
            const IconComponent = ICON_MAP[ach.icon] || TrophyIcon;

            return (
              <div 
                key={ach.id} 
                className={`relative flex flex-col p-4 rounded-3xl border-2 transition-all duration-300 ${
                    isUnlocked 
                      ? RARITY_STYLES[ach.rarity] + ' scale-[1.01] shadow-cartoon'
                      : 'border-gray-100 bg-gray-50 opacity-80'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-2">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform ${
                        isUnlocked ? 'bg-white scale-110 shadow-sm text-gray-700' : 'bg-gray-200 grayscale scale-90 text-gray-400'
                    }`}>
                        <IconComponent className="w-7 h-7" />
                    </div>
                    
                    {/* Rarity Badge (Only if unlocked or close?) - Let's show always for motivation */}
                    <div className={`text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-wider ${
                        isUnlocked ? RARITY_TEXT_COLORS[ach.rarity] + ' bg-white/50' : 'text-gray-300'
                    }`}>
                        {t(`ach_rarity_${ach.rarity.toLowerCase()}`, lang)}
                    </div>
                </div>

                {/* Text Content */}
                <h3 className={`font-black text-sm mb-1 ${isUnlocked ? 'text-gray-800' : 'text-gray-400'}`}>
                    {t(ach.titleKey, lang)}
                </h3>
                <p className="text-xs font-semibold text-gray-400 leading-tight mb-3">
                    {t(ach.descKey, lang)}
                </p>

                {/* Progress Bar (Always show unless 100% and hidden style desired, but good to show 100% too) */}
                {progressData && (
                  <div className="w-full mt-auto">
                      <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1">
                          <span>{isUnlocked ? t('ach_unlocked', lang) : `${Math.floor(progressPct)}%`}</span>
                          <span>{progressData.current}/{progressData.total}</span>
                      </div>
                      <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-1000 ${isUnlocked ? 'bg-green-500' : 'bg-tomato-400'}`} 
                            style={{ width: `${progressPct}%` }}
                        ></div>
                      </div>
                  </div>
                )}
                
                {/* Legendary Particle Effect (CSS) */}
                {isUnlocked && ach.rarity === 'LEGENDARY' && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-30 animate-pulse"></div>
                    </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Spacer for bottom nav */}
        <div className="h-12"></div>
      </div>
    </div>
  );
};
