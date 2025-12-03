
import React from 'react';

export const Confetti = () => {
  // Generate a set of particles
  const particles = Array.from({ length: 30 }).map((_, i) => {
    const angle = Math.random() * 360;
    const distance = 200 + Math.random() * 300; // Explode outwards
    // Calculate CSS variables for direction
    const dx = Math.cos(angle * (Math.PI / 180)) * distance + 'px';
    const dy = Math.sin(angle * (Math.PI / 180)) * distance + 'px';
    
    // Random colors
    const colors = ['#FF4136', '#FFDC00', '#2ECC40', '#0074D9', '#B10DC9', '#FF851B'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Random size
    const size = 5 + Math.random() * 8 + 'px';

    return { id: i, dx, dy, color, size };
  });

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[100] w-0 h-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-confetti"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            '--dx': p.dx,
            '--dy': p.dy,
            left: 0,
            top: 0,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};
