import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  ITask,
  TaskType,
  TaskImportance,
  HabitFrequency,
  AdminRecurringCycle,
  IDeepWorkSession,
  IAdminSubtask,
} from '@/types/database';
import {
  calculateHabitStreak,
  applyDailyResetToTasks,
  getLocalDateString,
} from '@/lib/gamification/streaks';

export interface TasksState {
  items: ITask[];
  selectedCategory: 'ALL' | TaskType;
  filterStatus: 'all' | 'active' | 'completed';
  dailyFrogId: string | null;
  activeHabitStackModal: {
    isOpen: boolean;
    completedHabitTitle?: string;
    nextTaskId?: string;
    nextTaskTitle?: string;
  };
  isLoading: boolean;
  error: string | null;
}

const initialState: TasksState = {
  items: [],
  selectedCategory: 'ALL',
  filterStatus: 'all',
  dailyFrogId: null,
  activeHabitStackModal: {
    isOpen: false,
  },
  isLoading: false,
  error: null,
};

export interface UpdateTaskPayload {
  id?: string;
  _id?: string | import('mongoose').Types.ObjectId;
  title?: string;
  description?: string;
  url?: string;
  importance?: TaskImportance;
  isFrog?: boolean;
  type?: TaskType;
  completed?: boolean;
  completedAt?: Date;
  pointsAwarded?: number;
  completionHistory?: import('@/types/database').ITaskCompletionEvent[];
  habitDetails?: Partial<import('@/types/database').IHabitDetails>;
  deepWorkDetails?: Partial<import('@/types/database').IDeepWorkDetails>;
  adminDetails?: Partial<Omit<import('@/types/database').IAdminDetails, 'dueDate'>> & {
    dueDate?: Date | string;
  };
}

