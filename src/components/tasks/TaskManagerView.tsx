'use client';

import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { deleteTask } from '@/lib/features/tasks/tasksSlice';
import { ITask, TaskType } from '@/types/database';
import NewTaskModal from '@/components/tasks/NewTaskModal';
import EditTaskModal from '@/components/tasks/EditTaskModal';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Flame,
  Clock,
  Calendar,
  CheckCircle2,
  Circle,
  Sparkles,
  SlidersHorizontal,
  X,
} from 'lucide-react';

export default function TaskManagerView() {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector((state) => state.tasks.items);

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ITask | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | TaskType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'importance' | 'title'>('newest');

  const handleDelete = async (task: ITask) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${task.title}"?`);
    if (!confirmed) return;

    const taskId = String(task._id);
    dispatch(deleteTask(taskId));

    try {
      await fetch(`/api/tasks?id=${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
      });
    } catch {
      // Local state is updated
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Category filter
    if (categoryFilter !== 'ALL' && task.type !== categoryFilter) {
      return false;
    }

    // Status filter
    if (statusFilter === 'active' && task.completed) return false;
    if (statusFilter === 'completed' && !task.completed) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    return true;
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'importance') {
      return (b.importance || 0) - (a.importance || 0);
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    // 'newest' default
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  // Quick stats
  const totalCount = tasks.length;
  const habitsCount = tasks.filter((t) => t.type === 'HABIT').length;
  const deepWorkCount = tasks.filter((t) => t.type === 'DEEP_WORK').length;
  const adminCount = tasks.filter((t) => t.type === 'ADMIN').length;
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-6">
      {/* Modals */}
      <NewTaskModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} />
      <EditTaskModal
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        task={editingTask}
      />

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-txt tracking-tight">
            Manage Tasks &amp; Habits
          </h2>
          <p className="text-xs text-txt-2 mt-1">
            Create new habits, modify parameters and schedules, or delete tasks.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs sm:text-sm font-medium transition cursor-pointer self-start sm:self-auto shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Create Task / Habit</span>
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-surface border border-border-light">
          <p className="text-[11px] font-medium text-txt-2 uppercase tracking-wider">Total Items</p>
          <p className="text-xl font-semibold text-txt mt-1">{totalCount}</p>
          <p className="text-[11px] text-txt-3 mt-0.5">{completedCount} currently completed</p>
        </div>
        <div className="p-3.5 rounded-xl bg-surface border border-border-light">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-txt-2 uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-warn" />
            <span>Daily Habits</span>
          </div>
          <p className="text-xl font-semibold text-txt mt-1">{habitsCount}</p>
          <p className="text-[11px] text-txt-3 mt-0.5">Recurring streak trackers</p>
        </div>
        <div className="p-3.5 rounded-xl bg-surface border border-border-light">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-txt-2 uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-accent" />
            <span>Deep Work</span>
          </div>
          <p className="text-xl font-semibold text-txt mt-1">{deepWorkCount}</p>
          <p className="text-[11px] text-txt-3 mt-0.5">Focus timer blocks</p>
        </div>
        <div className="p-3.5 rounded-xl bg-surface border border-border-light">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-txt-2 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-txt-3" />
            <span>Admin Tasks</span>
          </div>
          <p className="text-xl font-semibold text-txt mt-1">{adminCount}</p>
          <p className="text-[11px] text-txt-3 mt-0.5">Checklists and scheduled items</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-surface border border-border-light space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-txt-3 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tasks and habits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-bg border border-border text-xs text-txt placeholder-txt-3 focus:outline-hidden focus:border-accent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-txt-3 hover:text-txt cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-txt-3" />
            <span className="text-xs text-txt-2">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-2.5 py-1.5 rounded-xl bg-bg border border-border text-xs text-txt focus:outline-hidden focus:border-accent cursor-pointer"
            >
              <option value="newest">Recently Added</option>
              <option value="importance">Highest Importance</option>
              <option value="title">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border-light">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-surface-2 rounded-xl p-1 border border-border-light">
            {(['ALL', 'HABIT', 'DEEP_WORK', 'ADMIN'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-bg text-txt shadow-xs font-semibold'
                    : 'text-txt-2 hover:text-txt'
                }`}
              >
                {cat === 'ALL'
                  ? `All (${totalCount})`
                  : cat === 'HABIT'
                  ? `Habits (${habitsCount})`
                  : cat === 'DEEP_WORK'
                  ? `Deep Work (${deepWorkCount})`
                  : `Admin (${adminCount})`}
              </button>
            ))}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-txt-3 mr-1">Status:</span>
            {(['all', 'active', 'completed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg capitalize transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-txt-3 hover:text-txt'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-txt-3 px-1">
          <span>Showing {sortedTasks.length} of {tasks.length} items</span>
        </div>

        {sortedTasks.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-surface border border-border-light space-y-3">
            <p className="text-sm text-txt-3">No tasks or habits match your current filter.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('ALL');
                setStatusFilter('all');
              }}
              className="text-xs text-accent hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {sortedTasks.map((task) => {
              const taskId = String(task._id);
              const isHabit = task.type === 'HABIT';
              const isDeepWork = task.type === 'DEEP_WORK';
              const isAdmin = task.type === 'ADMIN';

              return (
                <div
                  key={taskId}
                  className="p-4 sm:p-5 rounded-2xl bg-surface border border-border-light hover:border-border transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Info */}
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Category Icon Badge */}
                      <div
                        className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                          isHabit
                            ? 'bg-warn/10 text-warn'
                            : isDeepWork
                            ? 'bg-accent/10 text-accent'
                            : 'bg-surface-2 text-txt-2'
                        }`}
                      >
                        {isHabit && <Flame className="w-4 h-4" />}
                        {isDeepWork && <Clock className="w-4 h-4" />}
                        {isAdmin && <Calendar className="w-4 h-4" />}
                      </div>

                      {/* Content */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-txt">{task.title}</h3>
                          {task.isFrog && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-warn/10 text-warn font-medium">
                              <Sparkles className="w-2.5 h-2.5" />
                              Daily Frog
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 text-txt-3 font-medium">
                            ★ {task.importance} Importance
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-xs text-txt-2 mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        {/* Specific parameters */}
                        <div className="flex items-center gap-3 flex-wrap mt-2 text-[11px] text-txt-3">
                          {isHabit && (
                            <>
                              <span className="capitalize">
                                Frequency: <span className="text-txt font-medium">{task.habitDetails?.frequency || 'daily'}</span>
                              </span>
                              <span>·</span>
                              <span>
                                Goal: <span className="text-txt font-medium">{task.habitDetails?.monthlyGoal || 31} days/mo</span>
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-1 text-warn font-medium">
                                <Flame className="w-3 h-3" />
                                {task.habitDetails?.streakCount || 0}d current streak (best: {task.habitDetails?.bestStreak || 0}d)
                              </span>
                            </>
                          )}

                          {isDeepWork && (
                            <>
                              <span>
                                Target Focus: <span className="text-txt font-medium">{task.deepWorkDetails?.targetDurationMinutes || 45} mins</span>
                              </span>
                              {task.deepWorkDetails?.actualDurationSeconds ? (
                                <>
                                  <span>·</span>
                                  <span>
                                    Tracked: <span className="text-txt font-medium">{Math.round((task.deepWorkDetails.actualDurationSeconds || 0) / 60)} mins</span>
                                  </span>
                                </>
                              ) : null}
                            </>
                          )}

                          {isAdmin && (
                            <>
                              <span>
                                Due:{' '}
                                <span className="text-txt font-medium">
                                  {task.adminDetails ? new Date(task.adminDetails.dueDate).toLocaleDateString() : 'N/A'}
                                </span>
                              </span>
                              {task.adminDetails?.isRecurring && (
                                <>
                                  <span>·</span>
                                  <span className="capitalize">
                                    Repeats: {task.adminDetails.recurringCycle}
                                  </span>
                                </>
                              )}
                              {task.adminDetails?.subtasks && task.adminDetails.subtasks.length > 0 && (
                                <>
                                  <span>·</span>
                                  <span>
                                    {task.adminDetails.subtasks.filter((s) => s.completed).length}/
                                    {task.adminDetails.subtasks.length} subtasks
                                  </span>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Status badge */}
                    <div className="shrink-0">
                      {task.completed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-ok/10 text-ok border border-ok/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-surface-2 text-txt-3 border border-border-light">
                          <Circle className="w-3.5 h-3.5" />
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons (Edit & Delete) */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-light">
                    <button
                      onClick={() => setEditingTask(task)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface border border-border-light text-txt text-xs font-medium transition cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-accent" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(task)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-bad/10 text-txt-3 hover:text-bad border border-transparent hover:border-bad/20 text-xs font-medium transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

