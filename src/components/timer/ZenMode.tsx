'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  pauseTimer,
  resumeTimer,
  stopTimer,
  toggleZenMode,
} from '@/lib/features/timer/timerSlice';
import { completeDeepWorkTask } from '@/lib/features/tasks/tasksSlice';
import { awardPoints } from '@/lib/features/vault/vaultSlice';
import { calculateDeepWorkPoints } from '@/lib/gamification/engine';
import { Minimize2, Pause, Play, Check } from 'lucide-react';

export default function ZenMode() {
  const dispatch = useAppDispatch();
  const timer = useAppSelector((state) => state.timer);
  const tasks = useAppSelector((state) => state.tasks.items);

  // Close Zen Mode on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && timer.isZenMode) {
        dispatch(toggleZenMode(false));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timer.isZenMode, dispatch]);

  if (!timer.isZenMode) return null;

  const targetSeconds = timer.targetDurationMinutes * 60;
  const isOvertime = timer.elapsedSeconds > targetSeconds;
  const overtimeSeconds = isOvertime ? timer.elapsedSeconds - targetSeconds : 0;
  const progress = Math.min(1, timer.elapsedSeconds / (targetSeconds || 1));

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinishSession = async () => {
    if (!timer.taskId) {
      dispatch(stopTimer());
      dispatch(toggleZenMode(false));
      return;
    }

    const currentTask = tasks.find((t) => String(t._id) === timer.taskId);
    const importance = currentTask?.importance || 3;

    const result = calculateDeepWorkPoints({
      targetMinutes: timer.targetDurationMinutes,
      actualDurationSeconds: timer.elapsedSeconds,
      importance,
      isLiveTracked: true,
      isFrog: currentTask?.isFrog,
      completedAt: new Date(),
    });

    const totalAwarded = result.totalPoints;

    dispatch(
      completeDeepWorkTask({
        taskId: timer.taskId,
        actualDurationSeconds: timer.elapsedSeconds,
        isLiveTracked: true,
        pointsEarned: totalAwarded,
        overtimeSeconds,
        overtimeBonusAwarded: result.isOvertimeEligible,
        sessions: timer.splitSessions.map((s, idx) => ({
          id: s.id || `split-${idx}`,
          startedAt: new Date(s.startedAt),
          endedAt: s.endedAt ? new Date(s.endedAt) : undefined,
          durationSeconds: s.durationSeconds,
        })),
      })
    );

    dispatch(
      awardPoints({
        pointsDelta: totalAwarded,
        type: 'TASK_COMPLETION',
        description: `Deep Work: ${timer.taskTitle} (${Math.round(timer.elapsedSeconds / 60)} min)`,
        taskId: timer.taskId,
        metadata: {
          basePoints: result.basePoints,
          overtimeBonus: result.overtimeBonus,
          isOvertimeEligible: result.isOvertimeEligible,
          isLiveTracked: true,
          breakdown: result.breakdown,
        },
      })
    );

    try {
      await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: timer.taskId,
          actualDurationSeconds: timer.elapsedSeconds,
          isLiveTracked: true,
          sessions: timer.splitSessions,
        }),
      });
    } catch {
      // Local state updated
    }

    dispatch(stopTimer());
    dispatch(toggleZenMode(false));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between p-8 sm:p-12 select-none"
      >
        {/* Top Header */}
        <header className="flex items-center justify-between max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                timer.isRunning ? 'bg-ok animate-pulse' : 'bg-white/40'
              }`}
            />
            <span className="text-xs tracking-wider uppercase text-white/60 font-medium">
              Zen Mode
            </span>
          </div>

          <button
            onClick={() => dispatch(toggleZenMode(false))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 text-xs transition cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px]">esc</span>
          </button>
        </header>

        {/* Center: Minimalist Radial Clock */}
        <main className="flex flex-col items-center justify-center my-auto">
          <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
            {/* Minimal SVG Hairline Ring */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="2"
                fill="transparent"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="44"
                stroke={isOvertime ? 'var(--warn)' : 'var(--accent)'}
                strokeWidth="2.5"
                fill="transparent"
                strokeDasharray="276.46"
                strokeDashoffset={276.46 * (1 - progress)}
                strokeLinecap="round"
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-2">
              <h2 className="text-sm font-medium text-white/60 max-w-[200px] truncate">
                {timer.taskTitle || 'Deep Work'}
              </h2>

              <div className="font-mono text-5xl sm:text-6xl font-light tracking-tight text-white tabular-nums">
                {formatTime(timer.elapsedSeconds)}
              </div>

              <div className="text-[11px] font-mono text-white/50">
                {isOvertime ? (
                  <span className="text-warn">+{formatTime(overtimeSeconds)} overtime</span>
                ) : (
                  <span>{timer.targetDurationMinutes}m target</span>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Bottom Controls */}
        <footer className="flex items-center justify-center gap-3 max-w-sm mx-auto w-full">
          {timer.isRunning ? (
            <button
              onClick={() => dispatch(pauseTimer())}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition cursor-pointer backdrop-blur-md"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={() => dispatch(resumeTimer())}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition cursor-pointer shadow-lg"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume</span>
            </button>
          )}

          <button
            onClick={handleFinishSession}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-medium transition cursor-pointer backdrop-blur-md"
          >
            <Check className="w-3.5 h-3.5 text-ok" />
            <span>Complete</span>
          </button>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
}