export const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<ITask[]>) => {
      const todayStr = getLocalDateString();
      const { updatedTasks } = applyDailyResetToTasks(action.payload, todayStr);
      state.items = updatedTasks as ITask[];
    },

    addTask: (state, action: PayloadAction<ITask>) => {
      state.items.unshift(action.payload);
      if (action.payload.isFrog) {
        state.items.forEach((t) => {
          if (String(t._id) !== String(action.payload._id)) {
            t.isFrog = false;
          }
        });
        state.dailyFrogId = String(action.payload._id);
      }
    },

    setSelectedCategory: (state, action: PayloadAction<'ALL' | TaskType>) => {
      state.selectedCategory = action.payload;
    },

    setFilterStatus: (state, action: PayloadAction<'all' | 'active' | 'completed'>) => {
      state.filterStatus = action.payload;
    },

    addDeepWorkTask: (
      state,
      action: PayloadAction<{
        title: string;
        description?: string;
        url?: string;
        targetDurationMinutes: number;
        importance?: TaskImportance;
        isFrog?: boolean;
      }>
    ) => {
      const id = 'task-' + Date.now();
      const newTask: ITask = {
        _id: id as unknown as import('mongoose').Types.ObjectId,
        userId: 'user-default',
        title: action.payload.title,
        description: action.payload.description,
        url: action.payload.url,
        type: 'DEEP_WORK',
        importance: action.payload.importance || 3,
        isFrog: !!action.payload.isFrog,
        completed: false,
        pointsAwarded: 0,
        deepWorkDetails: {
          targetDurationMinutes: action.payload.targetDurationMinutes,
          actualDurationSeconds: 0,
          isLiveTracked: true,
          overtimeBonusAwarded: false,
          overtimeSeconds: 0,
          sessions: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (newTask.isFrog) {
        state.items.forEach((t) => (t.isFrog = false));
        state.dailyFrogId = id;
      }

      state.items.unshift(newTask);
    },

    addHabitTask: (
      state,
      action: PayloadAction<{
        title: string;
        description?: string;
        url?: string;
        frequency: HabitFrequency;
        customDays?: number[];
        importance?: TaskImportance;
        nextTaskId?: string;
      }>
    ) => {
      const newTask: ITask = {
        _id: ('task-' + Date.now()) as unknown as import('mongoose').Types.ObjectId,
        userId: 'user-default',
        title: action.payload.title,
        description: action.payload.description,
        url: action.payload.url,
        type: 'HABIT',
        importance: action.payload.importance || 3,
        isFrog: false,
        completed: false,
        pointsAwarded: 0,
        habitDetails: {
          frequency: action.payload.frequency,
          customDays: action.payload.customDays || [],
          streakCount: 0,
          bestStreak: 0,
          nextTaskId: action.payload.nextTaskId,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      state.items.unshift(newTask);
    },

    addAdminTask: (
      state,
      action: PayloadAction<{
        title: string;
        description?: string;
        url?: string;
        dueDate: string;
        isRecurring?: boolean;
        recurringCycle?: AdminRecurringCycle;
        dayOfMonth?: number;
        importance?: TaskImportance;
        subtasks?: Array<{ title: string; offsetDaysBeforeParent?: number }>;
      }>
    ) => {
      const subtasks: IAdminSubtask[] = (action.payload.subtasks || []).map((s, idx) => ({
        id: `sub-${Date.now()}-${idx}`,
        title: s.title,
        completed: false,
        offsetDaysBeforeParent: s.offsetDaysBeforeParent || 0,
      }));

      const newTask: ITask = {
        _id: ('task-' + Date.now()) as unknown as import('mongoose').Types.ObjectId,
        userId: 'user-default',
        title: action.payload.title,
        description: action.payload.description,
        url: action.payload.url,
        type: 'ADMIN',
        importance: action.payload.importance || 3,
        isFrog: false,
        completed: false,
        pointsAwarded: 0,
        adminDetails: {
          dueDate: new Date(action.payload.dueDate),
          isRecurring: !!action.payload.isRecurring,
          recurringCycle: action.payload.recurringCycle || 'none',
          dayOfMonth: action.payload.dayOfMonth,
          subtasks,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      state.items.unshift(newTask);
    },

    toggleHabitCompletion: (state, action: PayloadAction<string>) => {
      const habit = state.items.find((t) => String(t._id) === action.payload);
      if (habit && habit.type === 'HABIT' && habit.habitDetails) {
        habit.completed = !habit.completed;
        const activeDateStr = getLocalDateString();
        const dates = habit.habitDetails.completedDates || [];

        if (habit.completed) {
          habit.completedAt = new Date();
          habit.habitDetails.lastCompletedDate = activeDateStr;
          if (!dates.includes(activeDateStr)) {
            habit.habitDetails.completedDates = [...dates, activeDateStr];
          }

          // Trigger Habit Stacking modal if a nextTaskId is chained!
          if (habit.habitDetails.nextTaskId) {
            const nextTask = state.items.find(
              (t) => String(t._id) === String(habit.habitDetails?.nextTaskId)
            );
            state.activeHabitStackModal = {
              isOpen: true,
              completedHabitTitle: habit.title,
              nextTaskId: String(habit.habitDetails.nextTaskId),
              nextTaskTitle: nextTask?.title || 'Next Stacked Task',
            };
          }
        } else {
          habit.completedAt = undefined;
          habit.habitDetails.completedDates = dates.filter((d) => d !== activeDateStr);
          if (habit.habitDetails.lastCompletedDate === activeDateStr) {
            const remaining = habit.habitDetails.completedDates;
            habit.habitDetails.lastCompletedDate = remaining.length > 0 ? remaining[remaining.length - 1] : undefined;
          }
        }

        const { currentStreak, bestStreak } = calculateHabitStreak(habit as any, activeDateStr);
        habit.habitDetails.streakCount = currentStreak;
        habit.habitDetails.bestStreak = Math.max(habit.habitDetails.bestStreak || 0, bestStreak);
      }
    },

    closeHabitStackModal: (state) => {
      state.activeHabitStackModal = {
        isOpen: false,
      };
    },

    completeDeepWorkTask: (
      state,
      action: PayloadAction<{
        taskId: string;
        actualDurationSeconds: number;
        isLiveTracked: boolean;
        pointsEarned: number;
        overtimeSeconds: number;
        overtimeBonusAwarded: boolean;
        sessions: IDeepWorkSession[];
      }>
    ) => {
      const task = state.items.find((t) => String(t._id) === action.payload.taskId);
      if (task && task.type === 'DEEP_WORK' && task.deepWorkDetails) {
        task.completed = true;
        task.completedAt = new Date();
        task.pointsAwarded = action.payload.pointsEarned;
        task.deepWorkDetails.actualDurationSeconds = action.payload.actualDurationSeconds;
        task.deepWorkDetails.isLiveTracked = action.payload.isLiveTracked;
        task.deepWorkDetails.overtimeSeconds = action.payload.overtimeSeconds;
        task.deepWorkDetails.overtimeBonusAwarded = action.payload.overtimeBonusAwarded;
        task.deepWorkDetails.sessions = action.payload.sessions;

        if (task.isFrog) {
          const now = new Date();
          task.frogCompletedBeforeNoon = now.getHours() < 12;
        }
      }
    },

    toggleAdminSubtask: (
      state,
      action: PayloadAction<{ taskId: string; subtaskId: string }>
    ) => {
      const task = state.items.find((t) => String(t._id) === action.payload.taskId);
      if (task && task.type === 'ADMIN' && task.adminDetails) {
        const sub = task.adminDetails.subtasks.find((s) => s.id === action.payload.subtaskId);
        if (sub) {
          sub.completed = !sub.completed;
        }
      }
    },

    toggleAdminTaskCompletion: (state, action: PayloadAction<string>) => {
      const task = state.items.find((t) => String(t._id) === action.payload);
      if (task && task.type === 'ADMIN') {
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date() : undefined;
      }
    },

    setTaskCompletionStatus: (
      state,
      action: PayloadAction<{ taskId: string; completed: boolean }>
    ) => {
      const { taskId, completed } = action.payload;
      const task = state.items.find((t) => String(t._id) === taskId);
      if (!task) return;

      if (task.type === 'HABIT' && task.habitDetails) {
        if (task.completed === completed) return;
        task.completed = completed;
        const activeDateStr = getLocalDateString();
        const dates = task.habitDetails.completedDates || [];
        if (completed) {
          task.completedAt = new Date();
          task.habitDetails.lastCompletedDate = activeDateStr;
          if (!dates.includes(activeDateStr)) {
            task.habitDetails.completedDates = [...dates, activeDateStr];
          }

          if (task.habitDetails.nextTaskId) {
            const nextTask = state.items.find(
              (t) => String(t._id) === String(task.habitDetails?.nextTaskId)
            );
            state.activeHabitStackModal = {
              isOpen: true,
              completedHabitTitle: task.title,
              nextTaskId: String(task.habitDetails.nextTaskId),
              nextTaskTitle: nextTask?.title || 'Next Stacked Task',
            };
          }
        } else {
          task.completedAt = undefined;
          task.habitDetails.completedDates = dates.filter((d) => d !== activeDateStr);
          if (task.habitDetails.lastCompletedDate === activeDateStr) {
            const remaining = task.habitDetails.completedDates;
            task.habitDetails.lastCompletedDate = remaining.length > 0 ? remaining[remaining.length - 1] : undefined;
          }
        }

        const { currentStreak, bestStreak } = calculateHabitStreak(task as any, activeDateStr);
        task.habitDetails.streakCount = currentStreak;
        task.habitDetails.bestStreak = Math.max(task.habitDetails.bestStreak || 0, bestStreak);
      } else if (task.type === 'DEEP_WORK') {
        task.completed = completed;
        task.completedAt = completed ? new Date() : undefined;
        if (completed && task.deepWorkDetails) {
          const targetSecs = (task.deepWorkDetails.targetDurationMinutes || 45) * 60;
          if (!task.deepWorkDetails.actualDurationSeconds) {
            task.deepWorkDetails.actualDurationSeconds = targetSecs;
          }
          task.pointsAwarded = task.pointsAwarded || 50;
        }
      } else if (task.type === 'ADMIN') {
        task.completed = completed;
        task.completedAt = completed ? new Date() : undefined;
      }
    },

    setDailyFrog: (state, action: PayloadAction<string>) => {
      state.items.forEach((t) => {
        t.isFrog = String(t._id) === action.payload;
      });
      state.dailyFrogId = action.payload;
    },

    deleteTask: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((t) => String(t._id) !== action.payload);
      if (state.dailyFrogId === action.payload) {
        state.dailyFrogId = null;
      }
    },

    updateTask: (state, action: PayloadAction<UpdateTaskPayload>) => {
      const targetId =
        action.payload.id ||
        (action.payload._id ? String(action.payload._id) : undefined);
      if (!targetId) return;

      const task = state.items.find((t) => String(t._id) === targetId);
      if (!task) return;

      if (action.payload.title !== undefined) task.title = action.payload.title;
      if (action.payload.description !== undefined) task.description = action.payload.description;
      if (action.payload.url !== undefined) task.url = action.payload.url;
      if (action.payload.importance !== undefined) task.importance = action.payload.importance;
      if (action.payload.type !== undefined) task.type = action.payload.type;
      if (action.payload.completed !== undefined) task.completed = action.payload.completed;
      if (action.payload.completedAt !== undefined) task.completedAt = action.payload.completedAt;
      if (action.payload.pointsAwarded !== undefined) task.pointsAwarded = action.payload.pointsAwarded;
      if (action.payload.completionHistory !== undefined) {
        task.completionHistory = action.payload.completionHistory;
      }

      if (action.payload.isFrog !== undefined) {
        if (action.payload.isFrog) {
          state.items.forEach((t) => (t.isFrog = false));
          state.dailyFrogId = String(task._id);
        } else if (task.isFrog) {
          state.dailyFrogId = null;
        }
        task.isFrog = action.payload.isFrog;
      }

      if (action.payload.habitDetails) {
        task.habitDetails = {
          frequency: 'daily',
          customDays: [],
          streakCount: 0,
          bestStreak: 0,
          completedDates: [],
          ...task.habitDetails,
          ...action.payload.habitDetails,
        };
      }

      if (action.payload.deepWorkDetails) {
        task.deepWorkDetails = {
          targetDurationMinutes: 45,
          actualDurationSeconds: 0,
          isLiveTracked: false,
          overtimeBonusAwarded: false,
          overtimeSeconds: 0,
          sessions: [],
          ...task.deepWorkDetails,
          ...action.payload.deepWorkDetails,
        };
      }

      if (action.payload.adminDetails) {
        const resolvedDueDate = action.payload.adminDetails.dueDate
          ? new Date(action.payload.adminDetails.dueDate)
          : task.adminDetails?.dueDate || new Date();
        const { dueDate: _, ...otherAdminDetails } = action.payload.adminDetails;
        task.adminDetails = {
          dueDate: resolvedDueDate,
          isRecurring: false,
          recurringCycle: 'none',
          subtasks: [],
          ...task.adminDetails,
          ...otherAdminDetails,
        };
      }

      task.updatedAt = new Date();
    },

    toggleHabitDay: (
      state,
      action: PayloadAction<{ taskId: string; day: number; monthYear?: string }>
    ) => {
      const { taskId, day, monthYear = '2026-03' } = action.payload;
      const habit = state.items.find((t) => String(t._id) === taskId);
      if (!habit || habit.type !== 'HABIT' || !habit.habitDetails) return;

      const dateStr = `${monthYear}-${String(day).padStart(2, '0')}`;
      const dates = habit.habitDetails.completedDates || [];
      const exists = dates.includes(dateStr);

      const todayStr = getLocalDateString();
      if (exists) {
        habit.habitDetails.completedDates = dates.filter((d) => d !== dateStr);
        if (habit.habitDetails.lastCompletedDate === dateStr) {
          const remaining = habit.habitDetails.completedDates;
          habit.habitDetails.lastCompletedDate = remaining.length > 0 ? remaining[remaining.length - 1] : undefined;
        }
      } else {
        habit.habitDetails.completedDates = [...dates, dateStr];
        habit.habitDetails.lastCompletedDate = dateStr;
      }

      habit.completed = habit.habitDetails.completedDates.includes(todayStr);

      const { currentStreak, bestStreak } = calculateHabitStreak(habit as any, todayStr);
      habit.habitDetails.streakCount = currentStreak;
      habit.habitDetails.bestStreak = Math.max(habit.habitDetails.bestStreak || 0, bestStreak);
    },
  },
});

export const {
  setTasks,
  addTask,
  setSelectedCategory,
  setFilterStatus,
  addDeepWorkTask,
  addHabitTask,
  addAdminTask,
  toggleHabitCompletion,
  toggleHabitDay,
  closeHabitStackModal,
  completeDeepWorkTask,
  toggleAdminSubtask,
  toggleAdminTaskCompletion,
  setTaskCompletionStatus,
  setDailyFrog,
  deleteTask,
  updateTask,
} = tasksSlice.actions;

export default tasksSlice.reducer;
