
import React, { useRef, useEffect, useState } from 'react';
import { playTickSound } from '../utils/soundUtils';

interface WheelPickerProps {
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  label?: string;
}

const ITEM_HEIGHT = 48; // Taller for better touch target and spacing

export const WheelPicker: React.FC<WheelPickerProps> = ({ value, onChange, min, max, label }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIndexRef = useRef<number>(-1);
  
  // Generate range of numbers
  const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  // Initialize scroll position
  useEffect(() => {
    if (scrollRef.current) {
      const index = range.indexOf(value);
      if (index !== -1) {
        scrollRef.current.scrollTop = index * ITEM_HEIGHT;
        lastIndexRef.current = index;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const handleScrollEnd = () => {
     if (scrollRef.current) {
      const scrollTop = scrollRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const newValue = range[index];
      if (newValue !== undefined && newValue !== value) {
        onChange(newValue);
      }
      // Snap to exact position
      scrollRef.current.scrollTo({
          top: index * ITEM_HEIGHT,
          behavior: 'smooth'
      });
      setIsScrolling(false);
     }
  }

  const onScroll = () => {
    setIsScrolling(true);
    
    // Haptic & Audio Logic
    if (scrollRef.current) {
        const scrollTop = scrollRef.current.scrollTop;
        const rawIndex = Math.round(scrollTop / ITEM_HEIGHT);
        
        if (rawIndex !== lastIndexRef.current && rawIndex >= 0 && rawIndex < range.length) {
            lastIndexRef.current = rawIndex;
            playTickSound();
            if (navigator.vibrate) navigator.vibrate(5);
        }
    }

    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    scrollTimeout.current = setTimeout(handleScrollEnd, 100);
  };

  return (
    <div className="flex flex-col items-center justify-center relative w-full">
      {/* Container */}
      <div className="relative h-[144px] w-32 overflow-hidden">
        
        {/* Selection Highlight Bar (Glassmorphism) */}
        <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 h-[40px] bg-black/5 rounded-lg z-0 pointer-events-none border border-black/5"></div>
        
        {/* Scroll Container with CSS Mask for Fade Effect */}
        <div 
          ref={scrollRef}
          className="h-full overflow-y-scroll no-scrollbar snap-y snap-mandatory py-[48px] relative z-10"
          style={{
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)'
          }}
          onScroll={onScroll}
        >
          {range.map((num) => {
             const isActive = num === value;
             return (
                <div 
                key={num} 
                className={`h-[48px] flex items-center justify-center snap-center transition-all duration-200 cursor-pointer select-none`}
                onClick={() => {
                    onChange(num);
                    scrollRef.current?.scrollTo({ top: (num - min) * ITEM_HEIGHT, behavior: 'smooth' });
                }}
                >
                <span className={`text-3xl font-black transition-all duration-200 ${
                    isActive 
                    ? 'text-gray-800 scale-110' 
                    : 'text-gray-400 scale-90 opacity-60'
                }`}>
                    {num}
                </span>
                {isActive && label && (
                     <span className="ml-2 text-xs font-bold text-gray-500 uppercase tracking-widest mt-1.5">{label}</span>
                )}
                </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
