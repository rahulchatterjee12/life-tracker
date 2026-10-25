'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { updateTask } from '@/lib/features/tasks/tasksSlice';
import { ITask, TaskImportance, HabitFrequency, AdminRecurringCycle } from '@/types/database';
import { X, Calendar, Clock, Flame } from 'lucide-react';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ITask | null;
}

function EditTaskForm({ task, onClose }: { task: ITask; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const existingTasks = useAppSelector((state) => state.tasks.items);

  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [importance, setImportance] = useState<TaskImportance>((task.importance as TaskImportance) || 3);
  const [isFrog, setIsFrog] = useState(Boolean(task.isFrog));

  // Deep work fields
  const [targetMinutes, setTargetMinutes] = useState(
    task.deepWorkDetails?.targetDurationMinutes || 45
  );

  // Habit fields
  const [habitFrequency, setHabitFrequency] = useState<HabitFrequency>(
    task.habitDetails?.frequency || 'daily'
  );
  const [monthlyGoal, setMonthlyGoal] = useState<number>(
    task.habitDetails?.monthlyGoal || 31
  );
  const [nextTaskId, setNextTaskId] = useState<string>(
    task.habitDetails?.nextTaskId ? String(task.habitDetails.nextTaskId) : ''
  );

  // Admin fields
  const getInitialDueDate = () => {
    if (!task.adminDetails?.dueDate) return '2026-10-28';
    try {
      return new Date(task.adminDetails.dueDate).toISOString().split('T')[0];
    } catch {
      return '2026-10-28';
    }
  };

  const [dueDate, setDueDate] = useState<string>(getInitialDueDate);
  const [isRecurring, setIsRecurring] = useState(Boolean(task.adminDetails?.isRecurring));
  const [recurringCycle, setRecurringCycle] = useState<AdminRecurringCycle>(
    task.adminDetails?.recurringCycle || 'monthly'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const taskId = String(task._id);

    const updatePayload = {
      id: taskId,
      title: title.trim(),
      description: description.trim() || undefined,
      importance,
      isFrog,
      type: task.type,
      habitDetails:
        task.type === 'HABIT'
          ? {
              frequency: habitFrequency,
              monthlyGoal,
              nextTaskId: nextTaskId || undefined,
            }
          : undefined,
      deepWorkDetails:
        task.type === 'DEEP_WORK'
          ? {
              targetDurationMinutes: targetMinutes,
            }
          : undefined,
      adminDetails:
        task.type === 'ADMIN'
          ? {
              dueDate,
              isRecurring,
              recurringCycle: isRecurring ? recurringCycle : 'none',
            }
          : undefined,
    };

    // Update Redux state
    dispatch(updateTask(updatePayload));

    // Persist to MongoDB API
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
    } catch {
      // Local state is updated
    }

    onClose();
  };

  const TypeIcon =
    task.type === 'HABIT' ? Flame : task.type === 'DEEP_WORK' ? Clock : Calendar;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="relative w-full max-w-md p-6 rounded-2xl bg-surface border border-border shadow-2xl text-txt my-8 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-light pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-surface-2 text-accent">
            <TypeIcon className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-txt">
              Edit {task.type === 'HABIT' ? 'Habit' : task.type === 'DEEP_WORK' ? 'Deep Work Task' : 'Admin Task'}
            </h3>
            <p className="text-[11px] text-txt-3">Modify task configuration and tracking settings</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-txt-3 hover:text-txt transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-[11px] font-medium uppercase text-txt-2 mb-1">
            Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-sm text-txt placeholder-txt-3 focus:outline-hidden focus:border-accent"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[11px] font-medium uppercase text-txt-2 mb-1">
            Description / Notes
          </label>
          <input
            type="text"
            placeholder="Optional notes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs text-txt placeholder-txt-3 focus:outline-hidden focus:border-accent"
          />
        </div>

        {/* Importance Rating & Eat That Frog */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium uppercase text-txt-2 mb-1">
              Importance
            </label>
            <select
              value={importance}
              onChange={(e) => setImportance(Number(e.target.value) as TaskImportance)}
              className="w-full px-2.5 py-2 rounded-xl bg-bg border border-border text-xs text-txt focus:outline-hidden focus:border-accent"
            >
              <option value={1}>1 - Minor</option>
              <option value={2}>2 - Standard</option>
              <option value={3}>3 - Important</option>
              <option value={4}>4 - High Value</option>
              <option value={5}>5 - Mission Critical</option>
            </select>
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-txt-2 hover:text-txt">
              <input
                type="checkbox"
                checked={isFrog}
                onChange={(e) => setIsFrog(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              <span>Daily Frog</span>
            </label>
          </div>
        </div>

        {/* TYPE SPECIFIC FIELDS */}
        {task.type === 'DEEP_WORK' && (
          <div className="space-y-1">
            <label className="block text-[11px] font-medium uppercase text-txt-2">
              Target Duration (Minutes)
            </label>
            <input
              type="number"
              min="5"
              max="360"
              value={targetMinutes}
              onChange={(e) => setTargetMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs text-txt focus:outline-hidden focus:border-accent"
            />
          </div>
        )}

        {task.type === 'HABIT' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium uppercase text-txt-2 mb-1">
                  Frequency
                </label>
                <select
                  value={habitFrequency}
                  onChange={(e) => setHabitFrequency(e.target.value as HabitFrequency)}
                  className="w-full px-2.5 py-2 rounded-xl bg-bg border border-border text-xs text-txt focus:outline-hidden focus:border-accent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="custom">Custom Days</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase text-txt-2 mb-1">
                  Monthly Goal (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={monthlyGoal}
                  onChange={(e) => setMonthlyGoal(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs text-txt focus:outline-hidden focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase text-txt-2 mb-1">
                Habit Stacking Chain (Next Task)
              </label>
              <select
                value={nextTaskId}
                onChange={(e) => setNextTaskId(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-bg border border-border text-xs text-txt focus:outline-hidden focus:border-accent"
              >
                <option value="">None (Standalone habit)</option>
                {existingTasks
                  .filter((t) => String(t._id) !== String(task._id))
                  .map((t) => (
                    <option key={String(t._id)} value={String(t._id)}>
                      {t.title} ({t.type})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {task.type === 'ADMIN' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium uppercase text-txt-2 mb-1">
                Due Date
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs text-txt focus:outline-hidden focus:border-accent"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editIsRecurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              <label
                htmlFor="editIsRecurring"
                className="text-xs text-txt-2 cursor-pointer select-none"
              >
                Recurring Admin Task
              </label>
            </div>

            {isRecurring && (
              <div>
                <label className="block text-[11px] font-medium uppercase text-txt-2 mb-1">
                  Cycle
                </label>
                <select
                  value={recurringCycle}
                  onChange={(e) => setRecurringCycle(e.target.value as AdminRecurringCycle)}
                  className="w-full px-2.5 py-2 rounded-xl bg-bg border border-border text-xs text-txt focus:outline-hidden focus:border-accent"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-light">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-txt-2 hover:bg-surface-2 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium transition cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </form>
    </motion.div>
  );
}

export default function EditTaskModal({ isOpen, onClose, task }: EditTaskModalProps) {
  if (!isOpen || !task) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
        <EditTaskForm key={String(task._id)} task={task} onClose={onClose} />
      </div>
    </AnimatePresence>
  );
}
