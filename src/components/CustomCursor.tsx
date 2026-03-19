import React, { useEffect, useState } from 'react';

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPointer, setIsPointer] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      const target = e.target as HTMLElement;
      setIsPointer(window.getComputedStyle(target).cursor === 'pointer');
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      className={`fixed top-0 left-0 w-8 h-8 pointer-events-none z-[9999] transition-transform duration-100 ease-out hidden md:block ${isPointer ? 'scale-150' : 'scale-100'}`}
      style={{ 
        transform: `translate(${position.x - 16}px, ${position.y - 16}px)`,
        backgroundImage: "url('/biryani.png')",
        backgroundSize: 'contain',
        backgroundRepeat: 'no-referrer',
        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
      }}
    />
  );
}
