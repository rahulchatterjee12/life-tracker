'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  addDeepWorkTask,
  addHabitTask,
  addAdminTask,
} from '@/lib/features/tasks/tasksSlice';
import { TaskType, TaskImportance, HabitFrequency, AdminRecurringCycle } from '@/types/database';
import { X, Calendar, Clock, Flame } from 'lucide-react';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewTaskModal({ isOpen, onClose }: NewTaskModalProps) {
  const dispatch = useAppDispatch();
  const existingTasks = useAppSelector((state) => state.tasks.items);

  const [type, setType] = useState<TaskType>('DEEP_WORK');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState<TaskImportance>(3);
  const [isFrog, setIsFrog] = useState(false);

  // Deep work fields
  const [targetMinutes, setTargetMinutes] = useState(45);

  // Habit fields
  const [habitFrequency, setHabitFrequency] = useState<HabitFrequency>('daily');
  const [nextTaskId, setNextTaskId] = useState<string>('');

  // Admin fields
  const [dueDate, setDueDate] = useState<string>('2026-10-28');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringCycle, setRecurringCycle] = useState<AdminRecurringCycle>('monthly');
  const [subtasks, setSubtasks] = useState<Array<{ title: string; offsetDaysBeforeParent: number }>>([
    { title: 'Buy card / gift in advance', offsetDaysBeforeParent: 7 },
  ]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([...subtasks, { title: newSubtaskTitle.trim(), offsetDaysBeforeParent: 0 }]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (type === 'DEEP_WORK') {
      dispatch(
        addDeepWorkTask({
          title: title.trim(),
          description: description.trim() || undefined,
          targetDurationMinutes: targetMinutes,
          importance,
          isFrog,
        })
      );
    } else if (type === 'HABIT') {
      dispatch(
        addHabitTask({
          title: title.trim(),
          description: description.trim() || undefined,
          frequency: habitFrequency,
          importance,
          nextTaskId: nextTaskId || undefined,
        })
      );
    } else if (type === 'ADMIN') {
      dispatch(
        addAdminTask({
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate,
          isRecurring,
          recurringCycle: isRecurring ? recurringCycle : 'none',
          importance,
          subtasks,
        })
      );
    }

    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md p-6 rounded-2xl bg-surface border border-border shadow-2xl text-txt my-8 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-light pb-3">
            <h3 className="text-sm font-semibold text-txt">
              New Task
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-txt-3 hover:text-txt transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Type Segmented Control */}
          <div className="flex p-0.5 bg-surface-2 rounded-xl border border-border-light">
            {[
              { id: 'DEEP_WORK', label: 'Deep Work', icon: Clock },
              { id: 'HABIT', label: 'Habit', icon: Flame },
              { id: 'ADMIN', label: 'Admin', icon: Calendar },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setType(tab.id as TaskType)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    type === tab.id
                      ? 'bg-bg text-txt font-semibold shadow-sm'
                      : 'text-txt-2 hover:text-txt'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <input
                type="text"
                required
                placeholder={
                  type === 'DEEP_WORK'
                    ? 'Task name (e.g. Code auth flow)'
                    : type === 'HABIT'
                    ? 'Habit name (e.g. Morning meditation)'
                    : 'Admin event (e.g. Credit card payment)'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-sm text-txt placeholder-txt-3 focus:outline-hidden focus:border-accent"
              />
            </div>

            {/* Description */}
            <div>
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
            {type === 'DEEP_WORK' && (
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

            {type === 'HABIT' && (
              <div className="space-y-3">
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
                    <option value="weekdays">Weekdays (Mon-Fri)</option>
                    <option value="weekends">Weekends (Sat-Sun)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase text-txt-2 mb-1">
                    Habit Stacking (Chain To)
                  </label>
                  <select
                    value={nextTaskId}
                    onChange={(e) => setNextTaskId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-bg border border-border text-xs text-txt focus:outline-hidden focus:border-accent"
                  >
                    <option value="">None</option>
                    {existingTasks.map((t) => (
                      <option key={String(t._id)} value={String(t._id)}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {type === 'ADMIN' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium uppercase text-txt-2 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-bg border border-border text-xs text-txt focus:outline-hidden focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium uppercase text-txt-2 mb-1">
                      Recurrence
                    </label>
                    <div className="flex items-center gap-2 pt-1.5">
                      <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="h-4 w-4 rounded border-border accent-accent"
                      />
                      <select
                        disabled={!isRecurring}
                        value={recurringCycle}
                        onChange={(e) => setRecurringCycle(e.target.value as AdminRecurringCycle)}
                        className="bg-transparent text-xs text-txt focus:outline-hidden disabled:opacity-40"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Relational Subtasks */}
                <div className="space-y-2 pt-2 border-t border-border-light">
                  <label className="block text-[11px] font-medium uppercase text-txt-2">
                    Relational Sub-tasks
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Buy gift 7 days prior"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-bg border border-border text-xs text-txt placeholder-txt-3 focus:outline-hidden focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={handleAddSubtask}
                      className="px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-border-light text-xs font-medium text-txt cursor-pointer"
                    >
                      Add
                    </button>
                  </div>

                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {subtasks.map((sub, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-surface-2 text-xs text-txt-2"
                      >
                        <span>{sub.title}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(idx)}
                          className="text-txt-3 hover:text-bad cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-3 border-t border-border-light">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs text-txt-2 hover:text-txt transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition cursor-pointer shadow-sm"
              >
                Create
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
