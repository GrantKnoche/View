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
    <div className="w-full h-full flex flex-col animate-fade-in overflow-hidden">
      
      {/* Header & Tabs - Compact Version */}
      <div className="px-4 pt-2 pb-2 bg-white z-10">
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
      <div className="flex-1 overflow-y-auto no-scrollbar p-3 pb-20">
        <div className="grid grid-cols-2 gap-3">
          {displayedAchievements.map((ach) => {
            const isUnlocked = unlockedIds.has(ach.id);
            const progressData = ach.progress ? ach.progress(history) : null;
            const progressPct = progressData ? Math.min(100, (progressData.current / progressData.total) * 100) : 0;
            
            const IconComponent = ICON_MAP[ach.icon] || TrophyIcon;

            return (
              <div 
                key={ach.id} 
                className={`relative flex flex-col p-3 rounded-2xl border transition-all duration-300 ${
                    isUnlocked 
                      ? RARITY_STYLES[ach.rarity] + ' scale-[1.01] shadow-cartoon'
                      : 'border-gray-100 bg-gray-50 opacity-80'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-1.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform ${
                        isUnlocked ? 'bg-white scale-110 shadow-sm text-gray-700' : 'bg-gray-200 grayscale scale-90 text-gray-400'
                    }`}>
                        <IconComponent className="w-5 h-5" />
                    </div>
                    
                    <div className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wider ${
                        isUnlocked ? RARITY_TEXT_COLORS[ach.rarity] + ' bg-white/50' : 'text-gray-300'
                    }`}>
                        {t(`ach_rarity_${ach.rarity.toLowerCase()}`, lang)}
                    </div>
                </div>

                <h3 className={`font-black text-xs mb-0.5 ${isUnlocked ? 'text-gray-800' : 'text-gray-400'}`}>
                    {t(ach.titleKey, lang)}
                </h3>
                <p className="text-[9px] font-semibold text-gray-400 leading-tight mb-2">
                    {t(ach.descKey, lang)}
                </p>

                {progressData && (
                  <div className="w-full mt-auto">
                      <div className="flex justify-between text-[8px] font-bold text-gray-400 mb-0.5">
                          <span>{isUnlocked ? t('ach_unlocked', lang) : `${Math.floor(progressPct)}%`}</span>
                          <span>{progressData.current}/{progressData.total}</span>
                      </div>
                      <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-1000 ${isUnlocked ? 'bg-green-500' : 'bg-tomato-400'}`} 
                            style={{ width: `${progressPct}%` }}
                        ></div>
                      </div>
                  </div>
                )}
                
                {isUnlocked && ach.rarity === 'LEGENDARY' && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-30 animate-pulse"></div>
                    </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="h-8"></div>
      </div>
    </div>
  );
};