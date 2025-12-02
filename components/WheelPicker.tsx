
import React, { useRef, useEffect, useState } from 'react';
import { playTickSound } from '../utils/soundUtils';

interface WheelPickerProps {
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  label?: string;
}

const ITEM_HEIGHT = 48; // Height of each item in pixels

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
  }, []); // Run once on mount to set initial position

  const handleScrollEnd = () => {
     if (scrollRef.current) {
      const scrollTop = scrollRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const newValue = range[index];
      if (newValue !== undefined) {
        onChange(newValue);
      }
      setIsScrolling(false);
     }
  }

  const onScroll = () => {
    setIsScrolling(true);
    
    // Haptic & Audio Logic
    if (scrollRef.current) {
        const scrollTop = scrollRef.current.scrollTop;
        const rawIndex = Math.round(scrollTop / ITEM_HEIGHT);
        
        // Only trigger if we snapped to a new integer index during scroll
        if (rawIndex !== lastIndexRef.current && rawIndex >= 0 && rawIndex < range.length) {
            lastIndexRef.current = rawIndex;
            
            // Audio Feedback
            playTickSound();

            // Haptic Feedback (Taptic Engine style)
            if (navigator.vibrate) {
                navigator.vibrate(5); // 5ms burst
            }
        }
    }

    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    scrollTimeout.current = setTimeout(handleScrollEnd, 150);
  };

  return (
    <div className="flex flex-col items-center mx-1">
      {label && <span className="text-[10px] font-bold text-red-800 mb-1 uppercase tracking-wider whitespace-nowrap">{label}</span>}
      <div className="relative h-32 w-20 bg-white rounded-2xl shadow-inner border-2 border-red-100 overflow-hidden">
        {/* Selection Highlight / Overlay */}
        <div className="absolute top-1/2 left-0 right-0 h-12 -mt-6 bg-red-50 border-y border-red-200 pointer-events-none z-10 opacity-50"></div>
        
        {/* Scroll Container */}
        <div 
          ref={scrollRef}
          className="h-full overflow-y-scroll no-scrollbar snap-y snap-mandatory py-[40px]"
          onScroll={onScroll}
        >
          {range.map((num) => (
            <div 
              key={num} 
              className={`h-12 flex items-center justify-center snap-center transition-colors duration-200 ${
                num === value && !isScrolling ? 'text-tomato-600 font-extrabold text-2xl' : 'text-gray-400 font-bold text-lg'
              }`}
            >
              {num}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
