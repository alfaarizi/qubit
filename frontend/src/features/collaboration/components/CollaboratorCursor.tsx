import { useEffect, useRef, useState } from 'react';
import type { UserPresence } from '@/features/collaboration/types';

interface CollaboratorCursorProps {
  presence: UserPresence;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

const COLORS = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#6366f1', '#f97316',
];

const getColorForUser = (connectionId: string): string => {
  const hash = connectionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
};

const getUserName = (user: UserPresence['user']): string => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.email) {
    return user.email.split('@')[0];
  }
  return 'User';
};

export function CollaboratorCursor({ presence, scrollContainerRef }: CollaboratorCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const targetPosRef = useRef<{ x: number; y: number } | null>(null);
  const currentPosRef = useRef<{ x: number; y: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const color = getColorForUser(presence.connectionId);
  const name = getUserName(presence.user);

  // track scroll position
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    const viewport = scrollContainer.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!viewport) return;
    const handleScroll = () => {
      setScrollOffset(viewport.scrollLeft);
    };
    viewport.addEventListener('scroll', handleScroll);
    handleScroll(); // get initial scroll
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef]);

  useEffect(() => {
    if (!presence.cursor) return;
    targetPosRef.current = presence.cursor;
    if (!currentPosRef.current) {
      currentPosRef.current = presence.cursor;
    }
    const animate = () => {
      if (!cursorRef.current || !targetPosRef.current || !currentPosRef.current) return;
      const target = targetPosRef.current;
      const current = currentPosRef.current;
      const factor = 0.35;
      const newX = current.x + (target.x - current.x) * factor;
      const newY = current.y + (target.y - current.y) * factor;
      currentPosRef.current = { x: newX, y: newY };
      // apply scroll offset to x position
      cursorRef.current.style.transform = `translate(${newX - scrollOffset}px, ${newY}px)`;
      const dx = target.x - newX;
      const dy = target.y - newY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0.5) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [presence.cursor, scrollOffset]);

  if (!presence.cursor) {
    return null;
  }

  return (
    <div
      ref={cursorRef}
      className="absolute top-0 left-0 pointer-events-none z-[100]"
      style={{ willChange: 'transform' }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" className="drop-shadow-lg">
        <path
          d="M3 3L3 16.5L7.5 12L10.5 17.5L12.5 16.5L9.5 11L15 10.5L3 3Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <div
        className="ml-5 -mt-4 px-2 py-0.5 rounded-md text-xs font-medium text-white whitespace-nowrap shadow-lg"
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
    </div>
  );
}
