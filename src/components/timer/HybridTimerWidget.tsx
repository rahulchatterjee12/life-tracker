'use client';

import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  toggleZenMode,
} from '@/lib/features/timer/timerSlice';
import { completeDeepWorkTask } from '@/lib/features/tasks/tasksSlice';
import { awardPoints } from '@/lib/features/vault/vaultSlice';
import { calculateDeepWorkPoints } from '@/lib/gamification/engine';
import { useMounted } from '@/lib/useMounted';
import {
  Play,
  Pause,
  Check,
  Maximize2,
  Clock,
  Edit3,
} from 'lucide-react';

export default function HybridTimerWidget() {
  const dispatch = useAppDispatch();
  const timer = useAppSelector((state) => state.timer);
  const tasks = useAppSelector((state) => state.tasks.items);
  const isMounted = useMounted();

  const [mode, setMode] = useState<'LIVE' | 'MANUAL'>('LIVE');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [targetDuration, setTargetDuration] = useState<number>(45);
  const [manualDuration, setManualDuration] = useState<number>(30);

  // Hydration-safe derived timer states
  const isRunning = isMounted ? timer.isRunning : false;
  const isPaused = isMounted ? timer.isPaused : false;
  const displaySeconds = isMounted ? timer.elapsedSeconds : 0;
  const activeTaskId = isMounted ? timer.taskId : null;

  const deepWorkTasks = tasks.filter((t) => t.type === 'DEEP_WORK' && !t.completed);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTask = tasks.find(
    (t) => String(t._id) === (activeTaskId || selectedTaskId || (deepWorkTasks[0]?._id ? String(deepWorkTasks[0]._id) : ''))
  );

  const handleStartLive = () => {
    const task = currentTask || deepWorkTasks[0];
    if (!task) return;

    dispatch(
      startTimer({
        taskId: String(task._id),
        taskTitle: task.title,
        targetDurationMinutes: targetDuration,
        openZenMode: false,
      })
    );
  };

  const handleFinishLive = async () => {
    if (!timer.taskId) return;

    const task = tasks.find((t) => String(t._id) === timer.taskId);
    const importance = task?.importance || 3;

    const result = calculateDeepWorkPoints({
      targetMinutes: timer.targetDurationMinutes,
      actualDurationSeconds: timer.elapsedSeconds,
      importance,
      isLiveTracked: true,
      isFrog: task?.isFrog,
      completedAt: new Date(),
    });

    const totalAwarded = result.totalPoints;

    dispatch(
      completeDeepWorkTask({
        taskId: timer.taskId,
        actualDurationSeconds: timer.elapsedSeconds,
        isLiveTracked: true,
        pointsEarned: totalAwarded,
        overtimeSeconds: result.overtimeSeconds,
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
        description: `Deep Work: ${timer.taskTitle} (${Math.round(timer.elapsedSeconds / 60)}m)`,
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
      // Local state is already updated
    }

    dispatch(stopTimer());
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const task = currentTask || deepWorkTasks[0];
    if (!task) return;

    const importance = task.importance || 3;

    const result = calculateDeepWorkPoints({
      targetMinutes: manualDuration,
      actualDurationSeconds: manualDuration * 60,
      importance,
      isLiveTracked: false,
      isFrog: task.isFrog,
      completedAt: new Date(),
    });

    const totalAwarded = result.totalPoints;

    const now = new Date();
    const startTime = new Date(now.getTime() - manualDuration * 60000);
    const manualSessions = [
      {
        id: `manual-${task._id}-${manualDuration}`,
        startedAt: startTime,
        endedAt: now,
        durationSeconds: manualDuration * 60,
      },
    ];

    dispatch(
      completeDeepWorkTask({
        taskId: String(task._id),
        actualDurationSeconds: manualDuration * 60,
        isLiveTracked: false,
        pointsEarned: totalAwarded,
        overtimeSeconds: 0,
        overtimeBonusAwarded: false,
        sessions: manualSessions,
      })
    );

    dispatch(
      awardPoints({
        pointsDelta: totalAwarded,
        type: 'TASK_COMPLETION',
        description: `Manual Deep Work: ${task.title} (${manualDuration}m, -10% penalty)`,
        taskId: String(task._id),
        metadata: {
          basePoints: result.basePoints,
          manualPenaltyDeduction: result.manualPenaltyDeduction,
          isLiveTracked: false,
          breakdown: result.breakdown,
        },
      })
    );

    try {
      await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: String(task._id),
          actualDurationSeconds: manualDuration * 60,
          isLiveTracked: false,
          sessions: manualSessions,
        }),
      });
    } catch {
      // Local state updated
    }
  };

  return (
    <section className="p-5 rounded-2xl bg-surface border border-border space-y-4 shadow-sm" suppressHydrationWarning>
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isRunning ? 'bg-ok animate-pulse' : 'bg-txt-3'
            }`}
          />
          <span className="text-xs font-medium uppercase tracking-wider text-txt-2">
            {isRunning ? 'Focus Active' : 'Focus Timer'}
          </span>
        </div>

        {/* Minimal Mode Pill */}
        <div className="flex items-center bg-surface-2 rounded-xl p-0.5 border border-border-light">
          <button
            onClick={() => setMode('LIVE')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              mode === 'LIVE'
                ? 'bg-bg text-txt shadow-sm'
                : 'text-txt-2 hover:text-txt'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Live</span>
          </button>
          <button
            onClick={() => setMode('MANUAL')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              mode === 'MANUAL'
                ? 'bg-bg text-txt shadow-sm'
                : 'text-txt-2 hover:text-txt'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Manual</span>
          </button>
        </div>
      </div>

      {mode === 'LIVE' ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          {/* Task Select & Target */}
          <div className="space-y-2 flex-1 max-w-sm">
            <select
              disabled={isRunning || isPaused}
              value={activeTaskId || selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full text-sm font-medium bg-bg text-txt border border-border rounded-xl px-3 py-2 cursor-pointer disabled:opacity-60 focus:outline-hidden focus:border-accent"
            >
              {deepWorkTasks.length === 0 ? (
                <option value="">No active Deep Work tasks</option>
              ) : (
                deepWorkTasks.map((t) => (
                  <option key={String(t._id)} value={String(t._id)}>
                    {t.title}
                  </option>
                ))
              )}
            </select>

            <div className="flex items-center gap-2 text-xs text-txt-2">
              <span className="text-txt-3">Target:</span>
              {[25, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  disabled={isRunning || isPaused}
                  onClick={() => setTargetDuration(mins)}
                  className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                    (isRunning || isPaused
                      ? timer.targetDurationMinutes === mins
                      : targetDuration === mins)
                      ? 'bg-accent/10 text-accent font-semibold'
                      : 'text-txt-3 hover:text-txt-2'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Time & Controls */}
          <div className="flex items-center gap-4 justify-between sm:justify-end">
            <div
              className="font-mono text-3xl sm:text-4xl font-light text-txt tabular-nums"
              suppressHydrationWarning
            >
              {formatTime(displaySeconds)}
            </div>

            <div className="flex items-center gap-2">
              {!isRunning && !isPaused && (
                <button
                  onClick={handleStartLive}
                  disabled={!currentTask && deepWorkTasks.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition cursor-pointer disabled:opacity-40 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start</span>
                </button>
              )}

              {isRunning && (
                <button
                  onClick={() => dispatch(pauseTimer())}
                  className="p-2.5 rounded-xl bg-surface-2 hover:bg-border-light text-txt transition cursor-pointer"
                  title="Pause"
                >
                  <Pause className="w-4 h-4" />
                </button>
              )}

              {isPaused && (
                <button
                  onClick={() => dispatch(resumeTimer())}
                  className="p-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white transition cursor-pointer"
                  title="Resume"
                >
                  <Play className="w-4 h-4 fill-current" />
                </button>
              )}

              {(isRunning || isPaused) && (
                <button
                  onClick={handleFinishLive}
                  className="p-2.5 rounded-xl bg-ok/10 hover:bg-ok/20 text-ok transition cursor-pointer"
                  title="Finish & Claim Points"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}

              {activeTaskId && (
                <button
                  onClick={() => dispatch(toggleZenMode(true))}
                  className="p-2.5 rounded-xl text-txt-2 hover:text-txt hover:bg-surface-2 transition cursor-pointer"
                  title="Zen Mode"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Minimalist Manual Log Form */
        <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full sm:flex-1 text-sm bg-bg border border-border rounded-xl px-3 py-2 text-txt focus:outline-hidden focus:border-accent"
          >
            {deepWorkTasks.map((t) => (
              <option key={String(t._id)} value={String(t._id)}>
                {t.title}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="number"
              min="5"
              max="360"
              value={manualDuration}
              onChange={(e) => setManualDuration(Number(e.target.value))}
              className="w-20 text-sm bg-bg border border-border rounded-xl px-3 py-2 text-txt text-center focus:outline-hidden focus:border-accent"
            />
            <span className="text-xs text-txt-3">min</span>

            <button
              type="submit"
              disabled={!currentTask && deepWorkTasks.length === 0}
              className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition cursor-pointer shrink-0 disabled:opacity-40 shadow-sm"
            >
              Log (-10%)
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
