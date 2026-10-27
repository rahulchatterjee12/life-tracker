'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch } from '@/lib/hooks';
import {
  setTaskCompletionStatus,
  updateTask,
  toggleAdminSubtask,
} from '@/lib/features/tasks/tasksSlice';
import { setUserVaultStats } from '@/lib/features/vault/vaultSlice';
import { startTimer } from '@/lib/features/timer/timerSlice';
import { ITask } from '@/types/database';
import SwipeToCompleteSlider from '@/components/tasks/SwipeToCompleteSlider';
import { getMonthlyScheduledDays } from '@/lib/gamification/streaks';
import {
  X,
  Flame,
  Clock,
  Calendar,
  Sparkles,
  Play,
  CheckCircle2,
  Circle,
  Link as LinkIcon,
  ExternalLink,
  Award,
} from 'lucide-react';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ITask | null;
}

export default function TaskDetailModal({
  isOpen,
  onClose,
  task,
}: TaskDetailModalProps) {
  const dispatch = useAppDispatch();

  if (!isOpen || !task) return null;

  const taskId = String(task._id);
  const isHabit = task.type === 'HABIT';
  const isDeepWork = task.type === 'DEEP_WORK';
  const isAdmin = task.type === 'ADMIN';

  const handleComplete = async () => {
    // 1. Optimistically update Redux state
    dispatch(setTaskCompletionStatus({ taskId, completed: true }));

    // 2. Persist completion event and timestamp to backend
    try {
      const res = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          actualDurationSeconds:
            task.deepWorkDetails?.targetDurationMinutes
              ? task.deepWorkDetails.targetDurationMinutes * 60
              : undefined,
          isLiveTracked: false,
        }),
      });
      const data = await res.json();
      if (data.success && data.task) {
        dispatch(updateTask(data.task));
        if (data.user) {
          dispatch(
            setUserVaultStats({
              vaultBalance: data.user.vaultBalance,
              totalPointsEarned: data.user.totalPointsEarned,
              streakFreezesCount: data.user.streakFreezesCount,
            })
          );
        }
      }
    } catch (err) {
      console.error('Failed to persist task completion:', err);
    }
  };

  const handleReset = async () => {
    dispatch(setTaskCompletionStatus({ taskId, completed: false }));
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, completed: false }),
      });
      const data = await res.json();
      if (data.success && data.task) {
        dispatch(updateTask(data.task));
      }
    } catch (err) {
      console.error('Failed to reset task completion on server:', err);
    }
  };

  const handleLaunchTimer = () => {
    dispatch(
      startTimer({
        taskId,
        taskTitle: task.title,
        targetDurationMinutes: task.deepWorkDetails?.targetDurationMinutes || 45,
        openZenMode: true,
      })
    );
    onClose();
  };

  const TypeIcon = isHabit ? Flame : isDeepWork ? Clock : Calendar;
  const typeLabel = isHabit
    ? 'Daily Habit'
    : isDeepWork
    ? 'Deep Work Session'
    : 'Admin Task';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg p-6 rounded-3xl bg-surface border border-border shadow-2xl text-txt my-8 space-y-5 overflow-hidden"
        >
          {/* Top category header & close button */}
          <div className="flex items-center justify-between border-b border-border-light pb-3">
            <div className="flex items-center gap-2">
              <span
                className={`p-1.5 rounded-xl ${
                  isHabit
                    ? 'bg-warn/15 text-warn'
                    : isDeepWork
                    ? 'bg-accent/15 text-accent'
                    : 'bg-surface-2 text-txt-2'
                }`}
              >
                <TypeIcon className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-txt-2">
                {typeLabel}
              </span>
              {task.isFrog && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-warn/15 text-warn font-semibold">
                  <Sparkles className="w-3 h-3" />
                  Today&apos;s Frog
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-txt-3 hover:text-txt hover:bg-surface-2 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Task Title & Notes */}
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-txt tracking-tight leading-snug">
              {task.title}
            </h2>
            {task.description ? (
              <p className="text-xs sm:text-sm text-txt-2 leading-relaxed">
                {task.description}
              </p>
            ) : (
              <p className="text-xs text-txt-3 italic">
                No extra notes attached to this task.
              </p>
            )}

            {/* Clickable Resource Link Button */}
            {task.url && (
              <div className="pt-1">
                <a
                  href={task.url.startsWith('http://') || task.url.startsWith('https://') ? task.url : `https://${task.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent/10 hover:bg-accent/20 border border-accent/25 text-accent text-xs font-semibold transition cursor-pointer group shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  <span className="truncate max-w-[280px] sm:max-w-md">Open Resource: {task.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                  <span className="text-[10px] opacity-75 shrink-0">↗</span>
                </a>
              </div>
            )}
          </div>

          {/* Meta Info Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-2 border border-border-light text-xs text-txt-2">
              <span className="text-warn font-bold">★</span>
              <span>Importance: {task.importance}/5</span>
            </div>

            {task.pointsAwarded ? (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-ok/10 border border-ok/20 text-xs text-ok font-medium">
                <Award className="w-3.5 h-3.5" />
                <span>+{task.pointsAwarded} pts earned</span>
              </div>
            ) : null}

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-2 border border-border-light text-xs text-txt-2">
              {task.completed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-ok" />
                  <span className="text-ok font-medium">Completed</span>
                </>
              ) : (
                <>
                  <Circle className="w-3.5 h-3.5 text-txt-3" />
                  <span>Pending</span>
                </>
              )}
            </div>

            {task.completed && task.completedAt && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-ok/10 border border-ok/20 text-xs text-ok font-medium font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {new Date(task.completedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Category-Specific Deep Dive Card */}
          <div className="p-4 rounded-2xl bg-bg border border-border-light space-y-3">
            {isHabit && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-txt-2">Current Consistency</span>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-warn/10 text-warn font-mono font-semibold text-xs">
                    <Flame className="w-3.5 h-3.5" />
                    <span>{task.habitDetails?.streakCount || 0} Day Streak</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-surface border border-border-light">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-txt-3 uppercase font-medium">Scheduled Days</p>
                      {task.habitDetails?.frequency && task.habitDetails.frequency !== 'daily' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium capitalize">
                          {task.habitDetails.frequency}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-txt mt-0.5 font-mono">
                      {getMonthlyScheduledDays(task.habitDetails)} days/mo
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface border border-border-light">
                    <p className="text-[10px] text-txt-3 uppercase font-medium">Best Record</p>
                    <p className="text-sm font-semibold text-txt mt-0.5 font-mono">
                      {task.habitDetails?.bestStreak || 0} days
                    </p>
                  </div>
                </div>

                {task.habitDetails?.nextTaskId && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-accent/5 border border-accent/15 text-xs text-txt-2">
                    <LinkIcon className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span>Chained to next stacked task upon completion</span>
                  </div>
                )}
              </div>
            )}

            {isDeepWork && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-txt-2">Target Duration:</span>
                  <span className="font-semibold text-txt font-mono">
                    {task.deepWorkDetails?.targetDurationMinutes || 45} minutes
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleLaunchTimer}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent font-medium text-xs transition cursor-pointer border border-accent/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Focused Zen Mode Timer</span>
                </button>
              </div>
            )}

            {isAdmin && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-txt-2">Due Date:</span>
                  <span className="font-semibold text-txt font-mono">
                    {task.adminDetails
                      ? new Date(task.adminDetails.dueDate).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>

                {task.adminDetails?.subtasks && task.adminDetails.subtasks.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border-light">
                    <p className="text-[11px] font-medium text-txt-3 uppercase">
                      Subtasks Checklist
                    </p>
                    <div className="space-y-1.5">
                      {task.adminDetails.subtasks.map((sub) => (
                        <label
                          key={sub.id}
                          className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface transition cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={sub.completed}
                            onChange={() =>
                              dispatch(
                                toggleAdminSubtask({
                                  taskId,
                                  subtaskId: sub.id,
                                })
                              )
                            }
                            className="h-3.5 w-3.5 rounded border-border accent-accent cursor-pointer"
                          />
                          <span
                            className={`text-xs ${
                              sub.completed ? 'line-through text-txt-3' : 'text-txt'
                            }`}
                          >
                            {sub.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Historical Completion Log & Timestamps */}
          {task.completionHistory && task.completionHistory.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-surface-2/40 border border-border-light space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-txt flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-ok" />
                  Historical Completion Log ({task.completionHistory.length})
                </span>
                <span className="text-[10px] text-txt-3">Recorded timestamps</span>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                {[...task.completionHistory].reverse().map((ev, idx) => (
                  <div
                    key={ev._id || idx}
                    className="flex items-center justify-between text-[11px] py-1 px-2.5 rounded-lg bg-surface border border-border-light/60 font-mono"
                  >
                    <span className="text-txt-2">{ev.dateStr}</span>
                    <span className="text-txt-3">
                      {new Date(ev.completedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    {ev.pointsAwarded ? (
                      <span className="text-ok font-medium">+{ev.pointsAwarded} pts</span>
                    ) : (
                      <span className="text-ok font-medium">Done</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === INTERACTIVE SWIPE-TO-COMPLETE SLIDER === */}
          <div className="pt-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-txt-2">
                Execution Action
              </span>
              <span className="text-[11px] text-txt-3">
                {task.completed ? 'Task completed' : 'Swipe right to complete'}
              </span>
            </div>

            <SwipeToCompleteSlider
              key={`${taskId}-${task.completed}`}
              isCompleted={Boolean(task.completed)}
              onComplete={handleComplete}
              onReset={handleReset}
              label={
                isHabit
                  ? 'Slide to complete habit'
                  : isDeepWork
                  ? 'Slide to complete session'
                  : 'Slide to complete task'
              }
              completedLabel="Completed!"
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

