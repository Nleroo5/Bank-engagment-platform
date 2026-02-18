'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

/**
 * Fires a one-shot confetti burst on mount.
 * Mobile: single central burst. Desktop: two corner bursts.
 * Renders nothing — purely a side-effect component.
 */
export function ConfettiEffect() {
  useEffect(() => {
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { x: 0.5, y: 0.35 },
        colors: COLORS,
        startVelocity: 28,
        gravity: 1.1,
        ticks: 180,
        disableForReducedMotion: true,
      });
    } else {
      confetti({
        particleCount: 120,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: COLORS,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 120,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: COLORS,
        disableForReducedMotion: true,
      });
    }
  }, []);

  return null;
}
