

import React from 'react';

// Optimized App Logo - Cute Tomato Face - Larger and cleaner
export const TomatoIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Body - Slightly squashed for cuteness */}
    <ellipse cx="12" cy="13" rx="10" ry="9" className="text-tomato-500 drop-shadow-md" />
    
    {/* Highlight */}
    <ellipse cx="7" cy="8" rx="3" ry="1.5" className="text-tomato-300" transform="rotate(-45 7 8)" />
    
    {/* Leaves - More detailed */}
    <path d="M12 4C12 4 9 0 6 2.5C4 3.5 10 5.5 12 5.5C14 5.5 20 3.5 18 2.5C15 0 12 4 12 4Z" className="text-leaf-500" stroke="currentColor" strokeWidth="0.5" strokeLinejoin="round"/>
    <path d="M12 4V1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-leaf-600"/>
    
    {/* Cute Face (Subtle) */}
    <circle cx="8" cy="14" r="1" className="text-tomato-900 opacity-30"/>
    <circle cx="16" cy="14" r="1" className="text-tomato-900 opacity-30"/>
    <path d="M10.5 14.5 Q12 15.5 13.5 14.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-tomato-900 opacity-20" fill="none" />
  </svg>
);

// Three Tomatoes for Streak
export const ThreeTomatoesIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 40 24" fill="currentColor" className={className}>
      <g transform="translate(0, 4) scale(0.8)">
        <ellipse cx="12" cy="13" rx="10" ry="9" className="text-current" />
        <path d="M12 4C12 4 9 0 6 2.5C4 3.5 10 5.5 12 5.5C14 5.5 20 3.5 18 2.5C15 0 12 4 12 4Z" className="text-black/20" />
      </g>
      <g transform="translate(14, 0) scale(0.9)">
        <ellipse cx="12" cy="13" rx="10" ry="9" className="text-current" />
        <path d="M12 4C12 4 9 0 6 2.5C4 3.5 10 5.5 12 5.5C14 5.5 20 3.5 18 2.5C15 0 12 4 12 4Z" className="text-black/20" />
      </g>
      <g transform="translate(30, 4) scale(0.8)">
        <ellipse cx="12" cy="13" rx="10" ry="9" className="text-current" />
        <path d="M12 4C12 4 9 0 6 2.5C4 3.5 10 5.5 12 5.5C14 5.5 20 3.5 18 2.5C15 0 12 4 12 4Z" className="text-black/20" />
      </g>
  </svg>
);

// Farm/Windmill Icon for Clock
export const WindmillBarnIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
     {/* Barn */}
     <path d="M4 22V10L10 6L16 10V22H4Z" className="fill-white/80 stroke-gray-600"/>
     <path d="M10 22V14H16" className="stroke-gray-600"/>
     <path d="M10 6V22" className="stroke-gray-600"/>
     
     {/* Windmill Blades */}
     <g transform="translate(18, 10)">
        <path d="M0 0L4 -6L0 -8L-4 -6Z" className="fill-white/90 stroke-gray-600 animate-[spin_4s_linear_infinite]" />
        <path d="M0 0L6 4L8 0L4 -4Z" className="fill-white/90 stroke-gray-600 animate-[spin_4s_linear_infinite]" />
        <path d="M0 0L-4 6L0 8L4 6Z" className="fill-white/90 stroke-gray-600 animate-[spin_4s_linear_infinite]" />
        <path d="M0 0L-6 -4L-8 0L-4 4Z" className="fill-white/90 stroke-gray-600 animate-[spin_4s_linear_infinite]" />
        <circle cx="0" cy="0" r="1" className="fill-gray-600"/>
     </g>
  </svg>
);

// Fancy History Icon (Book/Scroll)
export const HistoryFancyIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 7h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-60"/>
    <path d="M9 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-60"/>
    <path d="M9 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-60"/>
    <path d="M16 2v16" stroke="currentColor" strokeWidth="1" className="opacity-30"/>
  </svg>
);

export const PlayIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="6 4 19 12 6 20 6 4" fill="currentColor" className="opacity-20"></polygon>
    <polygon points="6 4 19 12 6 20 6 4"></polygon>
  </svg>
);

export const XIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

// Optimized Stats Icon - Pie Chart
export const ChartIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" className="text-current opacity-40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M22 12A10 10 0 0 0 12 2v10z" className="text-current" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Optimized Achievement Icon - Trophy
export const TrophyIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M8 21h8m-4-9v9m-8-3h16M17 7v1a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5V7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 13a5 5 0 0 0 5-5V3H7v5a5 5 0 0 0 5 5z" className="opacity-40" />
    <path d="M6 5H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M18 5h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
  </svg>
);

