'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Check, ChevronRight, RotateCcw } from 'lucide-react';

interface SwipeToCompleteSliderProps {
  isCompleted: boolean;
  onComplete: () => void;
  onReset?: () => void;
  label?: string;
  completedLabel?: string;
  disabled?: boolean;
}

export default function SwipeToCompleteSlider({
  isCompleted,
  onComplete,
  onReset,
  label = 'slide to complete',
  completedLabel = 'Completed',
  disabled = false,
}: SwipeToCompleteSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);

  const knobSize = 50; // Size of circular slider thumb in px
  const padding = 4; // Padding inside track in px
  const maxDistance = Math.max(0, trackWidth - knobSize - padding * 2);

  const x = useMotionValue(0);

  // Update track width dynamically
  useEffect(() => {
    const updateWidth = () => {
      if (trackRef.current) {
        setTrackWidth(trackRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Derived animated values
  const textOpacity = useTransform(x, [0, maxDistance * 0.55], [1, 0]);
  const fillWidth = useTransform(x, (val) => Math.max(0, val + knobSize));
  const knobBackground = useTransform(
    x,
    [0, maxDistance * 0.8],
    ['var(--color-surface)', 'var(--color-ok)']
  );

  const triggerCompletion = useCallback(() => {
    // Smartphone haptic feedback vibration
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([25, 40, 25]);
      } catch {
        /* ignore */
      }
    }
    // Animate knob to full right
    animate(x, maxDistance, { type: 'spring', stiffness: 450, damping: 30 });
    onComplete();
  }, [maxDistance, onComplete, x]);

  const handleDragEnd = () => {
    const currentX = x.get();
    const threshold = maxDistance * 0.72;

    if (currentX >= threshold) {
      triggerCompletion();
    } else {
      // Spring back to left
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 32 });
    }
  };

  const handleUndo = () => {
    animate(x, 0, { duration: 0.25 });
    if (onReset) onReset();
  };

  if (isCompleted) {
    return (
      <div className="w-full space-y-2">
        <motion.div
          initial={{ scale: 0.96, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-full h-[58px] rounded-full bg-ok/15 border border-ok/30 flex items-center justify-between px-5 shadow-xs overflow-hidden"
        >
          {/* Subtle success pulse background */}
          <div className="absolute inset-0 bg-gradient-to-r from-ok/10 via-ok/20 to-ok/10 animate-pulse pointer-events-none" />

          <div className="flex items-center gap-2.5 z-10">
            <div className="w-9 h-9 rounded-full bg-ok text-white flex items-center justify-center shadow-sm">
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-ok tracking-wide">
                {completedLabel}
              </p>
              <p className="text-[10px] text-txt-3">Executed successfully</p>
            </div>
          </div>

          {onReset && (
            <button
              type="button"
              onClick={handleUndo}
              className="z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface hover:bg-surface-2 border border-border-light text-txt-2 hover:text-txt text-xs font-medium transition cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Mark Pending</span>
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full select-none">
      {/* Slider Track */}
      <div
        ref={trackRef}
        className="relative w-full h-[58px] rounded-full bg-surface-2 border border-border/80 p-1 flex items-center shadow-inner overflow-hidden"
      >
        {/* Dynamic Track Fill behind the knob */}
        <motion.div
          style={{ width: fillWidth }}
          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-accent/30 via-accent/50 to-ok/60 rounded-full pointer-events-none transition-colors"
        />

        {/* Shimmering Center Text (iPhone slide-to-answer style) */}
        <motion.div
          style={{ opacity: textOpacity }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        >
          <div className="flex items-center gap-1.5 font-medium text-xs tracking-wider uppercase text-txt-2">
            <span className="relative overflow-hidden inline-block font-semibold">
              {label}
            </span>
            <div className="flex items-center text-txt-3 animate-pulse">
              <ChevronRight className="w-3.5 h-3.5 -mr-1.5" />
              <ChevronRight className="w-3.5 h-3.5 -mr-1.5" />
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </motion.div>

        {/* Draggable Knob Thumb */}
        <motion.div
          drag={disabled ? false : 'x'}
          dragConstraints={{ left: 0, right: maxDistance }}
          dragElastic={0.06}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          style={{ x }}
          whileDrag={{ scale: 1.08 }}
          whileHover={{ scale: 1.03 }}
          className="relative z-20 flex items-center justify-center rounded-full shadow-lg border border-border-light/60 cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <motion.div
            style={{ backgroundColor: knobBackground }}
            className="w-[50px] h-[50px] rounded-full flex items-center justify-center text-txt bg-surface shadow-md"
          >
            <ChevronRight className="w-5 h-5 text-accent stroke-[2.5]" />
          </motion.div>
        </motion.div>
      </div>

      <p className="text-[11px] text-center text-txt-3 mt-1.5">
        Slide handle all the way right to mark done
      </p>
    </div>
  );
}
