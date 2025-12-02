
import React, { useRef, useEffect } from 'react';
import { playTickSound } from '../utils/soundUtils';
import { TomatoIcon } from './Icons';

interface WheelPickerProps {
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
}

// Compressed Size
const ITEM_HEIGHT = 40; 
const VISIBLE_COUNT = 5; 
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT; // 200px

export const WheelPicker: React.FC<WheelPickerProps> = ({ value, onChange, min, max }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const lastIndexRef = useRef<number>(range.indexOf(value));
  const paddingHeight = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2;

  useEffect(() => {
    if (scrollRef.current) {
        const index = range.indexOf(value);
        if (index !== -1) {
            scrollRef.current.scrollTop = index * ITEM_HEIGHT;
            lastIndexRef.current = index;
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleScroll = () => {
    if (!scrollRef.current) return;
    
    const scrollTop = scrollRef.current.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const newValue = range[index];

    if (newValue !== undefined && newValue !== value) {
        onChange(newValue);
        if (index !== lastIndexRef.current) {
             playTickSound();
             if (navigator.vibrate) navigator.vibrate(10); 
             lastIndexRef.current = index;
        }
    }
  };

  return (
    <div 
      className="relative w-full max-w-[240px] overflow-hidden flex justify-center items-center"
      style={{ height: `${CONTAINER_HEIGHT}px` }}
    >
       {/* iOS 18 Glass Highlight Bar */}
       <div className="absolute w-full h-[40px] bg-tomato-500/10 rounded-lg pointer-events-none z-0 backdrop-blur-sm border border-tomato-500/20"></div>

       <div 
         ref={scrollRef}
         className="h-full w-full overflow-y-scroll no-scrollbar snap-y snap-mandatory relative z-10"
         onScroll={handleScroll}
         style={{
            paddingTop: `${paddingHeight}px`,
            paddingBottom: `${paddingHeight}px`,
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)'
         }}
       >
         {range.map((num) => {
            const isActive = num === value;
            const offset = Math.abs(num - value);
            let opacity = 0.3;
            if (offset === 0) opacity = 1;
            else if (offset === 1) opacity = 0.6;
            
            return (
               <div 
                 key={num} 
                 className="h-[40px] flex items-center justify-center snap-center cursor-pointer select-none relative"
                 onClick={() => {
                     const idx = range.indexOf(num);
                     scrollRef.current?.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
                 }}
               >
                 <div className="flex items-center gap-2 transition-all duration-200" style={{ opacity }}>
                     <span className={`font-black transition-all duration-200 transform ${
                         isActive 
                         ? 'text-3xl text-tomato-500 scale-100' // Slightly smaller text for elegance
                         : 'text-2xl text-gray-400 scale-90'
                     }`}>
                         {num}
                     </span>
                     
                     <div className={`transition-all duration-300 transform flex items-center ${
                         isActive 
                         ? 'opacity-100 scale-100 translate-x-0 w-auto' 
                         : 'opacity-0 scale-0 -translate-x-2 w-0 overflow-hidden'
                     }`}>
                         <TomatoIcon className="w-5 h-5 drop-shadow-sm" />
                     </div>
                 </div>
               </div>
            );
         })}
       </div>
    </div>
  );
};