// Museum Icon for Achievements Gallery
export const MuseumIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M2 22H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 22V7H20V22" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M12 2L2 7H22L12 2Z" />
    <path d="M6 10V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-40"/>
    <path d="M10 10V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-40"/>
    <path d="M14 10V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-40"/>
    <path d="M18 10V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-40"/>
  </svg>
);

// History Scroll Icon
export const ScrollIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" className="opacity-20"/>
    <path d="M17 21v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M5 5H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M19 5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-50"/>
    <path d="M12 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 13h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 9h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// AI Magic Icon
export const MagicIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2L15 9L22 9L16 14L18 21L12 17L6 21L8 14L2 9L9 9L12 2Z" fill="currentColor" className="text-current opacity-20"/>
    <path d="M12 2L15 9L22 9L16 14L18 21L12 17L6 21L8 14L2 9L9 9L12 2Z"/>
    <path d="M19 4L21 7L23 4" strokeWidth="1.5"/>
    <path d="M2 17L4 19L6 17" strokeWidth="1.5"/>
  </svg>
);

export const ClockIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

export const CheckCircleIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

export const HelpCircleIcon = ({ className = "w-6 h-6", ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

export const FireIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8.56 2.9A7 7 0 0 1 19 9c0 3.68-2.69 6.81-6 7.82V22h-2v-4.18c-3.31-.76-6-3.8-6-7.82a7 7 0 0 1 3.56-6.1z"></path>
    <path d="M15 16.5a4.5 4.5 0 0 1-9 0"></path>
    <path d="M12 9v4"></path>
  </svg>
);

export const CalendarIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

export const ChevronLeftIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

export const ChevronRightIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

export const TrendingUpIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);

export const TrendingDownIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
    <polyline points="17 18 23 18 23 12"></polyline>
  </svg>
);

// --- Achievement Icons ---

export const SeedIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C12 2 12 10 12 10C12 14.4183 8.41828 18 4 18C4 18 12 18 12 22C12 18 20 18 20 18C15.5817 18 12 14.4183 12 10" />
  </svg>
);

export const SproutIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M2 22C2 22 7 22 12 22C17 22 22 22 22 22M12 22V12M12 12C12 12 8 8 5 9C8 14 12 12 12 12ZM12 12C12 12 16 8 19 9C16 14 12 12 12 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

export const TreeIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 22V10M12 10C16 10 20 7 20 10C20 13 16 16 12 16M12 10C8 10 4 7 4 10C4 13 8 16 12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const MedalIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="8" r="7"></circle>
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" fill="currentColor"></polyline>
  </svg>
);

export const HeartIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);

export const BasketIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M21 10H17.8C18.5 8.9 19 7.7 19 6.5C19 3.5 16.5 1 13.5 1C12.3 1 11.2 1.4 10.3 2.1C10.7 2.1 11.1 2 11.5 2C14 2 16 4 16 6.5C16 7.4 15.7 8.3 15.3 9H21C21.6 9 22 9.4 22 10V12C22 12.6 21.6 13 21 13H20V20C20 21.7 18.7 23 17 23H7C5.3 23 4 21.7 4 20V13H3C2.4 13 2 12.6 2 12V10C2 9.4 2.4 9 3 9H8.7C8.3 8.3 8 7.4 8 6.5C8 4 10 2 12.5 2C12.9 2 13.3 2.1 13.7 2.1C12.8 1.4 11.7 1 10.5 1C7.5 1 5 3.5 5 6.5C5 7.7 5.5 8.9 6.2 10H3" />
    <path d="M6 13V20C6 20.6 6.4 21 7 21H17C17.6 21 18 20.6 18 20V13H6Z" className="opacity-70" />
  </svg>
);

export const LeafIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M2 22C2 22 20 18 20 8C20 2 14 2 14 2C14 2 10 2 6 6C2 10 2 22 2 22Z" />
    <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-50" />
  </svg>
);

export const CrownIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M2 4L5 20H19L22 4L15 9L12 2L9 9L2 4Z" />
    <circle cx="12" cy="14" r="2" className="text-white opacity-40" />
  </svg>
);

export const SunIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="5" fill="currentColor" className="text-current opacity-20"></circle>
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);

export const MoonIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);

export const ZapIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);

export const ShieldIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

export const TargetIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6" fill="currentColor" className="opacity-20"></circle>
    <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
  </svg>
);

export const UserIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);
