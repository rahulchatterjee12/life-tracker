'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  closeHabitStackModal,
  toggleHabitCompletion,
} from '@/lib/features/tasks/tasksSlice';
import { startTimer } from '@/lib/features/timer/timerSlice';
import { ArrowRight, X, Flame } from 'lucide-react';

export default function HabitStackModal() {
  const dispatch = useAppDispatch();
  const stackModal = useAppSelector((state) => state.tasks.activeHabitStackModal);
  const tasks = useAppSelector((state) => state.tasks.items);

  if (!stackModal.isOpen) return null;

  const nextTask = tasks.find((t) => String(t._id) === stackModal.nextTaskId);

  const handleStartNextTask = () => {
    if (!nextTask) {
      dispatch(closeHabitStackModal());
      return;
    }

    if (nextTask.type === 'DEEP_WORK') {
      dispatch(
        startTimer({
          taskId: String(nextTask._id),
          taskTitle: nextTask.title,
          targetDurationMinutes: nextTask.deepWorkDetails?.targetDurationMinutes || 30,
          openZenMode: true,
        })
      );
    } else if (nextTask.type === 'HABIT') {
      const nextTaskId = String(nextTask._id);
      dispatch(toggleHabitCompletion(nextTaskId));
      fetch('/api/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: nextTaskId }),
      }).catch((err) => console.error('Failed to complete stacked habit:', err));
    }

    dispatch(closeHabitStackModal());
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-sm p-6 rounded-2xl bg-surface border border-border shadow-2xl text-txt space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-txt-2">
              Habit Stack Trigger
            </span>
            <button
              onClick={() => dispatch(closeHabitStackModal())}
              className="p-1 rounded-md text-txt-3 hover:text-txt transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-txt-2">
              Completed <span className="text-txt font-medium">&ldquo;{stackModal.completedHabitTitle}&rdquo;</span>. Next routine in your stack:
            </p>
            <h4 className="text-base font-semibold text-txt pt-1">
              {stackModal.nextTaskTitle}
            </h4>
            {nextTask?.habitDetails && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-warn pt-0.5">
                <Flame className="w-3.5 h-3.5" />
                {nextTask.habitDetails.streakCount}d streak
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-light">
            <button
              onClick={() => dispatch(closeHabitStackModal())}
              className="px-3.5 py-2 text-xs text-txt-2 hover:text-txt transition cursor-pointer"
            >
              Skip
            </button>
            <button
              onClick={handleStartNextTask}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition cursor-pointer shadow-sm"
            >
              <span>Begin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
